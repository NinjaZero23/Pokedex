/* ============================================================
   POKÉDEX — app.js

   Estructura de este archivo:
   1.  Constantes y datos (tipos, stats, tabla de efectividad)
   2.  Estado global de la aplicación
   3.  Referencias al DOM
   4.  Funciones de fetch (peticiones a la API)
   5.  Carga de generación
   6.  Filtros (tipo y búsqueda)
   7.  Render de la cuadrícula de tarjetas
   8.  Render del panel de detalle
   9.  Cadena evolutiva
   10. Eventos globales (teclado, clic fuera)
   11. Inicio de la aplicación
   ============================================================ */


/* ────────────────────────────────────────────
   1. CONSTANTES Y DATOS
   ──────────────────────────────────────────── */

// URL base de la PokéAPI (gratuita, sin registro)
const API = 'https://pokeapi.co/api/v2';

// Color HEX para cada tipo de pokémon.
// Se usa para los badges, el blob de las tarjetas y el fondo del panel.
const TYPE_COLORS = {
  normal:   '#A8A878',
  fire:     '#F08030',
  water:    '#6890F0',
  electric: '#F8D030',
  grass:    '#78C850',
  ice:      '#98D8D8',
  fighting: '#C03028',
  poison:   '#A040A0',
  ground:   '#E0C068',
  flying:   '#A890F0',
  psychic:  '#F85888',
  bug:      '#A8B820',
  rock:     '#B8A038',
  ghost:    '#705898',
  dragon:   '#7038F8',
  dark:     '#705848',
  steel:    '#B8B8D0',
  fairy:    '#EE99AC',
};

// Abreviaturas para las 6 estadísticas base
const STAT_ABBR = {
  hp:               'HP',
  attack:           'ATK',
  defense:          'DEF',
  'special-attack': 'SpA',
  'special-defense':'SpD',
  speed:            'VEL',
};

// Color de la barra de cada stat
const STAT_COLOR = {
  hp:               '#f87171',
  attack:           '#fb923c',
  defense:          '#facc15',
  'special-attack': '#60a5fa',
  'special-defense':'#4ade80',
  speed:            '#c084fc',
};

// Tabla de efectividad de tipos.
// Formato: { tipo_defensor: { tipo_atacante: multiplicador } }
// Multiplicadores: 0 = inmune, 0.5 = resistente, 2 = débil
const TYPE_CHART = {
  normal:   { fighting: 2 },
  fire:     { water: 2, ground: 2, rock: 2, fire: .5, grass: .5, ice: .5, bug: .5, steel: .5, fairy: .5 },
  water:    { electric: 2, grass: 2, fire: .5, water: .5, ice: .5, steel: .5 },
  electric: { ground: 2, electric: .5, flying: .5, steel: .5 },
  grass:    { fire: 2, ice: 2, poison: 2, flying: 2, bug: 2, water: .5, electric: .5, grass: .5, ground: .5 },
  ice:      { fire: 2, fighting: 2, rock: 2, steel: 2, ice: .5 },
  fighting: { flying: 2, psychic: 2, fairy: 2, bug: .5, rock: .5, dark: .5 },
  poison:   { ground: 2, psychic: 2, grass: .5, fighting: .5, poison: .5, bug: .5, fairy: .5 },
  ground:   { water: 2, grass: 2, ice: 2, poison: .5, rock: .5, electric: 0 },
  flying:   { electric: 2, ice: 2, rock: 2, fighting: .5, bug: .5, grass: .5, ground: 0 },
  psychic:  { bug: 2, ghost: 2, dark: 2, fighting: .5, psychic: .5 },
  bug:      { fire: 2, flying: 2, rock: 2, fighting: .5, ground: .5, grass: .5 },
  rock:     { water: 2, grass: 2, fighting: 2, ground: 2, steel: 2, normal: .5, fire: .5, poison: .5, flying: .5 },
  ghost:    { ghost: 2, dark: 2, normal: 0, fighting: 0 },
  dragon:   { ice: 2, dragon: 2, fairy: 2, fire: .5, water: .5, electric: .5, grass: .5 },
  dark:     { fighting: 2, bug: 2, fairy: 2, ghost: .5, dark: .5, psychic: 0 },
  steel:    { fire: 2, fighting: 2, ground: 2, normal: .5, grass: .5, ice: .5, flying: .5, psychic: .5, bug: .5, rock: .5, dragon: .5, steel: .5, fairy: .5, poison: 0 },
  fairy:    { poison: 2, steel: 2, fighting: .5, bug: .5, dark: .5, dragon: 0 },
};

/**
 * Calcula las debilidades/resistencias/inmunidades de un pokémon
 * combinando los multiplicadores de todos sus tipos.
 * @param {string[]} types - Array de tipos (ej: ['grass', 'poison'])
 * @returns {Object} - { tipo: multiplicador_final }
 */
function calcWeaknesses(types) {
  const chart = {};
  types.forEach(t => {
    Object.entries(TYPE_CHART[t] || {}).forEach(([attacker, mult]) => {
      // Si el pokémon tiene dos tipos, los multiplicadores se multiplican entre sí
      chart[attacker] = (chart[attacker] || 1) * mult;
    });
  });
  return chart;
}


/* ────────────────────────────────────────────
   2. ESTADO GLOBAL
   Variables que guardan la situación actual de la app.
   ──────────────────────────────────────────── */

let allPokemon      = [];   // todos los pokémon de la gen actual (datos básicos)
let filteredPokemon = [];   // subconjunto después de aplicar filtros
let activeType      = 'all'; // tipo seleccionado en la barra de filtros
let searchTerm      = '';   // texto escrito en el buscador
let currentId       = null; // ID del pokémon seleccionado en el panel
const cache         = {};   // { id: datosCompletos } — evita pedir dos veces la misma info


/* ────────────────────────────────────────────
   3. REFERENCIAS AL DOM
   Guardamos los elementos en variables para no
   llamar a getElementById cada vez que los necesitemos.
   ──────────────────────────────────────────── */
const $grid    = document.getElementById('pokemon-grid');
const $loader  = document.getElementById('loader');
const $noR     = document.getElementById('no-results');
const $panel   = document.getElementById('detail-panel');
const $dEmpty  = document.getElementById('detail-empty');
const $dConten = document.getElementById('detail-content');
const $search  = document.getElementById('search');
const $typeBar = document.getElementById('type-bar');
const $genSel  = document.getElementById('gen-select');
const $count   = document.getElementById('pokemon-count');


/* ────────────────────────────────────────────
   4. FUNCIONES DE FETCH
   ──────────────────────────────────────────── */

/**
 * Fetch genérico: pide una URL y devuelve el JSON.
 * Lanza un error si la respuesta no es 200 OK.
 */
async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error ${response.status}: ${url}`);
  return response.json();
}


/* ────────────────────────────────────────────
   5. CARGA DE GENERACIÓN
   Pide los datos básicos de todos los pokémon
   entre los IDs 'start' y 'end', en lotes de 20
   para ir mostrando resultados progresivamente.
   ──────────────────────────────────────────── */
async function loadGen(start, end) {
  // Resetear estado
  allPokemon = [];
  filteredPokemon = [];
  activeType = 'all';
  searchTerm = '';
  $search.value = '';
  currentId = null;

  // Limpiar la cuadrícula (solo quitar tarjetas, no el loader ni no-results)
  [...$grid.querySelectorAll('.poke-card')].forEach(el => el.remove());
  $loader.style.display = 'flex';
  $noR.style.display = 'none';
  closeDetail();

  // Crear array de IDs a cargar
  const ids = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // Cargar en lotes de 20 (Promise.all hace las 20 peticiones en paralelo)
  const BATCH_SIZE = 20;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(id =>
        get(`${API}/pokemon/${id}`)
          .then(p => ({
            id:     p.id,
            name:   p.name,
            sprite: p.sprites.front_default,
            types:  p.types.map(t => t.type.name),
          }))
          .catch(() => null) // si falla un pokémon, devuelve null (lo filtramos después)
      )
    );

    // Agregar al array global ignorando los que fallaron
    allPokemon.push(...results.filter(Boolean));

    // Render parcial: mostramos los que ya tenemos mientras cargamos el resto
    applyFilters();
  }

  $loader.style.display = 'none';
  buildTypeFilters(); // construir chips de tipo con los tipos disponibles en esta gen
  updateCount();
}


/* ────────────────────────────────────────────
   6. FILTROS
   ──────────────────────────────────────────── */

/**
 * Construye los chips de tipo en la barra superior.
 * Se llama después de cargar una generación.
 */
function buildTypeFilters() {
  // Obtener tipos únicos de todos los pokémon cargados
  const types = [...new Set(allPokemon.flatMap(p => p.types))].sort();

  // Reconstruir la barra (siempre empieza con "todos")
  $typeBar.innerHTML = `<button class="type-chip${activeType === 'all' ? ' active' : ''}" data-type="all">todos</button>`;

  types.forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'type-chip' + (activeType === type ? ' active' : '');
    btn.dataset.type = type;
    btn.textContent = type;

    // Si está activo, ponerle el color de fondo del tipo
    if (activeType === type) {
      btn.style.background = TYPE_COLORS[type] || '#888';
      btn.style.color = '#000';
      btn.style.borderColor = 'transparent';
    }

    $typeBar.appendChild(btn);
  });
}

// Evento: clic en un chip de tipo
$typeBar.addEventListener('click', e => {
  const btn = e.target.closest('.type-chip');
  if (!btn) return;
  activeType = btn.dataset.type;
  buildTypeFilters();
  applyFilters();
});

// Evento: escribir en el buscador
$search.addEventListener('input', e => {
  searchTerm = e.target.value.toLowerCase().trim();
  applyFilters();
});

// Evento: cambiar de generación
$genSel.addEventListener('change', e => {
  const [start, end] = e.target.value.split(',').map(Number);
  loadGen(start, end);
});

/**
 * Aplica los filtros activos (tipo + búsqueda) y vuelve a renderizar.
 */
function applyFilters() {
  filteredPokemon = allPokemon.filter(p => {
    const matchesSearch = p.name.includes(searchTerm) || String(p.id).includes(searchTerm);
    const matchesType   = activeType === 'all' || p.types.includes(activeType);
    return matchesSearch && matchesType;
  });
  renderGrid();
  updateCount();
}

/** Actualiza el contador "X / 151" en el header */
function updateCount() {
  $count.textContent = `${filteredPokemon.length} / ${allPokemon.length}`;
}


/* ────────────────────────────────────────────
   7. RENDER DE LA CUADRÍCULA
   ──────────────────────────────────────────── */

/**
 * Borra las tarjetas actuales y las vuelve a crear
 * con los pokémon de filteredPokemon.
 */
function renderGrid() {
  // Eliminar tarjetas anteriores
  [...$grid.querySelectorAll('.poke-card')].forEach(el => el.remove());

  // Crear una tarjeta por cada pokémon filtrado
  filteredPokemon.forEach((pokemon, index) => {
    const card = makeCard(pokemon, index);
    $grid.insertBefore(card, $loader); // insertar antes del loader (que está al final)
  });

  // Mostrar mensaje "sin resultados" si corresponde
  $noR.style.display =
    filteredPokemon.length === 0 && allPokemon.length > 0 ? 'block' : 'none';
}

/**
 * Crea y devuelve el elemento HTML de una tarjeta de pokémon.
 * @param {Object} p - { id, name, sprite, types }
 * @param {number} idx - Posición en el array (para el delay de animación)
 */
function makeCard(p, idx) {
  const div = document.createElement('div');
  div.className = 'poke-card' + (p.id === currentId ? ' active' : '');
  div.dataset.id = p.id;

  // Delay escalonado para que las tarjetas aparezcan de forma suave
  div.style.animationDelay = `${Math.min(idx * 0.025, 0.6)}s`;

  const mainColor = TYPE_COLORS[p.types[0]] || '#888';

  div.innerHTML = `
    <div class="card-blob" style="background:${mainColor}"></div>
    <span class="card-num">#${String(p.id).padStart(3, '0')}</span>
    <img class="card-img" src="${p.sprite || ''}" alt="${p.name}" loading="lazy" />
    <span class="card-name">${p.name}</span>
    <div class="card-types">
      ${p.types.map(t =>
        `<span class="type-badge" style="background:${TYPE_COLORS[t] || '#888'}">${t}</span>`
      ).join('')}
    </div>
  `;

  div.addEventListener('click', () => showDetail(p.id));
  return div;
}


/* ────────────────────────────────────────────
   8. PANEL DE DETALLE
   ──────────────────────────────────────────── */

/**
 * Muestra el panel de detalle para el pokémon con el ID dado.
 * Primero muestra un spinner, luego pide los datos a la API
 * y llama a renderDetail() cuando llegan.
 */
async function showDetail(id) {
  currentId = id;

  // Marcar la tarjeta activa
  document.querySelectorAll('.poke-card').forEach(card =>
    card.classList.toggle('active', +card.dataset.id === id)
  );

  // Mostrar panel con spinner
  $dEmpty.style.display = 'none';
  $dConten.style.display = 'block';
  $panel.classList.add('open'); // en móvil esto hace el drawer subir
  $dConten.innerHTML = `
    <div style="display:flex; justify-content:center; padding:80px">
      <div class="pokeball"></div>
    </div>`;

  try {
    // Pedimos datos del pokémon y de la especie en paralelo
    const [pokemon, species] = await Promise.all([
      // Si ya lo teníamos en caché, no volvemos a pedirlo
      cache[id]
        ? Promise.resolve(cache[id])
        : get(`${API}/pokemon/${id}`).then(data => { cache[id] = data; return data; }),
      // La especie puede fallar (algunos pokémon no tienen) → catch devuelve null
      get(`${API}/pokemon-species/${id}`).catch(() => null),
    ]);

    renderDetail(pokemon, species);

  } catch (error) {
    $dConten.innerHTML = `
      <p style="color:var(--text3); padding:20px; font-size:13px">
        Error al cargar los datos. Revisa tu conexión a internet.
      </p>`;
  }
}

/** Cierra el panel de detalle y limpia el estado */
function closeDetail() {
  $panel.classList.remove('open');
  $dEmpty.style.display = 'flex';
  $dConten.style.display = 'none';
  document.querySelectorAll('.poke-card').forEach(c => c.classList.remove('active'));
  currentId = null;
}

/**
 * Construye el HTML completo del panel de detalle
 * con todos los datos del pokémon.
 */
async function renderDetail(p, species) {
  const types    = p.types.map(t => t.type.name);
  const mainColor = TYPE_COLORS[types[0]] || '#888';

  // Descripción en español (o inglés si no hay en español)
  let description = '';
  if (species?.flavor_text_entries) {
    const entry =
      species.flavor_text_entries.find(e => e.language.name === 'es') ||
      species.flavor_text_entries.find(e => e.language.name === 'en');
    if (entry) {
      // La API incluye saltos de línea raros (\f, \n) — los reemplazamos por espacios
      description = entry.flavor_text.replace(/[\f\n\r]/g, ' ');
    }
  }

  // Sprites disponibles
  const sprites = {
    normal: p.sprites.front_default,
    shiny:  p.sprites.front_shiny,
    back:   p.sprites.back_default,
  };

  // Calcular efectividad de tipos
  const weakChart = calcWeaknesses(types);
  const w4     = Object.entries(weakChart).filter(([, m]) => m === 4).map(([t]) => t);   // ×4
  const w2     = Object.entries(weakChart).filter(([, m]) => m === 2).map(([t]) => t);   // ×2
  const resist = Object.entries(weakChart).filter(([, m]) => m > 0 && m < 1).map(([t, m]) => ({ t, m })); // ×0.5
  const immune = Object.entries(weakChart).filter(([, m]) => m === 0).map(([t]) => t);   // ×0

  // Suma total de estadísticas base
  const statTotal = p.stats.reduce((sum, s) => sum + s.base_stat, 0);

  // Categoría del pokémon (ej: "Pokémon Semilla")
  const genus = species?.genera
    ? (species.genera.find(g => g.language.name === 'es') ||
       species.genera.find(g => g.language.name === 'en'))?.genus || ''
    : '';

  // Construir el HTML del panel
  $dConten.innerHTML = `

    <!-- HERO: sprite + nombre + tipos -->
    <div class="d-hero">
      <div class="d-hero-bg"
           style="background: radial-gradient(ellipse at 50% 0%, ${mainColor}, transparent 68%)">
      </div>

      <div class="d-hero-num">#${String(p.id).padStart(3, '0')}</div>

      <!-- Tabs para cambiar de sprite -->
      <div class="sprite-tabs">
        ${sprites.normal ? `<button class="sprite-tab active" data-src="${sprites.normal}">normal</button>` : ''}
        ${sprites.shiny  ? `<button class="sprite-tab" data-src="${sprites.shiny}">✦ shiny</button>` : ''}
        ${sprites.back   ? `<button class="sprite-tab" data-src="${sprites.back}">espalda</button>` : ''}
      </div>

      <img id="detail-sprite" src="${sprites.normal || ''}" alt="${p.name}" />
      <h2 id="detail-name">${p.name}</h2>

      <div id="detail-types">
        ${types.map(t =>
          `<span class="type-badge" style="background:${TYPE_COLORS[t] || '#888'}">${t}</span>`
        ).join('')}
      </div>
    </div>


    <!-- DESCRIPCIÓN -->
    ${description ? `
      <div class="d-section">
        <div class="d-label">descripción</div>
        <p id="detail-desc">${description}</p>
      </div>
    ` : ''}


    <!-- INFORMACIÓN BÁSICA -->
    <div class="d-section">
      <div class="d-label">información</div>
      <div class="info-grid">

        <div class="info-cell">
          <div class="info-cell-label">Altura</div>
          <div class="info-cell-val">${(p.height / 10).toFixed(1)} m</div>
        </div>

        <div class="info-cell">
          <div class="info-cell-label">Peso</div>
          <div class="info-cell-val">${(p.weight / 10).toFixed(1)} kg</div>
        </div>

        ${genus ? `
          <div class="info-cell full">
            <div class="info-cell-label">Categoría</div>
            <div class="info-cell-val" style="font-size:13px; font-weight:400">${genus}</div>
          </div>
        ` : ''}

        ${genus ? `
          <div class="info-cell full">
            <div class="info-cell-label">Categoría</div>
            <div class="info-cell-val" style="font-size:13px; font-weight:400">${genus}</div>
          </div>
        ` : ''}

      </div>
    </div>


    <!-- HABILIDADES DETALLADAS -->
    <div class="d-section">
      <div class="d-label">habilidades</div>
      <div id="abilities-list">
        ${p.abilities.map(a => `
          <div class="ability-card" data-ability="${a.ability.name}">
            <div class="ability-header">
              <div class="ability-left">
                <span class="ability-name">${a.ability.name.replace(/-/g, ' ')}</span>
                ${a.is_hidden ? '<span class="ability-hidden">oculta</span>' : ''}
              </div>
              <span class="ability-arrow">▾</span>
            </div>
            <div class="ability-body">
              <div class="ability-loading">
                <div class="pokeball" style="width:20px;height:20px;border-width:2px"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>


    <!-- ESTADÍSTICAS BASE -->
    <div class="d-section">
      <div class="d-label">
        estadísticas
        <span style="color:var(--text3); margin-left:4px">total ${statTotal}</span>
      </div>

      ${p.stats.map(s => {
        const key  = s.stat.name;
        const val  = s.base_stat;
        const pct  = Math.round(val / 255 * 100); // 255 es el máximo posible
        const color = STAT_COLOR[key] || mainColor;
        return `
          <div class="stat-row">
            <span class="stat-name">${STAT_ABBR[key] || key}</span>
            <span class="stat-val">${val}</span>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill" style="width:${pct}%; background:${color}"></div>
            </div>
          </div>`;
      }).join('')}
    </div>


    <!-- DEBILIDADES -->
    ${w4.length || w2.length ? `
      <div class="d-section">
        <div class="d-label">debilidades</div>
        <div class="weak-grid">
          ${w4.map(t =>
            `<span class="weak-badge" style="background:${TYPE_COLORS[t] || '#888'}">
              ${t}<span class="mult">×4</span>
            </span>`
          ).join('')}
          ${w2.map(t =>
            `<span class="weak-badge" style="background:${TYPE_COLORS[t] || '#888'}">
              ${t}<span class="mult">×2</span>
            </span>`
          ).join('')}
        </div>
      </div>
    ` : ''}


    <!-- RESISTENCIAS E INMUNIDADES -->
    ${resist.length || immune.length ? `
      <div class="d-section">
        <div class="d-label">resistencias</div>
        <div class="weak-grid">
          ${resist.map(({ t, m }) =>
            `<span class="weak-badge" style="background:${TYPE_COLORS[t] || '#888'}; opacity:0.55">
              ${t}<span class="mult">×${m}</span>
            </span>`
          ).join('')}
          ${immune.map(t =>
            `<span class="weak-badge" style="background:var(--surface2); border:1px solid var(--border2); color:var(--text2)">
              ${t}<span class="mult">×0</span>
            </span>`
          ).join('')}
        </div>
      </div>
    ` : ''}


    <!-- CADENA EVOLUTIVA (se carga asíncronamente) -->
    <div class="d-section">
      <div class="d-label">evoluciones</div>
      <div id="evo-chain">
        <div class="pokeball" style="margin:8px auto"></div>
      </div>
    </div>

    <div style="height:6px"></div>
  `;

  // Activar los tabs de sprites
  $dConten.querySelectorAll('.sprite-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $dConten.querySelectorAll('.sprite-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('detail-sprite').src = tab.dataset.src;
    });
  });

  // Activar tarjetas de habilidades
  initAbilityCards();

  // Cargar cadena evolutiva (es una petición separada)
  if (species?.evolution_chain?.url) {
    loadEvolutions(species.evolution_chain.url, p.id);
  } else {
    const ec = document.getElementById('evo-chain');
    if (ec) ec.innerHTML = '<span style="color:var(--text3); font-size:13px">No evoluciona</span>';
  }
}


/* ────────────────────────────────────────────
   9. CADENA EVOLUTIVA
   ──────────────────────────────────────────── */

/**
 * Pide la cadena evolutiva y renderiza las tarjetas
 * de cada evolución con sus sprites.
 * @param {string} url - URL de la cadena (viene de la especie)
 * @param {number} currentPokemonId - ID del pokémon actual (para marcarlo)
 */
async function loadEvolutions(url, currentPokemonId) {
  const ec = document.getElementById('evo-chain');
  if (!ec) return;

  try {
    const chainData = await get(url);

    // Aplanar el árbol evolutivo en un array lineal (solo la línea principal)
    const flat = [];
    function walk(node) {
      flat.push({
        name:  node.species.name,
        level: node.evolution_details?.[0]?.min_level || null,
      });
      // Solo seguimos la primera rama (evoluciones ramificadas como Eevee se simplifican)
      if (node.evolves_to?.[0]) walk(node.evolves_to[0]);
    }
    walk(chainData.chain);

    // Si solo hay un miembro, no evoluciona
    if (flat.length <= 1) {
      ec.innerHTML = '<span style="color:var(--text3); font-size:13px">No evoluciona</span>';
      return;
    }

    // Pedir el sprite de cada miembro de la cadena
    const evoData = await Promise.all(
      flat.map(e =>
        get(`${API}/pokemon/${e.name}`)
          .then(p => ({ ...e, id: p.id, sprite: p.sprites.front_default }))
          .catch(() => ({ ...e, id: null, sprite: null }))
      )
    );

    // El panel pudo haber cambiado mientras cargábamos (si el usuario clickeó otro pokémon)
    const ec2 = document.getElementById('evo-chain');
    if (!ec2) return;

    // Construir el HTML de la cadena
    ec2.innerHTML = evoData.map((evo, i) => `
      ${i > 0 ? `
        <div class="evo-arrow">
          →
          ${evo.level ? `<span class="evo-lv">lv.${evo.level}</span>` : ''}
        </div>
      ` : ''}
      <div class="evo-item ${evo.id === currentPokemonId ? 'is-current' : ''}"
           data-id="${evo.id || ''}">
        ${evo.sprite
          ? `<img class="evo-img" src="${evo.sprite}" alt="${evo.name}" />`
          : ''}
        <span class="evo-name">${evo.name}</span>
      </div>
    `).join('');

    // Hacer clickeables las evoluciones (excepto el pokémon actual)
    document.querySelectorAll('.evo-item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id);
        if (id && id !== currentPokemonId) showDetail(id);
      });
    });

  } catch (error) {
    const ec2 = document.getElementById('evo-chain');
    if (ec2) ec2.innerHTML = '<span style="color:var(--text3); font-size:13px">No disponible</span>';
  }
}


/* ────────────────────────────────────────────
   10. HABILIDADES DETALLADAS
   ──────────────────────────────────────────── */

const abilityCache = {};

async function fetchAbility(name) {
  if (abilityCache[name]) return abilityCache[name];
  const data = await get(`${API}/ability/${name}`);

  // Español con fallback a inglés
  const flavor =
    data.flavor_text_entries?.find(e => e.language.name === 'es') ||
    data.flavor_text_entries?.find(e => e.language.name === 'en');
  const effectEntry =
    data.effect_entries?.find(e => e.language.name === 'es') ||
    data.effect_entries?.find(e => e.language.name === 'en');

  const result = {
    desc:        flavor?.flavor_text?.replace(/[\f\n\r]/g, ' ') || '',
    shortEffect: effectEntry?.short_effect?.replace(/[\f\n\r]/g, ' ') || '',
    pokemon:     data.pokemon?.slice(0, 4).map(p => p.pokemon.name) || [],
    generation:  data.generation?.name?.replace('generation-', 'Gen ').toUpperCase() || '',
  };

  abilityCache[name] = result;
  return result;
}

function initAbilityCards() {
  document.querySelectorAll('.ability-card').forEach(card => {
    const header = card.querySelector('.ability-header');
    const body   = card.querySelector('.ability-body');
    const arrow  = card.querySelector('.ability-arrow');
    const name   = card.dataset.ability;
    let loaded   = false;
    let open     = false;

    body.style.display = 'none';

    header.addEventListener('click', async () => {
      open = !open;
      arrow.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
      body.style.display = open ? 'block' : 'none';

      if (open && !loaded) {
        loaded = true;
        try {
          const ability = await fetchAbility(name);
          body.innerHTML = `
            ${ability.shortEffect ? `
              <p class="ability-effect">${ability.shortEffect}</p>
            ` : ''}
            ${ability.desc && ability.desc !== ability.shortEffect ? `
              <p class="ability-desc">${ability.desc}</p>
            ` : ''}
            <div class="ability-meta">
              ${ability.generation ? `
                <span class="ability-meta-pill">
                  <span class="ability-meta-label">introduced</span>
                  ${ability.generation}
                </span>
              ` : ''}
              ${ability.pokemon.length ? `
                <span class="ability-meta-pill">
                  <span class="ability-meta-label">also in</span>
                  ${ability.pokemon.join(', ')}
                </span>
              ` : ''}
            </div>
          `;
        } catch {
          body.innerHTML = `<p class="ability-desc" style="color:var(--text3)">Could not load ability data.</p>`;
        }
      }
    });
  });
}


/* ────────────────────────────────────────────
   11. EVENTOS GLOBALES
   ──────────────────────────────────────────── */

// Cerrar el drawer en móvil al tocar fuera del panel
document.addEventListener('click', e => {
  const isMobile = window.innerWidth <= 820;
  const panelIsOpen = $panel.classList.contains('open');
  const clickedInsidePanel = $panel.contains(e.target);
  const clickedOnCard = e.target.closest('.poke-card');

  if (isMobile && panelIsOpen && !clickedInsidePanel && !clickedOnCard) {
    closeDetail();
  }
});

// Atajos de teclado
document.addEventListener('keydown', e => {
  // ESC → cerrar el panel
  if (e.key === 'Escape') closeDetail();

  // "/" → enfocar el buscador (como en GitHub)
  if (e.key === '/' && document.activeElement !== $search) {
    e.preventDefault();
    $search.focus();
  }
});


/* ────────────────────────────────────────────
   11. INICIO
   Cargamos la primera generación al abrir la página.
   ──────────────────────────────────────────── */
loadGen(1, 151);
