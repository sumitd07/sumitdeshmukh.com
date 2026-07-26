// Work page: expand/collapse case-study panels.
// Content is never JS-gated — every panel ships visible in the static HTML
// (aria-expanded="true") so a no-JS visitor sees everything. We collapse
// them here once JS can actually drive the interaction.
(function () {
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.cs-toggle'));

  function panelFor(btn) {
    return document.getElementById(btn.getAttribute('aria-controls'));
  }

  function pauseVideos(panel) {
    var vids = panel.querySelectorAll('video');
    for (var i = 0; i < vids.length; i++) vids[i].pause();
  }

  function playVideos(panel) {
    // preload="none" + no autoplay attribute in markup keeps hidden panels'
    // videos from being fetched on page load; kick off loading/playback only
    // once a panel is actually revealed (autoplay attribute alone fetches
    // even while the panel is display:none, defeating the lazy-load).
    var vids = panel.querySelectorAll('video');
    for (var i = 0; i < vids.length; i++) {
      // Defer poster to first reveal: collapsed panels ship no poster attribute
      // so a fresh page load fetches zero image bytes for videos nobody has
      // opened yet. Set it here, the instant the panel actually becomes visible.
      if (!vids[i].getAttribute('poster') && vids[i].dataset.poster) {
        vids[i].setAttribute('poster', vids[i].dataset.poster);
      }
      var p = vids[i].play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function collapse(btn) {
    btn.setAttribute('aria-expanded', 'false');
    var panel = panelFor(btn);
    pauseVideos(panel);
    panel.hidden = true;
  }

  function collapseAllExcept(exceptBtn) {
    buttons.forEach(function (b) {
      if (b !== exceptBtn) collapse(b);
    });
  }

  function reveal(panel) {
    panel.hidden = false;
    // Toggling `hidden` alone restarts the animation in most engines, but we
    // force a reflow between removing/re-adding the animation class so a
    // repeat open of the same panel reliably replays cs-rise.
    panel.classList.remove('cs-anim');
    void panel.offsetWidth;
    panel.classList.add('cs-anim');
    playVideos(panel);
  }

  // Only one panel open at a time, across both sections.
  buttons.forEach(collapse);

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = panelFor(btn);
      if (btn.getAttribute('aria-expanded') === 'true') {
        collapse(btn);
        history.replaceState(null, '', location.pathname);
        return;
      }
      collapseAllExcept(btn);
      reveal(panel);
      btn.setAttribute('aria-expanded', 'true');
      history.replaceState(null, '', '#' + panel.id);
      var oneliner = panel.querySelector('.cs-oneliner');
      if (oneliner) oneliner.focus({ preventScroll: true });
    });
  });

  // Escape collapses the open panel from anywhere inside it — the way out of a
  // long case study without scrolling back to its header. Focus returns to the
  // toggle (which also scrolls it into view). Keyboard-initiated, so no animation.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = buttons.filter(function (b) {
      return b.getAttribute('aria-expanded') === 'true';
    })[0];
    if (!open) return;
    collapse(open);
    history.replaceState(null, '', location.pathname);
    open.focus();
  });

  var hash = location.hash;
  if (hash.indexOf('#cs-') === 0) {
    var targetBtn = document.querySelector('[aria-controls="' + hash.slice(1) + '"]');
    if (targetBtn) {
      var panel = panelFor(targetBtn);
      collapseAllExcept(targetBtn);
      reveal(panel);
      targetBtn.setAttribute('aria-expanded', 'true');
      // Land on the case-study heading (the toggle), not the middle of its
      // panel — otherwise the title sits scrolled off above the viewport.
      targetBtn.scrollIntoView({ block: 'start' });
    }
  }
})();
