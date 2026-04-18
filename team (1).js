/* ============================================================
   POKÉDEX — team.js
   Gestiona el equipo de 6 pokémon por usuario.

   - El equipo se guarda en localStorage con clave única por usuario
   - Máximo 6 pokémon
   - La barra de equipo es fija en la parte inferior
   - Se puede agregar desde el panel de detalle
   - Se puede quitar haciendo clic en el slot
   ============================================================ */

/* ────────────────────────────────────────────
   CLAVE DE ALMACENAMIENTO
   Única por usuario para que cada cuenta tenga su equipo
   ──────────────────────────────────────────── */
function getTeamKey() {
  try {
    const session = JSON.parse(localStorage.getItem('pokedex_session') || 'null');
    return session ? 'pokedex_team_' + session.email : 'pokedex_team_guest';
  } catch {
    return 'pokedex_team_guest';
  }
}

const MAX_TEAM = 6;

/* ────────────────────────────────────────────
   HELPERS DE DATOS
   ──────────────────────────────────────────── */

/** Devuelve el equipo actual como array de { id, name, sprite, types } */
function getTeam() {
  try {
    return JSON.parse(localStorage.getItem(getTeamKey()) || '[]');
  } catch {
    return [];
  }
}

/** Guarda el equipo */
function saveTeam(team) {
  localStorage.setItem(getTeamKey(), JSON.stringify(team));
}

/** ¿Está este pokémon en el equipo? */
function isInTeam(id) {
  return getTeam().some(p => p.id === id);
}

/** Agrega un pokémon al equipo. Devuelve true si se agregó, false si no. */
function addToTeam(pokemon) {
  const team = getTeam();
  if (team.length >= MAX_TEAM) return 'full';
  if (team.some(p => p.id === pokemon.id)) return 'duplicate';
  team.push(pokemon);
  saveTeam(team);
  return 'added';
}

/** Quita un pokémon del equipo por su ID */
function removeFromTeam(id) {
  const team = getTeam().filter(p => p.id !== id);
  saveTeam(team);
}


/* ────────────────────────────────────────────
   RENDER DE LA BARRA DE EQUIPO
   ──────────────────────────────────────────── */

function renderTeamBar() {
  const team    = getTeam();
  const $bar    = document.getElementById('team-bar');
  const $slots  = document.getElementById('team-slots');
  const $count  = document.getElementById('team-count');

  if (!$bar || !$slots) return;

  // Actualizar contador
  if ($count) $count.textContent = team.length + ' / ' + MAX_TEAM;

  // Construir los 6 slots
  $slots.innerHTML = Array.from({ length: MAX_TEAM }, (_, i) => {
    const p = team[i];
    if (p) {
      const mainColor = window.TYPE_COLORS?.[p.types?.[0]] || '#888';
      return `
        <div class="team-slot filled" data-id="${p.id}" title="${p.name}">
          <div class="team-slot-bg" style="background:${mainColor}"></div>
          <img class="team-slot-img" src="${p.sprite}" alt="${p.name}" />
          <button class="team-slot-remove" data-id="${p.id}" title="Quitar del equipo">✕</button>
        </div>
      `;
    }
    return `<div class="team-slot empty" title="Slot vacío"><span class="team-slot-plus">+</span></div>`;
  }).join('');

  // Mostrar u ocultar la barra según si hay pokémon
  const hasPokemon = team.length > 0;
  $bar.classList.toggle('has-pokemon', hasPokemon);
  document.body.classList.toggle('team-bar-open', hasPokemon);

  // Spacer en el panel de detalle para que el contenido no quede tapado
  const $dContent = document.getElementById('detail-content');
  const $dEmpty   = document.getElementById('detail-empty');
  [$dContent, $dEmpty].forEach(el => {
    if (!el) return;
    let spacer = el.querySelector('#team-bar-spacer');
    if (hasPokemon && !spacer) {
      spacer = document.createElement('div');
      spacer.id = 'team-bar-spacer';
      el.appendChild(spacer);
    } else if (!hasPokemon && spacer) {
      spacer.remove();
    }
  });

  // Eventos: quitar pokémon
  $slots.querySelectorAll('.team-slot-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation(); // no propagar al slot
      const id = parseInt(btn.dataset.id);
      removeFromTeam(id);
      renderTeamBar();
      updateTeamButton(id);      // actualizar el botón en el panel si está abierto
      updateCardTeamBadge(id);   // quitar el badge de la tarjeta
    });
  });

  // Eventos: clic en slot lleno → seleccionar ese pokémon en el panel
  $slots.querySelectorAll('.team-slot.filled').forEach(slot => {
    slot.addEventListener('click', e => {
      if (e.target.classList.contains('team-slot-remove')) return;
      const id = parseInt(slot.dataset.id);
      if (window.showDetail) window.showDetail(id);
    });
  });
}


/* ────────────────────────────────────────────
   BOTÓN DE EQUIPO EN EL PANEL DE DETALLE
   ──────────────────────────────────────────── */

/**
 * Actualiza el estado visual del botón "Agregar al equipo"
 * en el panel de detalle sin re-renderizar todo el panel.
 */
function updateTeamButton(pokemonId) {
  const $btn = document.getElementById('btn-team');
  if (!$btn || parseInt($btn.dataset.id) !== pokemonId) return;

  const inTeam = isInTeam(pokemonId);
  const team   = getTeam();
  const full   = team.length >= MAX_TEAM && !inTeam;

  $btn.dataset.inTeam = inTeam ? '1' : '0';
  $btn.classList.toggle('in-team', inTeam);
  $btn.disabled = full;

  if (inTeam) {
    $btn.innerHTML = `<span class="btn-team-icon">✓</span> En tu equipo`;
  } else if (full) {
    $btn.innerHTML = `<span class="btn-team-icon">⊘</span> Equipo lleno`;
  } else {
    $btn.innerHTML = `<span class="btn-team-icon">+</span> Agregar al equipo`;
  }
}

/**
 * Agrega o quita un pokémon del equipo al hacer clic en el botón.
 * Se llama desde el evento del botón en el panel de detalle.
 */
function handleTeamButton(pokemon) {
  const $btn   = document.getElementById('btn-team');
  const inTeam = isInTeam(pokemon.id);

  if (inTeam) {
    removeFromTeam(pokemon.id);
    showTeamToast(pokemon.name + ' eliminado del equipo.');
  } else {
    const result = addToTeam(pokemon);
    if (result === 'full') {
      showTeamToast('¡Equipo lleno! Máximo ' + MAX_TEAM + ' Pokémon.', 'error');
      return;
    }
    showTeamToast(pokemon.name + ' agregado al equipo ✓', 'success');
  }

  renderTeamBar();
  updateTeamButton(pokemon.id);
  updateCardTeamBadge(pokemon.id);
}


/* ────────────────────────────────────────────
   BADGE EN LAS TARJETAS DEL GRID
   Marca visualmente qué pokémon están en el equipo
   ──────────────────────────────────────────── */

function updateCardTeamBadge(id) {
  const card = document.querySelector('.poke-card[data-id="' + id + '"]');
  if (!card) return;
  card.classList.toggle('in-team', isInTeam(id));
}

/** Actualiza todos los badges del grid de una vez */
function refreshAllTeamBadges() {
  document.querySelectorAll('.poke-card').forEach(card => {
    const id = parseInt(card.dataset.id);
    card.classList.toggle('in-team', isInTeam(id));
  });
}


/* ────────────────────────────────────────────
   TOAST DE NOTIFICACIÓN
   ──────────────────────────────────────────── */
let toastTimer = null;

function showTeamToast(msg, type) {
  let $toast = document.getElementById('team-toast');
  if (!$toast) {
    $toast = document.createElement('div');
    $toast.id = 'team-toast';
    document.body.appendChild($toast);
  }

  $toast.textContent = msg;
  $toast.className = 'team-toast show' + (type ? ' ' + type : '');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $toast.classList.remove('show');
  }, 2500);
}


/* ────────────────────────────────────────────
   BOTÓN LIMPIAR EQUIPO
   ──────────────────────────────────────────── */
function initClearTeam() {
  const $btn = document.getElementById('btn-clear-team');
  if (!$btn) return;
  $btn.addEventListener('click', () => {
    if (getTeam().length === 0) return;
    if (confirm('¿Seguro que quieres vaciar tu equipo?')) {
      saveTeam([]);
      renderTeamBar();
      refreshAllTeamBadges();
      // Actualizar botón del panel si está abierto
      const $panelBtn = document.getElementById('btn-team');
      if ($panelBtn) updateTeamButton(parseInt($panelBtn.dataset.id));
    }
  });
}


/* ────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderTeamBar();
  initClearTeam();
});
