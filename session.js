/* ============================================================
   POKÉDEX — session.js
   Corre en el <head> de index.html ANTES de renderizar el body.
   Si no hay sesión activa redirige inmediatamente a login.html
   sin que el usuario llegue a ver la página.
   ============================================================ */
(function () {
  var session = null;

  try {
    session = JSON.parse(localStorage.getItem('pokedex_session') || 'null');
  } catch (e) {
    session = null;
  }

  /* Sin sesión → redirigir antes de que el navegador pinte nada */
  if (!session) {
    document.documentElement.style.visibility = 'hidden'; // oculta por si acaso
    window.location.replace('login.html');
    return; // detiene el resto del script
  }

  /* Con sesión → mostrar nombre y avatar cuando el DOM esté listo */
  document.addEventListener('DOMContentLoaded', function () {
    var $name   = document.getElementById('user-name');
    var $avatar = document.getElementById('user-avatar');
    var $logout = document.getElementById('btn-logout');

    if ($name)   $name.textContent   = session.name;
    if ($avatar) $avatar.textContent = session.name.charAt(0).toUpperCase();

    if ($logout) {
      $logout.addEventListener('click', function () {
        localStorage.removeItem('pokedex_session');
        window.location.replace('login.html');
      });
    }

    /* Restaurar visibilidad por si se ocultó arriba */
    document.documentElement.style.visibility = '';
  });
})();
