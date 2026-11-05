/* Mobile menu: the hidden checkbox keeps the menu working without JavaScript;
   this makes its label behave as a real button for keyboards and screen readers. */
(function () {
  var box = document.getElementById('navtoggle'), btn = document.querySelector('label.burger');
  if (!box || !btn) return;
  function sync() {
    btn.setAttribute('aria-expanded', box.checked ? 'true' : 'false');
    btn.setAttribute('aria-label', box.checked ? 'Close navigation' : 'Open navigation');
  }
  box.addEventListener('change', sync);
  btn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); box.checked = !box.checked; sync(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box.checked) { box.checked = false; sync(); btn.focus(); }
  });
  sync();
})();
