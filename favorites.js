/* ============================================================
   POKÉDEX — favorites.js
   Gestiona los pokémon favoritos por usuario.

   - Guardados en localStorage con clave única por usuario
   - Corazón en cada tarjeta del grid
   - Botón en el panel de detalle
   - Filtro "solo favoritos" en el header
   ============================================================ */


/* ────────────────────────────────────────────
   CLAVE DE ALMACENAMIENTO
   ──────────────────────────────────────────── */
function getFavKey() {
  try {
    const session = JSON.parse(localStorage.getItem('pokedex_session') || 'null');
    return session ? 'pokedex_favs_' + session.email : 'pokedex_favs_guest';
  } catch {
    return 'pokedex_favs_guest';
  }
}


/* ────────────────────────────────────────────
   HELPERS DE DATOS
   ──────────────────────────────────────────── */

/** Devuelve el set de IDs favoritos */
function getFavs() {
  try {
    return new Set(JSON.parse(localStorage.getItem(getFavKey()) || '[]'));
  } catch {
    return new Set();
  }
}

/** Guarda el set de favoritos */
function saveFavs(set) {
  localStorage.setItem(getFavKey(), JSON.stringify([...set]));
}

/** ¿Está este pokémon en favoritos? */
function isFav(id) {
  return getFavs().has(id);
}

/** Agrega o quita un pokémon de favoritos. Devuelve true si quedó en favoritos. */
function toggleFav(id) {
  const favs = getFavs();
  if (favs.has(id)) {
    favs.delete(id);
  } else {
    favs.add(id);
  }
  saveFavs(favs);
  return favs.has(id);
}


/* ────────────────────────────────────────────
   ACTUALIZAR CORAZÓN EN TARJETA
   ──────────────────────────────────────────── */

function updateCardHeart(id) {
  const card = document.querySelector('.poke-card[data-id="' + id + '"]');
  if (!card) return;
  const btn = card.querySelector('.btn-fav');
  if (!btn) return;
  const fav = isFav(id);
  btn.classList.toggle('active', fav);
  btn.title = fav ? 'Quitar de favoritos' : 'Agregar a favoritos';
  btn.innerHTML = fav ? '♥' : '♡';
}

/** Actualiza todos los corazones del grid */
function refreshAllHearts() {
  document.querySelectorAll('.poke-card').forEach(card => {
    updateCardHeart(parseInt(card.dataset.id));
  });
}


/* ────────────────────────────────────────────
   ACTUALIZAR BOTÓN DE FAVORITOS EN EL PANEL
   ──────────────────────────────────────────── */

function updateFavButton(id) {
  const $btn = document.getElementById('btn-fav-detail');
  if (!$btn || parseInt($btn.dataset.id) !== id) return;
  const fav = isFav(id);
  $btn.classList.toggle('active', fav);
  $btn.innerHTML = fav
    ? '<span class="btn-fav-icon">♥</span> En favoritos'
    : '<span class="btn-fav-icon">♡</span> Agregar a favoritos';
}


/* ────────────────────────────────────────────
   MANEJADOR DEL BOTÓN EN EL PANEL DE DETALLE
   ──────────────────────────────────────────── */

function handleFavDetail(id, name) {
  const added = toggleFav(id);
  updateFavButton(id);
  updateCardHeart(id);

  // Si el filtro de favoritos está activo y quitamos uno, re-filtrar
  if (!added && window.activeFavFilter) {
    if (window.applyFilters) window.applyFilters();
  }

  showFavToast(
    added ? '♥ ' + name + ' agregado a favoritos' : '♡ ' + name + ' quitado de favoritos',
    added ? 'success' : ''
  );
}


/* ────────────────────────────────────────────
   FILTRO "SOLO FAVORITOS"
   ──────────────────────────────────────────── */

window.activeFavFilter = false;

function initFavFilter() {
  const $btn = document.getElementById('btn-fav-filter');
  if (!$btn) return;

  $btn.addEventListener('click', () => {
    window.activeFavFilter = !window.activeFavFilter;
    $btn.classList.toggle('active', window.activeFavFilter);
    $btn.title = window.activeFavFilter ? 'Ver todos' : 'Ver solo favoritos';
    if (window.applyFilters) window.applyFilters();
  });
}

/**
 * Filtra el array de pokémon para mostrar solo favoritos.
 * Se llama desde applyFilters() en app.js si el filtro está activo.
 */
function filterByFavs(pokemon) {
  if (!window.activeFavFilter) return pokemon;
  const favs = getFavs();
  return pokemon.filter(p => favs.has(p.id));
}


/* ────────────────────────────────────────────
   TOAST
   ──────────────────────────────────────────── */
let favToastTimer = null;

function showFavToast(msg, type) {
  let $toast = document.getElementById('fav-toast');
  if (!$toast) {
    $toast = document.createElement('div');
    $toast.id = 'fav-toast';
    document.body.appendChild($toast);
  }
  $toast.textContent = msg;
  $toast.className = 'team-toast show' + (type ? ' ' + type : '');
  clearTimeout(favToastTimer);
  favToastTimer = setTimeout(() => $toast.classList.remove('show'), 2200);
}


/* ────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initFavFilter();
});

// Exponer funciones para app.js
window.isFav            = isFav;
window.toggleFav        = toggleFav;
window.updateCardHeart  = updateCardHeart;
window.refreshAllHearts = refreshAllHearts;
window.updateFavButton  = updateFavButton;
window.handleFavDetail  = handleFavDetail;
window.filterByFavs     = filterByFavs;
