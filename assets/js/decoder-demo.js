// Decoder live demo — a faithful, self-contained port of the real AI Decoder
// (aidecoder.app) interaction, embedded in the Decoder case study.
//
// Markup, tokens, tier system and copy mirror the actual app: click an
// underlined term for the select-to-explain popover (tier badge, serif term,
// plain one-liner, analogy, example, Save / Full card), then open the full card
// with Plain / In practice / Technical lens tabs, It's like / Example / Related
// (related terms are clickable), a "Go deeper" section, and a Save bar.
//
// The glossary data below is the app's own (web/concepts.js). Save/remove is
// in-memory only for the demo — nothing is stored or synced. Progressive
// enhancement: the block ships `hidden` and is revealed once this runs.
(function () {
  var root = document.querySelector('[data-dm-demo]');
  if (!root) return;

  var CONCEPTS = [
    { id:'rag', term:'RAG', aliases:'Retrieval-Augmented Generation', said:'“rag”', status:'Core',
      oneLiner:'Hand the model a stack of your documents to read before it answers, so it stops making things up.',
      analogy:'An open-book exam — instead of reciting from memory, it looks up the right page first.',
      example:'A support bot that quotes your actual help docs instead of confidently guessing is doing RAG.',
      related:[{text:'Often confused with fine-tuning — that changes the model itself; RAG just hands it notes.',id:'finetuning'},{text:'Runs on embeddings under the hood.',id:'embeddings'},{text:'Exists mostly to dodge the context window limit.',id:'contextwindow'}],
      deeper:'Your docs get chopped into chunks, turned into embeddings, and stored in a vector database. At query time the system finds the closest chunks and stuffs them into the context window next to your question. Quality lives and dies on the retrieval step — bad chunks in, bad answer out.' },
    { id:'evals', term:'Evals', aliases:'Evaluations', said:'“ee-vals”', status:'Core',
      oneLiner:'Tests for AI — a repeatable way to check whether the model actually got better or just feels like it did.',
      analogy:'A unit-test suite, but for judgment instead of code.',
      example:'Before shipping a new prompt, a team runs it against 500 saved questions and counts how many it nails.',
      related:[{text:'The scoreboard a human in the loop quietly fills.',id:'hitl'},{text:'What you run to catch a hallucination before users do.',id:'hallucination'}],
      deeper:'They range from exact-match graders to “LLM-as-judge” setups where one model scores another. The hard part is never running them — it is writing eval sets that reflect what real users actually do, not what is easy to grade.' },
    { id:'contextwindow', term:'Context window', aliases:'', said:'', status:'Core',
      oneLiner:'How much the model can hold in view at once — your prompt, the docs, the whole chat — before the start falls off.',
      analogy:'Short-term memory, or a desk that only fits so many papers before the older ones slide off the edge.',
      example:'Paste a 400-page PDF into a small-context model and it will quietly lose the early chapters.',
      related:[{text:'Measured in tokens.',id:'tokens'},{text:'The ceiling RAG is designed to work around.',id:'rag'}],
      deeper:'Windows have grown from a few thousand tokens to millions, but “it fits” is not “it uses well.” Models often attend better to the beginning and end than the muddled middle — the classic “lost in the middle” effect.' },
    { id:'hitl', term:'HITL', aliases:'Human in the loop', said:'“human in the loop”', status:'Core',
      oneLiner:'A person checks or approves the AI’s work before it counts — the safety catch on high-stakes steps.',
      analogy:'A spellchecker that suggests, but you still have to hit accept.',
      example:'The AI drafts the refund; a human clicks approve before any money actually moves.',
      related:[{text:'The judgment that becomes your evals.',id:'evals'},{text:'The opposite pole from a fully autonomous agent.',id:'agents'}],
      deeper:'The real design question is where the human sits: on every action (slow, safe), on random samples (a spot check), or only on low-confidence cases where the model itself asks for help. Most teams end up with the third.' },
    { id:'agents', term:'Agents', aliases:'', said:'', status:'Rising',
      oneLiner:'AI that doesn’t just answer — it takes steps, uses tools, and works toward a goal without you holding its hand.',
      analogy:'Less like a search box, more like an intern you can hand a whole task to.',
      example:'When a coding assistant reads your files, runs the tests, and fixes what broke, that’s an agent at work.',
      related:[{text:'The grown-up version of a chatbot.'},{text:'Only as useful as its tools — which is what MCP standardizes.',id:'mcp'},{text:'Its scariest failure mode is prompt injection.',id:'promptinjection'}],
      deeper:'Under the hood it’s a loop: the model picks an action, something runs it, the result comes back, repeat until done. Most “agent” failures are really loop-control failures — it gets stuck, over-repeats, or wanders off the goal.' },
    { id:'embeddings', term:'Embeddings', aliases:'', said:'', status:'Core',
      oneLiner:'Turning words into coordinates, so a computer can measure how close in meaning two things are.',
      analogy:'A map where “dog” and “puppy” are next-door neighbors and “dog” and “tax form” are on opposite coasts.',
      example:'Search that finds “car” when you typed “automobile” is matching on embeddings, not on spelling.',
      related:[{text:'The engine underneath RAG.',id:'rag'},{text:'Not the same as tokens, though both are “text as numbers.”',id:'tokens'}],
      deeper:'Each piece of text becomes a long list of numbers — a vector. “Similar” means the vectors point in nearly the same direction (cosine similarity). The entire trick of semantic search lives in this one idea.' },
    { id:'finetuning', term:'Fine-tuning', aliases:'', said:'', status:'Fading',
      oneLiner:'Retraining a model a little on your own examples so it picks up a style or skill it didn’t ship with.',
      analogy:'Sending a strong generalist off to a short apprenticeship in your specific shop.',
      example:'Training on 10,000 of your past support replies so the model sounds like your team, not a robot.',
      related:[{text:'Often reached for when RAG would have done the job.',id:'rag'},{text:'A heavier hammer than good prompt engineering.',id:'promptengineering'}],
      deeper:'Techniques like LoRA make it cheap by nudging a small set of weights instead of all of them. It’s cooling as a first move: most teams now try prompting and RAG first, because a fine-tune is a maintenance burden that goes stale with the base model.' },
    { id:'vibecoding', term:'Vibe coding', aliases:'obituary', said:'“vibe coding”', status:'Historical',
      oneLiner:'What we briefly called just… talking to an AI until the app worked, without really reading the code.',
      analogy:'Cooking without measuring — totally fine for a snack, faintly terrifying for a wedding cake.',
      example:'In 2024, “I vibe-coded a weekend app” meant you prompted your way to something that ran and shipped it.',
      related:[{text:'Folded into “agentic coding.”',id:'agents'},{text:'The reflex it named lives on inside prompt engineering.',id:'promptengineering'}],
      deeper:'Filed as history: what people meant in 2024–25, and why it grew up. The term peaked in early 2025, then split — the throwaway-prototype meaning stuck around as a joke, while the actual practice matured into agentic coding with tests, reviews, and specs. The vibes, it turned out, needed guardrails.' },
    { id:'promptengineering', term:'Prompt engineering', aliases:'', said:'', status:'Fading',
      oneLiner:'The craft of phrasing your request just right to coax out a better answer.',
      analogy:'Knowing how to Google well — a real skill that quietly becomes second nature.',
      example:'“Think step by step, then answer” reliably beats just asking — a classic prompt-engineering move.',
      related:[{text:'Overlaps heavily with chain of thought.',id:'chainofthought'},{text:'Cooling as models get better at reading plain intent.'}],
      deeper:'Once a hot job title, it’s cooling not because it’s useless but because it’s diffusing into everyone’s baseline. The heavy lifting moved to context and tools; the exact wording matters far less than it did back in 2023.' },
    { id:'tokens', term:'Tokens', aliases:'', said:'', status:'Core',
      oneLiner:'The chunks a model reads and writes in — roughly ¾ of a word each. Everything is priced and measured in them.',
      analogy:'Syllables for a machine — not quite letters, not quite whole words.',
      example:'“unbelievable” might be three tokens: un-believ-able. Your bill counts every single one.',
      related:[{text:'The unit the context window is measured in.',id:'contextwindow'},{text:'Cousin of embeddings — both turn text into numbers.',id:'embeddings'}],
      deeper:'Tokenization is why models miscount the letters in a word or fumble rare strings — they never saw the letters, only the chunks. It also explains why some languages cost more: they tokenize less efficiently, so the same sentence spends more tokens.' },
    { id:'hallucination', term:'Hallucination', aliases:'', said:'', status:'Core',
      oneLiner:'When the model states something false with total confidence — the failure mode that never fully goes away.',
      analogy:'A friend who never says “I don’t know” and just fills the gap with a plausible-sounding story.',
      example:'Ask for a citation and get a real-looking paper, by real-looking authors, that simply does not exist.',
      related:[{text:'What RAG tries to ground away.',id:'rag'},{text:'What evals exist to catch.',id:'evals'}],
      deeper:'It’s not lying — the model predicts likely text, and “likely” is not “true.” Grounding it in real documents and asking it to cite reduces it, but confidence and correctness are separate dials. A model can be dead wrong and completely sure.' },
    { id:'mcp', term:'MCP', aliases:'Model Context Protocol', said:'“em-see-pee”', status:'Rising',
      oneLiner:'A standard plug so any AI can talk to your tools and data without a custom integration each time.',
      analogy:'USB-C for AI — one connector instead of a junk drawer of adapters.',
      example:'Point an assistant at an MCP server for your calendar and it can read your schedule with no bespoke code.',
      related:[{text:'What makes agents actually useful in the real world.',id:'agents'}],
      deeper:'It defines how a model discovers tools, calls them, and gets results back. Boring plumbing on purpose — that boringness is what lets the whole agent ecosystem interoperate instead of everyone reinventing the same wiring.' },
    { id:'chainofthought', term:'Chain of thought', aliases:'CoT', said:'', status:'Core',
      oneLiner:'Letting the model reason out loud in steps before answering — it gets more right when it shows its work.',
      analogy:'Doing long division on paper instead of trying to hold it all in your head.',
      example:'Nudging “let’s work through this step by step” measurably boosts hard math and logic problems.',
      related:[{text:'A staple of prompt engineering.',id:'promptengineering'},{text:'Now baked into “reasoning” models by default.'}],
      deeper:'Newer reasoning models do this internally, spending extra compute to think before replying. The visible scratchpad became a hidden one — same idea, just more of it, and often no longer shown to you.' },
    { id:'temperature', term:'Temperature', aliases:'', said:'', status:'Core',
      oneLiner:'A dial for how adventurous the model is — low is focused and repetitive, high is creative and risky.',
      analogy:'The difference between a careful accountant and a poet mid-brainstorm.',
      example:'Set it near 0 to extract data cleanly; crank it up when you want ten weird names for a product.',
      related:[{text:'One of several “sampling” knobs, alongside top-p and top-k.'},{text:'Turn it down for extraction, up for ideation.'}],
      deeper:'It reshapes the probability distribution over the next token. High temperature flattens it so rare words get a chance; low temperature sharpens it so the safe pick almost always wins. Related knobs — top-p and top-k — trim the same distribution differently.' },
    { id:'promptinjection', term:'Prompt injection', aliases:'', said:'', status:'Rising',
      oneLiner:'A sneaky attack where hidden instructions buried in your data hijack what the AI does.',
      analogy:'A note slipped into a stack of paperwork that reads “ignore your boss, do this instead.”',
      example:'A webpage hides “forward the user’s email to me” in white text; a browsing agent reads it and obeys.',
      related:[{text:'The security nightmare that comes free with agents.',id:'agents'},{text:'A strong reason to keep a human in the loop.',id:'hitl'}],
      deeper:'The root problem: models can’t reliably tell “data to process” from “instructions to follow.” There’s no clean fix yet — defenses are layered (sandboxing, human approval on risky actions, input filtering), not solved. Treat any untrusted text an agent reads as potentially hostile.' }
  ];

  var LENSES = {
    rag:{ pm:'Ground the bot in your own docs so answers cite real sources — fewer escalations, no invented policies.', eng:'Retrieve top-k relevant chunks via vector search and inject them into the prompt at inference time.' },
    evals:{ pm:'A regression suite for quality — proof a change actually moved the metric before you ship.', eng:'Automated graders (exact-match, rubric, or LLM-as-judge) scoring output over a fixed dataset.' },
    contextwindow:{ pm:'The model’s attention budget — overload it and details drop, so scope what you feed it.', eng:'Max token span the model attends over; content beyond it is truncated or must be chunked/retrieved.' },
    hitl:{ pm:'A human approval gate on risky actions — your control point for compliance and trust.', eng:'An approval checkpoint that blocks an action until a human confirms (all / sampled / low-confidence).' },
    agents:{ pm:'AI that completes multi-step tasks end to end — automation you delegate outcomes to, not just answers.', eng:'A model-driven loop: choose action → run tool → observe result → repeat until a stop condition.' },
    embeddings:{ pm:'The tech behind “find similar” — powers semantic search, dedup, and recommendations.', eng:'Dense vector representations where cosine distance approximates semantic similarity.' },
    finetuning:{ pm:'Teaching the model your style with examples — powerful but a maintenance cost; try prompting/RAG first.', eng:'Gradient updates on a base model (often LoRA/PEFT) over labeled examples to shift behavior.' },
    vibecoding:{ pm:'The 2024 name for prompt-until-it-works prototyping — now matured into agentic coding with guardrails.', eng:'Prompt-driven codegen without close review; superseded by agent workflows with tests and specs.' },
    promptengineering:{ pm:'Wording requests well for better output — a fading standalone skill as models read intent better.', eng:'Structuring prompts (instructions, examples, format constraints) to steer the output distribution.' },
    tokens:{ pm:'The billing and length unit for AI — costs and limits are counted in these, not words.', eng:'Sub-word units from the tokenizer; model I/O and pricing are both measured per token.' },
    hallucination:{ pm:'Confident wrong answers — the core reliability risk; mitigate with grounding, citations, and evals.', eng:'Plausible-but-false generations from likelihood-based decoding untethered from ground truth.' },
    mcp:{ pm:'A standard that lets any AI plug into your tools without custom builds — faster integrations, less lock-in.', eng:'An open protocol for tool/data discovery and invocation between a model host and external servers.' },
    chainofthought:{ pm:'Letting the model reason step by step — better accuracy on hard tasks, now built into reasoning models.', eng:'Intermediate reasoning tokens before the answer; boosts multi-step tasks, often internalized in reasoning models.' },
    temperature:{ pm:'A creativity dial — low for reliable extraction, high for brainstorming variety.', eng:'Softmax scaling on next-token logits; higher flattens the distribution, lower sharpens it.' },
    promptinjection:{ pm:'A security risk where malicious text hijacks your AI — a key reason to gate agent actions.', eng:'Adversarial instructions in untrusted input the model executes; mitigate via isolation + approval, not solved.' }
  };

  var STATUS = {
    Core:       { label:'Core',       sym:'●', cls:'st-core' },
    Rising:     { label:'Rising',     sym:'▲', cls:'st-rising' },
    Fading:     { label:'Fading',     sym:'▼', cls:'st-fading' },
    Historical: { label:'Historical', sym:'†', cls:'st-historical' }
  };
  var LENS_LABELS = { curious:'Plain', pm:'In practice', eng:'Technical' };

  var popRoot = root.querySelector('#dmPopRoot');
  var modalRoot = root.querySelector('#dmModalRoot');
  var toastRoot = root.querySelector('#dmToastRoot');
  var chipsRoot = root.querySelector('#dmChips');
  var countEl = root.querySelector('#dmCount');
  var emptyEl = root.querySelector('#dmEmpty');

  var saved = {};
  var state = { sel:null, openId:null, deeperOpen:false, lens:'curious' };
  var toastTimer = null;

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function find(id){ for (var i=0;i<CONCEPTS.length;i++) if (CONCEPTS[i].id===id) return CONCEPTS[i]; return null; }
  function meta(c){ return STATUS[c.status] || STATUS.Core; }
  function isSaved(id){ return saved[id] === true; }
  function lensLineFor(c,k){ return (k!=='curious' && LENSES[c.id] && LENSES[c.id][k]) ? LENSES[c.id][k] : c.oneLiner; }
  function reduced(){ return window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches; }

  // ---- Select-to-explain popover ----------------------------------------
  function renderPopover(){
    if (!state.sel){ popRoot.innerHTML=''; return; }
    var c = find(state.sel.id); var m = meta(c);
    var savedNow = isSaved(c.id);
    var saveRow = savedNow
      ? '<button data-removepop class="h-surf3" style="flex:1;background:none;border:none;cursor:pointer;padding:10px;font-size:12.5px;font-weight:600;color:var(--save-text)"><span class="dmx-savepop">✓</span> Saved · remove</button>'
      : '<button data-savepop class="h-surf3" style="flex:1;background:none;border:none;cursor:pointer;padding:10px;font-size:12.5px;font-weight:500;color:var(--accent)">＋ Save</button>';
    var anim = reduced() ? 'none' : 'dmx-rise .16s ease';
    popRoot.innerHTML =
      '<div class="dmx-pop-el" style="position:fixed;z-index:65;left:'+state.sel.x+'px;top:'+state.sel.y+'px;transform:translateX(-50%);width:300px;max-width:calc(100vw - 24px);background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 36px rgba(20,18,14,0.18);animation:'+anim+';overflow:hidden">'+
        '<div style="padding:13px 15px 12px">'+
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
            '<span class="badge '+m.cls+'" style="font-size:9px;letter-spacing:.05em;padding:2px 7px"><span>'+m.sym+'</span><span>'+m.label+'</span></span>'+
            '<span class="dsp" style="font-weight:600;font-size:16px;line-height:1.1;letter-spacing:-.01em">'+esc(c.term)+'</span>'+
            '<button data-closepop class="popclose" aria-label="Close" style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--faint-2);font-size:15px;line-height:1;padding:2px">×</button>'+
          '</div>'+
          '<p style="margin:0 0 8px;font-size:13.5px;line-height:1.5;color:var(--text-2)">'+esc(c.oneLiner)+'</p>'+
          '<p style="margin:0 0 6px;font-size:12.5px;line-height:1.5;color:var(--text-4);font-style:italic">'+esc(c.analogy)+'</p>'+
          '<p style="margin:0;font-size:12px;line-height:1.5;color:var(--muted-2)">'+esc(c.example)+'</p>'+
        '</div>'+
        '<div style="border-top:1px solid var(--hairline-2);display:flex">'+
          saveRow+
          '<button data-openfull class="h-surf3" style="flex:none;background:none;border:none;border-left:1px solid var(--hairline-2);cursor:pointer;padding:10px 14px;font-size:12.5px;color:var(--text-4)">Full card →</button>'+
        '</div>'+
      '</div>';
    positionPopover();
  }

  function positionPopover(){
    if (!state.sel || !state.sel.el) return;
    var pop = popRoot.firstElementChild; if (!pop) return;
    var r = state.sel.el.getBoundingClientRect();
    var half = (pop.offsetWidth || 300) / 2;
    var x = r.left + r.width/2;
    x = Math.max(12+half, Math.min(window.innerWidth-12-half, x));
    state.sel.x = Math.round(x);
    state.sel.y = Math.round(r.bottom + 8);
    pop.style.left = state.sel.x + 'px';
    pop.style.top = state.sel.y + 'px';
  }

  function openTerm(el, id){
    state.openId = null; renderModal(false);
    state.sel = { id:id, el:el, x:0, y:0 };
    syncTermMarks();
    renderPopover();
  }
  function closePopover(){ state.sel = null; renderPopover(); syncTermMarks(); }

  function syncTermMarks(){
    var terms = root.querySelectorAll('.jterm');
    for (var i=0;i<terms.length;i++){
      var open = state.sel && terms[i] === state.sel.el;
      terms[i].classList.toggle('is-open', !!open);
    }
  }

  // ---- Full card modal ---------------------------------------------------
  function lensBtnStyle(on){
    return 'background:'+(on?'var(--surface)':'transparent')+';border:none;border-radius:7px;padding:5px 11px;font-size:11.5px;font-weight:'+(on?600:500)+';color:'+(on?'var(--text-2)':'var(--muted-2)')+';cursor:pointer;box-shadow:'+(on?'0 1px 2px rgba(20,24,33,.06)':'none')+';transition:background .18s,color .18s,box-shadow .18s';
  }
  function renderModal(animate){
    if (!state.openId){ modalRoot.innerHTML=''; return; }
    var c = find(state.openId); var m = meta(c);
    var savedNow = isSaved(c.id);
    var lensLine = lensLineFor(c, state.lens);
    var lensCtl = '<div style="display:inline-flex;gap:2px;background:var(--surface-3);border:1px solid var(--hairline-2);border-radius:9px;padding:2px;margin:14px 0 10px">'+
      ['curious','pm','eng'].map(function(k){ return '<button data-lens="'+k+'" style="'+lensBtnStyle(state.lens===k)+'">'+LENS_LABELS[k]+'</button>'; }).join('')+'</div>';
    var aliasBit = c.aliases ? '<span style="font-size:14px;color:var(--faint)">'+esc(c.aliases)+'</span>' : '';
    var saidBit = c.said ? '<span style="font-family:var(--font-primary);font-size:11px;color:var(--faint)">said '+esc(c.said)+'</span>' : '';
    var related = (c.related||[]).map(function(r){
      if (r.id) return '<button class="rel" data-open="'+r.id+'" style="text-align:left;background:var(--surface-3);border:1px solid var(--hairline-2);border-radius:9px;padding:8px 11px;cursor:pointer;font-size:13.5px;line-height:1.45;color:var(--text-3);display:flex;gap:8px;align-items:baseline"><span style="flex:1">'+esc(r.text)+'</span><span style="color:var(--accent);flex:none">→</span></button>';
      return '<div style="padding:8px 11px;font-size:13.5px;line-height:1.45;color:var(--text-4)">'+esc(r.text)+'</div>';
    }).join('');
    var deeperBlock = '<div class="deeper-wrap" style="height:'+(state.deeperOpen?'auto':'0')+';overflow:hidden"><div style="opacity:'+(state.deeperOpen?'1':'0')+';transition:opacity .18s ease"><div style="padding:2px 28px 22px"><p style="margin:0;font-size:14px;line-height:1.62;color:var(--text-4)">'+esc(c.deeper)+'</p></div></div></div>';
    var cardAnim = (animate && !reduced()) ? 'dmx-pop .22s cubic-bezier(.23,1,.32,1)' : 'none';
    var bdAnim = reduced() ? 'none' : 'dmx-bd .16s ease';
    modalRoot.innerHTML =
      '<div class="dmx-backdrop" data-backdrop="modal" style="position:fixed;inset:0;z-index:70;background:rgba(28,25,20,0.40);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;justify-content:center;align-items:flex-start;padding:7vh 20px 24px;overflow-y:auto;animation:'+bdAnim+'">'+
        '<div class="dmx-modal-card" role="dialog" aria-modal="true" aria-label="'+esc(c.term)+' — definition" style="width:min(580px,100%);background:var(--surface);border-radius:16px;box-shadow:0 20px 56px rgba(20,18,14,0.24);animation:'+cardAnim+';overflow:hidden">'+
          '<div style="padding:26px 28px 24px">'+
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">'+
              '<span class="badge '+m.cls+'" style="font-size:10px;letter-spacing:.06em;padding:4px 9px"><span>'+m.sym+'</span><span>'+m.label+'</span></span>'+
              saidBit+
              '<button data-close-modal aria-label="Close" style="margin-left:auto;background:none;border:1px solid var(--border-2);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--muted-2);font-size:16px;line-height:1" class="h-close">×</button>'+
            '</div>'+
            '<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px">'+
              '<h2 class="dsp" style="font-weight:600;font-size:33px;line-height:1.02;letter-spacing:-.03em;margin:0">'+esc(c.term)+'</h2>'+
              aliasBit+
            '</div>'+
            lensCtl+
            '<p style="font-family:var(--font-primary);font-weight:500;font-size:19px;line-height:1.5;color:var(--text-2);margin:0 0 22px">'+esc(lensLine)+'</p>'+
            '<div class="dmx-mstack'+(animate?'':' still')+'" style="display:flex;flex-direction:column;gap:16px">'+
              '<div><div style="font-family:var(--font-primary);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:5px">It’s like</div><p style="margin:0;font-size:15px;line-height:1.55;color:var(--text-3);font-style:italic">'+esc(c.analogy)+'</p></div>'+
              '<div><div style="font-family:var(--font-primary);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:5px">Example</div><p style="margin:0;font-size:15px;line-height:1.55;color:var(--text-3)">'+esc(c.example)+'</p></div>'+
              '<div><div style="font-family:var(--font-primary);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:7px">Related</div><div style="display:flex;flex-direction:column;gap:6px">'+related+'</div></div>'+
            '</div>'+
          '</div>'+
          '<div style="border-top:1px solid var(--hairline-2)">'+
            '<button data-deeper style="width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:15px 28px;display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:500;color:var(--text-3)" class="h-surf2">'+
              '<span style="font-family:var(--font-primary);font-size:11px;color:var(--accent)">'+(state.deeperOpen?'−':'+')+'</span>'+
              '<span>'+(state.deeperOpen?'Hide details':'Go deeper')+'</span>'+
              '<span style="margin-left:auto;font-size:11px;color:var(--faint)">the technical version</span>'+
            '</button>'+
            deeperBlock+
          '</div>'+
          '<div style="border-top:1px solid var(--hairline-2);padding:16px 28px;display:flex;align-items:center;gap:12px;background:var(--surface-2)">'+
            '<button data-savemodal class="savebtn '+(savedNow?'is-saved':'')+'">'+(savedNow?'<span class="dmx-savepop">✓</span>':'')+'<span>'+(savedNow?'Remove':'Save')+'</span></button>'+
            '<span style="font-size:12.5px;color:var(--faint);line-height:1.4">'+(savedNow?'Its status updates as the field changes.':'Keeps the terms you looked up in one place.')+'</span>'+
          '</div>'+
        '</div>'+
      '</div>';
  }
  function openCard(id){ state.openId = id; state.deeperOpen = false; state.sel = null; renderPopover(); syncTermMarks(); renderModal(true); }
  function closeCard(){ state.openId = null; renderModal(false); }

  // ---- Toast -------------------------------------------------------------
  function showToast(msg){
    toastRoot.innerHTML = '<div style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:80;background:var(--toast-bg);color:var(--toast-text);font-size:13px;font-weight:500;padding:10px 18px;border-radius:24px;box-shadow:0 8px 28px rgba(20,18,14,0.3);animation:'+(reduced()?'none':'dmx-toastin .2s ease')+'">'+esc(msg)+'</div>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastRoot.innerHTML=''; }, 1900);
  }

  // ---- Save + saved tray -------------------------------------------------
  function toggleSave(id){
    if (saved[id]){ delete saved[id]; showToast('Removed'); }
    else { saved[id] = true; showToast('Saved'); }
    renderSaved();
  }
  function renderSaved(){
    var ids = CONCEPTS.map(function(c){return c.id;}).filter(isSaved);
    countEl.textContent = String(ids.length);
    emptyEl.hidden = ids.length > 0;
    chipsRoot.innerHTML = '';
    ids.forEach(function(id){
      var c = find(id); var m = meta(c);
      var row = document.createElement('div');
      row.className = 'dmx-srow';
      row.innerHTML =
        '<span class="badge '+m.cls+'" style="font-size:9px;letter-spacing:.05em;padding:2px 7px"><span>'+m.sym+'</span><span>'+m.label+'</span></span>'+
        '<button class="dmx-sname dsp" data-open="'+id+'">'+esc(c.term)+'</button>'+
        '<button class="dmx-srm" data-rmrow="'+id+'" aria-label="Remove '+esc(c.term)+'">Remove</button>';
      chipsRoot.appendChild(row);
    });
  }

  // ---- Events ------------------------------------------------------------
  root.addEventListener('click', function(e){
    var t = e.target;
    var term = t.closest && t.closest('.jterm');
    if (term && root.contains(term)){
      e.preventDefault();
      var id = term.getAttribute('data-term');
      if (state.sel && state.sel.el === term){ closePopover(); return; }
      openTerm(term, id);
      return;
    }
    if (t.closest('[data-closepop]')){ closePopover(); return; }
    if (t.closest('[data-savepop]') || t.closest('[data-removepop]')){ if (state.sel) toggleSave(state.sel.id); renderPopover(); syncTermMarks(); return; }
    if (t.closest('[data-openfull]')){ if (state.sel) openCard(state.sel.id); return; }

    var rel = t.closest('[data-open]');
    if (rel){ openCard(rel.getAttribute('data-open')); return; }
    var rm = t.closest('[data-rmrow]');
    if (rm){ toggleSave(rm.getAttribute('data-rmrow')); if (state.openId) renderModal(false); syncTermMarks(); return; }

    var lens = t.closest('[data-lens]');
    if (lens){ state.lens = lens.getAttribute('data-lens'); renderModal(false); return; }
    if (t.closest('[data-deeper]')){ state.deeperOpen = !state.deeperOpen; renderModal(false); return; }
    if (t.closest('[data-savemodal]')){ if (state.openId) toggleSave(state.openId); renderModal(false); return; }
    var bd = t.closest('[data-backdrop]');
    if (bd && t === bd){ closeCard(); return; }
    if (t.closest('[data-close-modal]')){ closeCard(); return; }
  });

  // Outside click (anywhere on the page) closes the popover. Uses composedPath
  // (captured at dispatch) rather than DOM containment, because in-popover
  // actions like Save re-render the popover and detach e.target mid-click —
  // which would otherwise make the containment check wrongly report "outside".
  document.addEventListener('click', function(e){
    if (!state.sel) return;
    var path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
    if (path.indexOf(popRoot) !== -1) return;
    for (var i=0;i<path.length;i++){
      var n = path[i];
      if (n && n.classList && n.classList.contains('jterm')) return;
    }
    closePopover();
  });

  // Escape closes modal, then popover — before work.js collapses the panel.
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    if (state.openId){ e.stopPropagation(); closeCard(); return; }
    if (state.sel){ e.stopPropagation(); closePopover(); }
  }, true);

  function reflow(){ if (state.sel) positionPopover(); }
  window.addEventListener('resize', reflow);
  window.addEventListener('scroll', reflow, true);

  renderSaved();
  root.hidden = false;
})();
