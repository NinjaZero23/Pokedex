/* ============================================================
   POKÉDEX — session.js
   Solo corre en index.html
   Protege la ruta y muestra el usuario en el header
   ============================================================ */

(function() {
  var SESSION_KEY = 'pokedex_session';

  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }

  var session = getSession();

  /* Si no hay sesión → mandar al login ANTES de que cargue nada */
  if (!session) {
    window.location.replace('login.html');
    return;
  }

  /* Esperar a que el DOM esté listo para poner nombre y avatar */
  document.addEventListener('DOMContentLoaded', function() {
    var $name   = document.getElementById('user-name');
    var $avatar = document.getElementById('user-avatar');
    var $logout = document.getElementById('btn-logout');

    if ($name)   $name.textContent   = session.name;
    if ($avatar) $avatar.textContent = session.name.charAt(0).toUpperCase();

    if ($logout) {
      $logout.addEventListener('click', function() {
        localStorage.removeItem(SESSION_KEY);
        window.location.replace('login.html');
      });
    }
  });
})();
