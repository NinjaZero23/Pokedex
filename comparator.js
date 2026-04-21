/* ============================================================
   POKÉDEX — comparator.js
   Compara dos pokémon lado a lado.

   Flujo:
   - El usuario hace clic en "Comparar" en el panel de detalle
   - Se abre un modal con el pokémon actual ya cargado en el slot A
   - El usuario busca y selecciona el segundo pokémon para el slot B
   - Se muestran stats, tipos, altura, peso lado a lado
   - Las barras indican quién gana cada stat (verde = ganador)
   ============================================================ */


/* ────────────────────────────────────────────
   ESTADO
   ──────────────────────────────────────────── */
let comparatorOpen = false;
let slotA = null;   // { id, name, sprite, types, stats, height, weight }
let slotB = null;
let searchResults = [];
let activeSlot = 'B'; // qué slot estamos llenando con la búsqueda


/* ────────────────────────────────────────────
   CONSTANTES
   ──────────────────────────────────────────── */
const STAT_LABELS = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  speed: 'VEL',
};

const STAT_COLORS_COMP = {
  hp: '#f87171',
  attack: '#fb923c',
  defense: '#facc15',
  'special-attack': '#60a5fa',
  'special-defense': '#4ade80',
  speed: '#c084fc',
};


/* ────────────────────────────────────────────
   FETCH
   ──────────────────────────────────────────── */
const compCache = {};

async function fetchForComp(idOrName) {
  if (compCache[idOrName]) return compCache[idOrName];
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
  if (!r.ok) throw new Error('No encontrado');
  const d = await r.json();
  const result = {
    id:     d.id,
    name:   d.name,
    sprite: d.sprites.front_default,
    types:  d.types.map(t => t.type.name),
    stats:  d.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
    height: d.height,
    weight: d.weight,
  };
  compCache[idOrName] = result;
  compCache[d.id]     = result;
  return result;
}


/* ────────────────────────────────────────────
   ABRIR / CERRAR MODAL
   ──────────────────────────────────────────── */

function openComparator(pokemonA) {
  slotA = pokemonA;
  slotB = null;
  activeSlot = 'B';
  comparatorOpen = true;

  const $modal = document.getElementById('comp-modal');
  $modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  renderComparator();

  // Enfocar búsqueda automáticamente
  setTimeout(() => {
    const $s = document.getElementById('comp-search');
    if ($s) $s.focus();
  }, 100);
}

function closeComparator() {
  comparatorOpen = false;
  slotA = null;
  slotB = null;
  searchResults = [];
  const $modal = document.getElementById('comp-modal');
  $modal.classList.remove('open');
  document.body.style.overflow = '';
}


/* ────────────────────────────────────────────
   RENDER PRINCIPAL
   ──────────────────────────────────────────── */

function renderComparator() {
  const $body = document.getElementById('comp-body');
  if (!$body) return;

  $body.innerHTML = `

    <!-- Buscador para el slot B -->
    <div class="comp-search-wrap">
      <div class="comp-search-label">Busca el Pokémon a comparar</div>
      <div class="comp-search-input-wrap">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          id="comp-search"
          placeholder="Nombre o número..."
          autocomplete="off"
        />
      </div>
      <div id="comp-results" class="comp-results"></div>
    </div>

    <!-- Comparación lado a lado -->
    <div class="comp-vs">

      <!-- SLOT A -->
      <div class="comp-slot" id="comp-slot-a">
        ${renderSlot(slotA, 'A')}
      </div>

      <!-- VS -->
      <div class="comp-divider">
        <span class="comp-vs-label">VS</span>
      </div>

      <!-- SLOT B -->
      <div class="comp-slot" id="comp-slot-b">
        ${slotB ? renderSlot(slotB, 'B') : renderEmptySlot()}
      </div>

    </div>

    <!-- Stats comparados (solo si hay dos pokémon) -->
    ${slotA && slotB ? renderStatsComparison() : ''}

  `;

  // Eventos de búsqueda
  const $input = document.getElementById('comp-search');
  if ($input) {
    let debounce;
    $input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => searchForSlot($input.value.trim()), 300);
    });
  }
}


/* ────────────────────────────────────────────
   RENDER DE CADA SLOT
   ──────────────────────────────────────────── */

function renderSlot(p, slot) {
  const colors = window.TYPE_COLORS || {};
  const mainColor = colors[p.types[0]] || '#888';

  return `
    <div class="comp-slot-hero" style="--main-color:${mainColor}">
      <div class="comp-slot-bg" style="background:radial-gradient(ellipse at 50% 0%, ${mainColor}, transparent 70%)"></div>
      <div class="comp-slot-num">#${String(p.id).padStart(3, '0')}</div>
      <img class="comp-slot-img" src="${p.sprite}" alt="${p.name}" />
      <div class="comp-slot-name">${p.name}</div>
      <div class="comp-slot-types">
        ${p.types.map(t =>
          `<span class="type-badge" style="background:${colors[t] || '#888'}">${t}</span>`
        ).join('')}
      </div>
      <div class="comp-slot-info">
        <span>${(p.height / 10).toFixed(1)} m</span>
        <span>${(p.weight / 10).toFixed(1)} kg</span>
      </div>
    </div>
  `;
}

function renderEmptySlot() {
  return `
    <div class="comp-slot-empty">
      <div class="comp-slot-empty-icon">?</div>
      <p>Busca un Pokémon<br>para comparar</p>
    </div>
  `;
}


/* ────────────────────────────────────────────
   COMPARACIÓN DE STATS
   ──────────────────────────────────────────── */

function renderStatsComparison() {
  const statsA = {};
  const statsB = {};
  slotA.stats.forEach(s => statsA[s.name] = s.value);
  slotB.stats.forEach(s => statsB[s.name] = s.value);

  const statKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
  const totalA = statKeys.reduce((s, k) => s + (statsA[k] || 0), 0);
  const totalB = statKeys.reduce((s, k) => s + (statsB[k] || 0), 0);

  const rows = statKeys.map(key => {
    const a = statsA[key] || 0;
    const b = statsB[key] || 0;
    const max = Math.max(a, b, 1);
    const color = STAT_COLORS_COMP[key] || '#888';
    const winA = a > b ? 'winner' : '';
    const winB = b > a ? 'winner' : '';
    const pctA = Math.round(a / 255 * 100);
    const pctB = Math.round(b / 255 * 100);

    return `
      <div class="comp-stat-row">
        <div class="comp-stat-side left ${winA}">
          <span class="comp-stat-val">${a}</span>
          <div class="comp-stat-bar-wrap">
            <div class="comp-stat-bar left" style="width:${pctA}%; background:${color}"></div>
          </div>
        </div>
        <div class="comp-stat-label">${STAT_LABELS[key] || key}</div>
        <div class="comp-stat-side right ${winB}">
          <div class="comp-stat-bar-wrap">
            <div class="comp-stat-bar right" style="width:${pctB}%; background:${color}"></div>
          </div>
          <span class="comp-stat-val">${b}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="comp-stats">
      <div class="comp-stats-header">
        <span class="${totalA > totalB ? 'winner' : ''}">${slotA.name} · ${totalA}</span>
        <span class="comp-stats-title">stats base</span>
        <span class="${totalB > totalA ? 'winner' : ''}">${slotB.name} · ${totalB}</span>
      </div>
      ${rows}
    </div>
  `;
}


/* ────────────────────────────────────────────
   BÚSQUEDA DE POKÉMON
   ──────────────────────────────────────────── */

async function searchForSlot(query) {
  const $results = document.getElementById('comp-results');
  if (!$results) return;

  if (!query || query.length < 2) {
    $results.innerHTML = '';
    $results.style.display = 'none';
    return;
  }

  $results.style.display = 'block';
  $results.innerHTML = `<div class="comp-results-loading"><div class="pokeball" style="width:20px;height:20px;border-width:2px"></div></div>`;

  // Buscar en los pokémon ya cargados en la app
  const allPokemon = window.getAllPokemon ? window.getAllPokemon() : [];
  const lower = query.toLowerCase();
  const matches = allPokemon
    .filter(p => p.name.includes(lower) || String(p.id).includes(lower))
    .slice(0, 6);

  if (matches.length === 0) {
    // Intentar buscar directamente por nombre en la API
    try {
      const p = await fetchForComp(lower);
      $results.innerHTML = renderResultItem(p);
    } catch {
      $results.innerHTML = `<div class="comp-no-results">No se encontró ningún Pokémon</div>`;
    }
    return;
  }

  $results.innerHTML = matches.map(p => renderResultItem(p)).join('');

  // Eventos de clic en resultados
  $results.querySelectorAll('.comp-result-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = parseInt(item.dataset.id);
      $results.innerHTML = `<div class="comp-results-loading"><div class="pokeball" style="width:20px;height:20px;border-width:2px"></div></div>`;
      try {
        const pokemon = await fetchForComp(id);
        slotB = pokemon;
        document.getElementById('comp-search').value = '';
        $results.innerHTML = '';
        $results.style.display = 'none';
        renderComparator();
      } catch {
        $results.innerHTML = `<div class="comp-no-results">Error al cargar</div>`;
      }
    });
  });
}

function renderResultItem(p) {
  const colors = window.TYPE_COLORS || {};
  return `
    <div class="comp-result-item" data-id="${p.id}">
      <img src="${p.sprite || ''}" alt="${p.name}" />
      <span class="comp-result-num">#${String(p.id).padStart(3, '0')}</span>
      <span class="comp-result-name">${p.name}</span>
      <div class="comp-result-types">
        ${(p.types || []).map(t =>
          `<span class="type-badge" style="background:${colors[t] || '#888'}">${t}</span>`
        ).join('')}
      </div>
    </div>
  `;
}


/* ────────────────────────────────────────────
   INIT — crear el modal en el DOM
   ──────────────────────────────────────────── */

function initComparator() {
  // Crear el modal si no existe
  if (document.getElementById('comp-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'comp-modal';
  modal.innerHTML = `
    <div id="comp-overlay"></div>
    <div id="comp-panel">
      <div id="comp-header">
        <span id="comp-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
          Comparar Pokémon
        </span>
        <button id="comp-close">✕</button>
      </div>
      <div id="comp-body"></div>
    </div>
  `;
  document.body.appendChild(modal);

  // Cerrar con el botón
  document.getElementById('comp-close').addEventListener('click', closeComparator);

  // Cerrar con el overlay
  document.getElementById('comp-overlay').addEventListener('click', closeComparator);

  // Cerrar con ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && comparatorOpen) closeComparator();
  });
}

// Exponer para app.js
window.openComparator  = openComparator;
window.closeComparator = closeComparator;

// Exponer getAllPokemon para que el buscador acceda a los pokémon cargados
window.getAllPokemon = function() {
  // app.js expone allPokemon via window
  return window._allPokemon || [];
};

document.addEventListener('DOMContentLoaded', initComparator);
