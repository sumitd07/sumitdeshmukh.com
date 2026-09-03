// Decoder "How it works" demo — the sentence-decode surface from aidecoder.app,
// embedded and running in the Work page.
//
// What is real vs. baked:
//   • The extraction — turning a rough highlight into one clean sentence
//     (repairing a soft hyphen, dropping a footnote marker, completing a partial
//     selection, declining inside a code block) — is the extension's own code,
//     running live in the browser (assets/js/extract.js, window.DecoderExtract).
//   • The model's explanations are captured from the live endpoint and baked in,
//     so the demo needs no backend and never fails. Each answer below is the
//     verbatim response aidecoder.app/api/explain returned for that sentence.
//
// Ported from web/index.html's How-it-works demo — same placement, motion, and
// extraction contract; the only change is fetch → a local lookup.
(function () {
  var root = document.querySelector('[data-dm-demo]');
  if (!root) return;
  var docEl = root.querySelector('#demoDoc');
  var stageEl = root.querySelector('#demoStage');
  if (!docEl || !stageEl || !window.DecoderExtract) return;

  // Captured answers. t = [card_id, surface] pairs (each opens its card on
  // aidecoder.app); g = gaps the shelf does not cover, named rather than guessed.
  var BAKED = [
    { s: "We reduced hallucination by tightening the retriever's top-k and reranking before the context is assembled.",
      r: "A fix for the model making things up. They asked the search step for fewer documents, and reordered what came back so the best ones sat at the top. Fewer, better documents go to the model, and it has less junk to get confused by.",
      t: [["hallucination","hallucination"],["retrieval","retriever's"],["topk","top-k"],["reranking","reranking"]], g: ["context"] },
    { s: "The embedding index was rebuilt offline every night, which meant a stale card could sit in production for a day.",
      r: "A description of a daily update delay. The system that speeds up meaning-based searches was remade from scratch after hours. Outdated information stayed live in the working system until the next rebuild.",
      t: [["embeddings","embedding"],["index","index"]], g: [] },
    { s: "Fine-tuning was never on the table; the failure mode was retrieval, not generation.",
      r: "Retraining the model was never considered. The system broke because it failed to fetch the right supporting text, not because the model itself answered poorly.",
      t: [["finetuning","Fine-tuning"],["retrieval","retrieval"]], g: ["generation"] },
    { s: "An agent that plans its own retrieval loop is a different product.",
      r: "A new category of software. This AI sets its own goals and takes steps toward them. It searches for supporting text before answering. Instead of following a fixed path, it decides how and when to go find those facts on its own.",
      t: [["agents","agent"],["retrieval","retrieval"]], g: [] },
    { s: "Quantization let the model run on one card, and the quality loss was smaller than the latency win.",
      r: "Converting the model to lower precision allowed it to fit on a single hardware card. The drop in output quality was smaller than the speed gain.",
      t: [["quantization","Quantization"],["latency","latency"]], g: [] },
    { s: "Most teams reach for a bigger model when the answers go wrong.",
      r: "A common habit among developers. When an AI gives bad answers, they switch to a larger system. They rely on sheer size to fix mistakes.",
      t: [], g: [] },
    { s: "In our case the answers were wrong because the context was wrong, and no amount of model changed that.",
      r: "A failure caused by bad source material fed to the system, which swapping out the model could not fix.",
      t: [], g: ["context"] },
    { s: "That single change did more than a month of prompt work.",
      r: "A quick update to the input text beat four weeks of trying to write better instructions. The new text worked better instantly.",
      t: [["prompt","prompt"]], g: [] },
    { s: "Chunking is where the rest of the tuning time went.",
      r: "An explanation of where all the project hours were spent. The team spent them on slicing long documents into bite-size passages.",
      t: [["chunking","Chunking"]], g: ["tuning time"] },
    { s: "A chunk that spans two ideas retrieves for both and answers neither, e.g. a paragraph that opens on latency and closes on cost.",
      r: "A warning about pieces that are too big. When a single piece covers two different topics, searches get confused by the mix and give bad answers. The piece needs to hold just one idea.",
      t: [["chunking","chunk"],["latency","latency"]], g: [] },
    { s: "The guard below runs before the model call, so a refusal costs nothing.",
      r: "A security instruction runs before the model even starts working. When it blocks a request, no computing power gets wasted. The check happens cheaply and early.",
      t: [["guardprompt","guard"],["refusal","refusal"]], g: [] },
    { s: "We kept the pipeline fixed so that two runs stay comparable.",
      r: "A claim that the assembly line of steps was held rigid. Keeping the steps locked down guarantees that two separate runs produce results that can be fairly compared against each other.",
      t: [["deterministic-workflow","pipeline fixed"],["determinism","comparable"]], g: [] },
    { s: "We shipped it the same week.",
      r: "A claim about speed. They launched the work quickly. The supplied cards do not cover this sentence.",
      t: [], g: ["shipped it the same week"] }
  ];

  // Match on meaning-free keys so a partial or multi-sentence selection still
  // lands: the first baked sentence contained in (or containing) the prepared
  // text wins, in article order.
  function key(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  var KEYED = BAKED.map(function (e) { return { k: key(e.s), e: e }; });
  function lookup(text){
    var pk = key(text);
    if (!pk) return null;
    for (var i = 0; i < KEYED.length; i++){
      if (pk.indexOf(KEYED[i].k) !== -1 || KEYED[i].k.indexOf(pk) !== -1) return KEYED[i].e;
    }
    return null;
  }

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function reduced(){ return window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches; }

  var TERM_BASE = 'https://aidecoder.app/term/';

  var pill = null, panel = null, range = null, rect = null, settle = null, seq = 0, waitT = null;

  // ---- placement (viewport rects → stage coordinates) ----------------------
  function place(el, r, gap){
    var box = stageEl.getBoundingClientRect();
    var w = el.offsetWidth || 320, h = el.offsetHeight || 120;
    var lo = w / 2 + 8, hi = box.width - w / 2 - 8;
    var left = r.left + r.width / 2 - box.left;
    left = hi < lo ? box.width / 2 : Math.min(Math.max(left, lo), hi);
    var above = r.top - box.top - h - gap;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var fitsBelow = !vh || r.bottom + gap + h <= vh - 8;
    var useAbove = !fitsBelow && above >= 0;
    el.style.left = left + 'px';
    el.style.top = (useAbove ? above : r.bottom - box.top + gap) + 'px';
    el.setAttribute('data-side', useAbove ? 'above' : 'below');
  }
  function endRect(rg){ var rs = rg.getClientRects(); return (rs && rs.length) ? rs[rs.length - 1] : rg.getBoundingClientRect(); }
  function rectNow(){ if (range){ try { var r = range.getClientRects(); if (r && r.length) return r[r.length - 1]; } catch (e) {} } return rect; }

  // ---- selection → prepared sentence ---------------------------------------
  function selection(){
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var rg = sel.getRangeAt(0);
    if (!docEl.contains(rg.commonAncestorContainer)) return null;
    var host = rg.commonAncestorContainer.nodeType === 3 ? rg.commonAncestorContainer.parentElement : rg.commonAncestorContainer;
    if (host && host.closest && host.closest('pre, code')) return null;   // code is not prose
    var text = sel.toString();
    if (!text.trim()) return null;
    var before = '', after = '';
    try {
      var pre = document.createRange(); pre.selectNodeContents(docEl);
      pre.setEnd(rg.startContainer, rg.startOffset); before = pre.toString();
      var post = document.createRange(); post.selectNodeContents(docEl);
      post.setStart(rg.endContainer, rg.endOffset); after = post.toString();
    } catch (e) {}
    var prepared = window.DecoderExtract.prepare({ selected: text, before: before, after: after });
    if (!prepared.ok) return null;
    return { prepared: prepared, range: rg.cloneRange(), rect: endRect(rg) };
  }

  function hidePill(){ if (pill){ pill.remove(); pill = null; } }
  function showPill(found){
    hidePill();
    pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'demo-pill';
    pill.textContent = 'Decode';
    pill.setAttribute('aria-label', 'Decode this sentence');
    stageEl.appendChild(pill);
    place(pill, found.rect, 8);
    pill.addEventListener('mousedown', function (e){ e.preventDefault(); });   // keep the selection
    pill.addEventListener('click', function (e){ e.preventDefault(); e.stopPropagation(); run(found); });
  }

  function paint(html){
    if (!panel){
      panel = document.createElement('div');
      panel.className = 'demo-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Decoded sentence');
      panel.setAttribute('aria-live', 'polite');
      stageEl.appendChild(panel);
      panel.addEventListener('click', function (ev){ if (ev.target.closest('[data-demo-x]')) closePanel(); });
    }
    panel.innerHTML = '<div class="demo-head"><span class="demo-eyebrow">Decode</span><button data-demo-x class="demo-x" aria-label="Close">×</button></div>' + html;
    place(panel, rectNow() || rect, 10);
  }
  function closePanel(){ clearTimeout(waitT); if (panel){ panel.remove(); panel = null; } range = null; rect = null; }

  function run(found){
    hidePill();
    var hint = document.getElementById('demoHint'); if (hint) hint.style.opacity = '0';
    range = found.range; rect = found.rect;

    var my = ++seq;
    paint('<div class="demo-wait"><span class="demo-spin" aria-hidden="true"></span><span>Decoding…</span></div>');
    var entry = lookup(found.prepared.text);
    var delay = reduced() ? 120 : 460 + Math.random() * 260;
    clearTimeout(waitT);
    waitT = setTimeout(function (){
      if (my !== seq) return;
      if (!entry){
        paint('<div class="demo-body"><p class="demo-restate">Highlight one of the sentences in the article above, then press Decode.</p></div>');
        return;
      }
      var chips = entry.t.length
        ? '<div class="demo-chips">' + entry.t.map(function (pair){
            return '<a class="demo-chip" href="' + TERM_BASE + encodeURIComponent(pair[0]) + '" target="_blank" rel="noopener">' + esc(pair[1]) + '<span aria-hidden="true">→</span></a>';
          }).join('') + '</div>'
        : '';
      var gaps = entry.g.length ? '<p class="demo-gaps">Not on the shelf yet: ' + entry.g.map(esc).join(', ') + '.</p>' : '';
      var p = found.prepared;
      var MAXS = window.DecoderExtract.MAX_SENTENCES || 3;
      var note = p.trimmed ? (p.found > MAXS ? 'Decoded the first ' + MAXS + ' sentences of that selection.' : 'Decoded the first part of that selection.') : '';
      var noteLine = note ? '<p class="demo-note">' + esc(note) + '</p>' : '';
      paint('<div class="demo-body"><p class="demo-restate">' + esc(entry.r) + '</p>' + chips + gaps + noteLine + '</div>');
    }, delay);
  }

  // ---- wiring --------------------------------------------------------------
  var schedule = function (){ clearTimeout(settle); settle = setTimeout(function (){
    var found = selection();
    if (!found){ hidePill(); return; }
    showPill(found);
  }, 10); };
  docEl.addEventListener('mouseup', schedule);
  docEl.addEventListener('keyup', function (e){ if (e.shiftKey || /^(Arrow|Home|End|Page)/.test(e.key)) schedule(); });

  document.addEventListener('selectionchange', function (){
    var sel = window.getSelection();
    if (pill && (!sel || sel.isCollapsed)) hidePill();
  });
  document.addEventListener('mousedown', function (e){
    if (!pill && !panel) return;
    if (e.target.closest && e.target.closest('.demo-pill, .demo-panel')) return;
    hidePill();
    if (panel && !(e.target.closest && e.target.closest('#demoDoc'))) closePanel();
  }, true);
  document.addEventListener('keydown', function (e){
    if (e.key === 'Escape' && (pill || panel)){ e.stopPropagation(); hidePill(); closePanel(); }
  }, true);
  window.addEventListener('resize', function (){
    hidePill();
    var r = rectNow();
    if (panel && r) place(panel, r, 10);
  });

  root.hidden = false;
})();
