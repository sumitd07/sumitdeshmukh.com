// Theme toggle: starts `hidden` in the HTML so a no-JS visitor never sees a dead control;
// reveal it here once we can actually wire it up.
var themeToggle = document.querySelector('.theme-toggle');

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function reflectPressed() {
  themeToggle.setAttribute('aria-pressed', String(currentTheme() === 'dark'));
}

if (themeToggle) {
  themeToggle.hidden = false;
  reflectPressed();
  themeToggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    reflectPressed();
  });
}

// Mumbai local time, updated on load and every 20s (matches the prototype's tick()).
var clockEl = document.getElementById('local-time');

function tick() {
  if (!clockEl) return;
  var t = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })
    .replace(/\s/g, '').toLowerCase();
  clockEl.textContent = t;
}

tick();
setInterval(tick, 20000);
