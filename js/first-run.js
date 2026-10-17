// A first visit in a browser tab starts from nothing, like a new install, so the app
// opens on setup. A reload in the same tab keeps what was set up. Installed apps
// (standalone) and the app inside showcase.html (embed=1) never reset.
// Classic script in <head>: it runs before anything reads the saved state.
(function () {
  try {
    var q = new URLSearchParams(location.search);
    var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone || q.has('embed') || sessionStorage.getItem('offhours:visited')) return;
    sessionStorage.setItem('offhours:visited', '1');
    Object.keys(localStorage)
      .filter(function (k) { return k.indexOf('offhours:') === 0; })
      .forEach(function (k) { localStorage.removeItem(k); });
  } catch (e) { /* storage blocked: keep whatever is there */ }
})();
