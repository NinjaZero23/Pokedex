/* ============================================================
   POKÉDEX — battle.js
   Modo batalla: Tu equipo vs equipo de IA

   Mecánicas:
   - Movimientos reales de la PokéAPI (máx 4 por pokémon)
   - Fórmula de daño simplificada basada en stats reales
   - Turno por turno: tú eliges, la IA elige aleatoriamente
   - HP animado con barras
   - Al morir un pokémon se puede cambiar por otro del equipo
   - Récord de victorias guardado por usuario
   ============================================================ */


/* ────────────────────────────────────────────
   ESTADO DE BATALLA
   ──────────────────────────────────────────── */
let battleOpen    = false;
let playerTeam    = [];   // [ { id, name, sprite, types, stats, moves, currentHp, maxHp } ]
let aiTeam        = [];
let playerIndex   = 0;    // pokémon activo del jugador
let aiIndex       = 0;    // pokémon activo de la IA
let battlePhase   = 'idle'; // idle | player-turn | animating | switching | result
let moveLog       = [];   // historial de mensajes


/* ────────────────────────────────────────────
   STATS Y TIPOS
   ──────────────────────────────────────────── */
const TYPE_COLORS_B = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', electric:'#F8D030',
  grass:'#78C850', ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0',
  ground:'#E0C068', flying:'#A890F0', psychic:'#F85888', bug:'#A8B820',
  rock:'#B8A038', ghost:'#705898', dragon:'#7038F8', dark:'#705848',
  steel:'#B8B8D0', fairy:'#EE99AC',
};

// Efectividad de tipos (simplificada)
const TYPE_CHART_B = {
  normal:{fighting:2},
  fire:{water:2,ground:2,rock:2,fire:.5,grass:.5,ice:.5,bug:.5,steel:.5,fairy:.5},
  water:{electric:2,grass:2,fire:.5,water:.5,ice:.5,steel:.5},
  electric:{ground:2,electric:.5,flying:.5,steel:.5},
  grass:{fire:2,ice:2,poison:2,flying:2,bug:2,water:.5,electric:.5,grass:.5,ground:.5},
  ice:{fire:2,fighting:2,rock:2,steel:2,ice:.5},
  fighting:{flying:2,psychic:2,fairy:2,bug:.5,rock:.5,dark:.5},
  poison:{ground:2,psychic:2,grass:.5,fighting:.5,poison:.5,bug:.5,fairy:.5},
  ground:{water:2,grass:2,ice:2,poison:.5,rock:.5,electric:0},
  flying:{electric:2,ice:2,rock:2,fighting:.5,bug:.5,grass:.5,ground:0},
  psychic:{bug:2,ghost:2,dark:2,fighting:.5,psychic:.5},
  bug:{fire:2,flying:2,rock:2,fighting:.5,ground:.5,grass:.5},
  rock:{water:2,grass:2,fighting:2,ground:2,steel:2,normal:.5,fire:.5,poison:.5,flying:.5},
  ghost:{ghost:2,dark:2,normal:0,fighting:0},
  dragon:{ice:2,dragon:2,fairy:2,fire:.5,water:.5,electric:.5,grass:.5},
  dark:{fighting:2,bug:2,fairy:2,ghost:.5,dark:.5,psychic:0},
  steel:{fire:2,fighting:2,ground:2,normal:.5,grass:.5,ice:.5,flying:.5,psychic:.5,bug:.5,rock:.5,dragon:.5,steel:.5,fairy:.5,poison:0},
  fairy:{poison:2,steel:2,fighting:.5,bug:.5,dark:.5,dragon:0},
};

function typeMultiplier(moveType, defenderTypes) {
  let mult = 1;
  defenderTypes.forEach(t => {
    const chart = TYPE_CHART_B[t] || {};
    mult *= (chart[moveType] !== undefined ? chart[moveType] : 1);
  });
  return mult;
}

/**
 * Fórmula de daño simplificada basada en Gen 1/2
 * damage = ((2 * level / 5 + 2) * power * atk/def) / 50 + 2
 * Con varianza aleatoria 85–100%
 */
function calcDamage(attacker, move, defender) {
  if (!move.power) return 0;
  const level  = 50; // nivel fijo para todos
  const atk    = move.category === 'special'
    ? getStat(attacker, 'special-attack')
    : getStat(attacker, 'attack');
  const def    = move.category === 'special'
    ? getStat(defender, 'special-defense')
    : getStat(defender, 'defense');
  const stab   = attacker.types.includes(move.type) ? 1.5 : 1;
  const type   = typeMultiplier(move.type, defender.types);
  const rand   = (Math.floor(Math.random() * 16) + 85) / 100;
  const base   = ((((2 * level / 5 + 2) * move.power * atk) / def) / 50 + 2);
  return Math.max(1, Math.floor(base * stab * type * rand));
}

function getStat(pokemon, statName) {
  const s = pokemon.stats.find(s => s.name === statName);
  return s ? s.value : 50;
}

function getMaxHp(pokemon) {
  const base = getStat(pokemon, 'hp');
  return Math.floor((2 * base * 50) / 100 + 50 + 10);
}


/* ────────────────────────────────────────────
   FETCH
   ──────────────────────────────────────────── */
const battleCache = {};

async function fetchBattlePokemon(id) {
  if (battleCache[id]) return battleCache[id];
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const d = await r.json();
  battleCache[id] = d;
  return d;
}

async function fetchMoveData(url) {
  const r = await fetch(url);
  return r.json();
}

/**
 * Prepara un pokémon para batalla: stats reales + hasta 4 movimientos con poder
 */
async function preparePokemon(basic) {
  const d = await fetchBattlePokemon(basic.id);

  // Tomar hasta 4 movimientos que tengan poder (dañinos)
  const allMoves = d.moves.map(m => ({ name: m.move.name, url: m.move.url }));
  const shuffled = allMoves.sort(() => Math.random() - 0.5).slice(0, 12);

  // Fetchear datos de los primeros movimientos hasta tener 4 con poder
  const moves = [];
  for (const m of shuffled) {
    if (moves.length >= 4) break;
    try {
      const md = await fetchMoveData(m.url);
      if (md.power && md.power >= 30) {
        moves.push({
          name:     md.name,
          power:    md.power,
          type:     md.type.name,
          category: md.damage_class.name, // physical / special
          pp:       md.pp,
          currentPp: md.pp,
        });
      }
    } catch { /* skip */ }
  }

  // Si no hay suficientes movimientos con poder, agregar tackle/scratch como fallback
  if (moves.length === 0) {
    moves.push({ name: 'tackle', power: 40, type: 'normal', category: 'physical', pp: 35, currentPp: 35 });
  }

  const maxHp = getMaxHp({ stats: d.stats.map(s => ({ name: s.stat.name, value: s.base_stat })) });

  return {
    id:        d.id,
    name:      d.name,
    sprite:    d.sprites.front_default,
    spriteBack: d.sprites.back_default || d.sprites.front_default,
    types:     d.types.map(t => t.type.name),
    stats:     d.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
    moves,
    maxHp,
    currentHp: maxHp,
    fainted:   false,
  };
}


/* ────────────────────────────────────────────
   ABRIR / CERRAR
   ──────────────────────────────────────────── */
function openBattle() {
  // Verificar que el jugador tiene equipo
  const team = typeof getTeam === 'function' ? getTeam() : [];
  if (team.length === 0) {
    alert('Necesitas al menos 1 Pokémon en tu equipo para batallar.\n\nAgrega pokémon desde el panel de detalle.');
    return;
  }

  battleOpen = true;
  const $modal = document.getElementById('battle-modal');
  $modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  showBattleScreen('loading');
  initBattle(team);
}

function closeBattle() {
  battleOpen = false;
  battlePhase = 'idle';
  const $modal = document.getElementById('battle-modal');
  $modal.classList.remove('open');
  document.body.style.overflow = '';
}

function showBattleScreen(screen) {
  const $body = document.getElementById('battle-body');
  if (!$body) return;
  if (screen === 'loading') renderLoadingScreen($body);
  if (screen === 'battle')  renderBattleScreen($body);
  if (screen === 'result')  renderResultScreen($body);
}


/* ────────────────────────────────────────────
   INICIAR BATALLA
   ──────────────────────────────────────────── */
async function initBattle(rawTeam) {
  const $body = document.getElementById('battle-body');

  try {
    // Preparar equipo del jugador
    const playerPromises = rawTeam.map(p => preparePokemon(p));

    // Generar equipo de IA con pokémon aleatorios (misma cantidad que el jugador)
    const aiIds = [];
    while (aiIds.length < rawTeam.length) {
      const id = Math.floor(Math.random() * 151) + 1;
      if (!aiIds.includes(id)) aiIds.push(id);
    }
    const aiPromises = aiIds.map(id => preparePokemon({ id }));

    // Cargar ambos equipos en paralelo
    [playerTeam, aiTeam] = await Promise.all([
      Promise.all(playerPromises),
      Promise.all(aiPromises),
    ]);

    playerIndex = 0;
    aiIndex     = 0;
    moveLog     = [];
    battlePhase = 'player-turn';

    addLog(`¡Una batalla salvaje comenzó!`);
    addLog(`¡${capitalize(playerTeam[0].name)}, yo te elijo!`);

    showBattleScreen('battle');

  } catch (e) {
    $body.innerHTML = `<div class="battle-loading"><p style="color:var(--red)">Error al cargar la batalla.<br>Revisa tu conexión.</p></div>`;
  }
}


/* ────────────────────────────────────────────
   RENDER PANTALLAS
   ──────────────────────────────────────────── */
function renderLoadingScreen($body) {
  $body.innerHTML = `
    <div class="battle-loading">
      <div class="pokeball"></div>
      <p>Preparando la batalla...</p>
      <p style="font-size:11px;color:var(--text3);margin-top:4px">Cargando movimientos reales</p>
    </div>`;
}

function renderBattleScreen($body) {
  const player = playerTeam[playerIndex];
  const ai     = aiTeam[aiIndex];
  const colors  = window.TYPE_COLORS || TYPE_COLORS_B;

  $body.innerHTML = `

    <!-- ── CAMPO DE BATALLA ── -->
    <div class="battle-field">

      <!-- Pokémon de la IA (arriba) -->
      <div class="battle-side ai-side">
        <div class="battle-info ai-info">
          <div class="battle-name-row">
            <span class="battle-poke-name">${capitalize(ai.name)}</span>
            <span class="battle-poke-types">
              ${ai.types.map(t => `<span class="type-badge" style="background:${colors[t]||'#888'}">${t}</span>`).join('')}
            </span>
          </div>
          <div class="battle-hp-row">
            <span class="battle-hp-label">HP</span>
            <div class="battle-hp-track">
              <div class="battle-hp-bar" id="ai-hp-bar"
                style="width:${hpPct(ai)}%;background:${hpColor(ai)}"></div>
            </div>
            <span class="battle-hp-num" id="ai-hp-num">${ai.currentHp}/${ai.maxHp}</span>
          </div>
        </div>
        <div class="battle-sprite-wrap ai-sprite-wrap">
          <img class="battle-sprite ai-sprite" id="ai-sprite"
            src="${ai.sprite}" alt="${ai.name}" />
        </div>
      </div>

      <!-- Pokémon del jugador (abajo) -->
      <div class="battle-side player-side">
        <div class="battle-sprite-wrap player-sprite-wrap">
          <img class="battle-sprite player-sprite" id="player-sprite"
            src="${player.spriteBack}" alt="${player.name}" />
        </div>
        <div class="battle-info player-info">
          <div class="battle-name-row">
            <span class="battle-poke-name">${capitalize(player.name)}</span>
            <span class="battle-poke-types">
              ${player.types.map(t => `<span class="type-badge" style="background:${colors[t]||'#888'}">${t}</span>`).join('')}
            </span>
          </div>
          <div class="battle-hp-row">
            <span class="battle-hp-label">HP</span>
            <div class="battle-hp-track">
              <div class="battle-hp-bar" id="player-hp-bar"
                style="width:${hpPct(player)}%;background:${hpColor(player)}"></div>
            </div>
            <span class="battle-hp-num" id="player-hp-num">${player.currentHp}/${player.maxHp}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- ── LOG DE BATALLA ── -->
    <div class="battle-log" id="battle-log">
      ${moveLog.slice(-3).map(m => `<div class="battle-log-line">${m}</div>`).join('')}
    </div>

    <!-- ── ACCIONES ── -->
    <div class="battle-actions" id="battle-actions">
      ${renderActions(player)}
    </div>

    <!-- ── EQUIPO ── -->
    <div class="battle-team-strip" id="battle-team-strip">
      ${renderTeamStrip()}
    </div>

  `;

  bindActions();
}

function renderActions(player) {
  if (battlePhase === 'switching') {
    return `<div class="battle-action-label">Elige el siguiente pokémon:</div>`;
  }
  if (battlePhase !== 'player-turn') {
    return `<div class="battle-action-label">...</div>`;
  }

  const moveBtns = player.moves.map(m => `
    <button class="battle-move-btn" data-move='${JSON.stringify(m)}'>
      <span class="battle-move-name">${m.name.replace(/-/g,' ')}</span>
      <span class="battle-move-meta">
        <span class="battle-move-type" style="background:${(window.TYPE_COLORS||TYPE_COLORS_B)[m.type]||'#888'}">${m.type}</span>
        <span class="battle-move-power">⚡${m.power}</span>
      </span>
    </button>
  `).join('');

  return `
    <div class="battle-action-label">¿Qué hará <strong>${capitalize(player.name)}</strong>?</div>
    <div class="battle-moves-grid">${moveBtns}</div>
  `;
}

function renderTeamStrip() {
  return playerTeam.map((p, i) => `
    <div class="battle-team-dot ${p.fainted ? 'fainted' : ''} ${i === playerIndex ? 'active' : ''}"
      title="${capitalize(p.name)}">
      <img src="${p.sprite}" alt="${p.name}" />
    </div>
  `).join('');
}

function renderResultScreen($body) {
  const playerAlive = playerTeam.filter(p => !p.fainted).length;
  const aiAlive     = aiTeam.filter(p => !p.fainted).length;
  const won         = playerAlive > 0 && aiAlive === 0;
  const lost        = playerAlive === 0;

  // Guardar récord y recompensar créditos
  saveRecord(won);
  if (window.rewardBattle) window.rewardBattle(won);

  $body.innerHTML = `
    <div class="battle-result">
      <div class="battle-result-icon">${won ? '🏆' : lost ? '💀' : '🤝'}</div>
      <div class="battle-result-title ${won ? 'won' : 'lost'}">
        ${won ? '¡Victoria!' : lost ? 'Derrota...' : 'Empate'}
      </div>
      <div class="battle-result-sub">
        ${won
          ? `Ganaste con ${playerAlive} pokémon en pie`
          : lost
            ? 'Tu equipo fue derrotado'
            : 'Todos los pokémon cayeron'}
      </div>

      <div class="battle-result-teams">
        <div class="battle-result-col">
          <div class="battle-result-col-label">Tu equipo</div>
          ${playerTeam.map(p => `
            <div class="battle-result-poke ${p.fainted ? 'fainted' : ''}">
              <img src="${p.sprite}" alt="${p.name}" />
              <span>${capitalize(p.name)}</span>
              <span class="battle-result-hp">${p.fainted ? '✕' : `${p.currentHp}hp`}</span>
            </div>
          `).join('')}
        </div>
        <div class="battle-result-col">
          <div class="battle-result-col-label">IA</div>
          ${aiTeam.map(p => `
            <div class="battle-result-poke ${p.fainted ? 'fainted' : ''}">
              <img src="${p.sprite}" alt="${p.name}" />
              <span>${capitalize(p.name)}</span>
              <span class="battle-result-hp">${p.fainted ? '✕' : `${p.currentHp}hp`}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="battle-result-btns">
        <button class="quiz-btn-start" id="battle-btn-again">Revancha</button>
        <button class="quiz-btn-secondary" id="battle-btn-close">Salir</button>
      </div>
    </div>
  `;

  document.getElementById('battle-btn-again').addEventListener('click', () => {
    showBattleScreen('loading');
    const team = typeof getTeam === 'function' ? getTeam() : [];
    initBattle(team);
  });
  document.getElementById('battle-btn-close').addEventListener('click', closeBattle);
}


/* ────────────────────────────────────────────
   LÓGICA DE TURNO
   ──────────────────────────────────────────── */

function bindActions() {
  // Movimientos
  document.querySelectorAll('.battle-move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (battlePhase !== 'player-turn') return;
      const move = JSON.parse(btn.dataset.move);
      playerAttack(move);
    });
  });

  // Cambio de pokémon desde el strip
  document.querySelectorAll('.battle-team-dot:not(.fainted):not(.active)').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = [...dot.parentElement.children].indexOf(dot);
      if (battlePhase === 'switching') {
        switchPlayer(idx);
      }
      // En turno normal también puede cambiar (pierde el turno)
      else if (battlePhase === 'player-turn') {
        switchPlayer(idx);
      }
    });
  });
}

async function playerAttack(move) {
  if (battlePhase !== 'player-turn') return;
  battlePhase = 'animating';

  const player = playerTeam[playerIndex];
  const ai     = aiTeam[aiIndex];
  const damage = calcDamage(player, move, ai);
  const mult   = typeMultiplier(move.type, ai.types);

  addLog(`${capitalize(player.name)} usó ${move.name.replace(/-/g,' ')}!`);
  if (mult >= 2) addLog('¡Es muy eficaz!');
  if (mult < 1 && mult > 0) addLog('No es muy eficaz...');
  if (mult === 0) addLog('No afecta a ' + capitalize(ai.name) + '...');

  // Animar sprite del jugador
  animateAttack('player-sprite');

  await wait(400);

  // Aplicar daño
  ai.currentHp = Math.max(0, ai.currentHp - damage);
  addLog(`${capitalize(ai.name)} recibió ${damage} de daño.`);
  updateHpBar('ai', ai);
  animateHit('ai-sprite');

  updateLog();
  await wait(600);

  // ¿Cayó la IA?
  if (ai.currentHp <= 0) {
    ai.fainted = true;
    addLog(`¡${capitalize(ai.name)} se debilitó!`);
    updateLog();
    animateFaint('ai-sprite');
    await wait(800);

    const nextAi = aiTeam.findIndex(p => !p.fainted);
    if (nextAi === -1) {
      // IA sin pokémon → victoria
      showBattleScreen('result');
      return;
    }
    aiIndex = nextAi;
    addLog(`¡La IA envía a ${capitalize(aiTeam[aiIndex].name)}!`);
    updateLog();
    await wait(500);
    renderBattleScreen(document.getElementById('battle-body'));
    battlePhase = 'player-turn';
    return;
  }

  // Turno de la IA
  await wait(300);
  await aiAttack();
}

async function aiAttack() {
  battlePhase = 'animating';
  const ai     = aiTeam[aiIndex];
  const player = playerTeam[playerIndex];

  // IA elige movimiento con el mayor daño esperado (simple pero efectivo)
  const move = ai.moves.reduce((best, m) => {
    const dmg = calcDamage(ai, m, player);
    return dmg > calcDamage(ai, best, player) ? m : best;
  }, ai.moves[0]);

  const damage = calcDamage(ai, move, player);
  const mult   = typeMultiplier(move.type, player.types);

  addLog(`${capitalize(ai.name)} usó ${move.name.replace(/-/g,' ')}!`);
  if (mult >= 2) addLog('¡Es muy eficaz!');
  if (mult < 1 && mult > 0) addLog('No es muy eficaz...');

  animateAttack('ai-sprite');
  await wait(400);

  player.currentHp = Math.max(0, player.currentHp - damage);
  addLog(`${capitalize(player.name)} recibió ${damage} de daño.`);
  updateHpBar('player', player);
  animateHit('player-sprite');

  updateLog();
  await wait(600);

  // ¿Cayó el jugador?
  if (player.currentHp <= 0) {
    player.fainted = true;
    addLog(`¡${capitalize(player.name)} se debilitó!`);
    updateLog();
    animateFaint('player-sprite');
    await wait(800);
    updateTeamStrip();

    const nextPlayer = playerTeam.findIndex(p => !p.fainted);
    if (nextPlayer === -1) {
      // Jugador sin pokémon → derrota
      showBattleScreen('result');
      return;
    }

    // Forzar cambio
    battlePhase = 'switching';
    addLog('Elige tu siguiente Pokémon.');
    updateLog();
    renderActions();
    updateTeamStrip();
    return;
  }

  battlePhase = 'player-turn';
  updateActions();
}

function switchPlayer(idx) {
  if (idx < 0 || idx >= playerTeam.length) return;
  if (playerTeam[idx].fainted) return;
  if (idx === playerIndex) return;

  const prev = playerTeam[playerIndex];
  playerIndex = idx;
  const next  = playerTeam[playerIndex];

  addLog(`${capitalize(prev.name)}, ¡vuelve!`);
  addLog(`¡${capitalize(next.name)}, yo te elijo!`);
  updateLog();

  battlePhase = 'player-turn';
  renderBattleScreen(document.getElementById('battle-body'));
}


/* ────────────────────────────────────────────
   HELPERS DE UI
   ──────────────────────────────────────────── */

function hpPct(p)   { return Math.round((p.currentHp / p.maxHp) * 100); }
function hpColor(p) {
  const pct = hpPct(p);
  if (pct > 50) return '#4ade80';
  if (pct > 20) return '#facc15';
  return '#f87171';
}

function updateHpBar(side, pokemon) {
  const $bar = document.getElementById(side + '-hp-bar');
  const $num = document.getElementById(side + '-hp-num');
  if ($bar) { $bar.style.width = hpPct(pokemon) + '%'; $bar.style.background = hpColor(pokemon); }
  if ($num) $num.textContent = pokemon.currentHp + '/' + pokemon.maxHp;
}

function updateLog() {
  const $log = document.getElementById('battle-log');
  if (!$log) return;
  $log.innerHTML = moveLog.slice(-3).map(m => `<div class="battle-log-line">${m}</div>`).join('');
  $log.scrollTop = $log.scrollHeight;
}

function updateActions() {
  const $actions = document.getElementById('battle-actions');
  if ($actions) $actions.innerHTML = renderActions(playerTeam[playerIndex]);
  bindActions();
}

function updateTeamStrip() {
  const $strip = document.getElementById('battle-team-strip');
  if ($strip) $strip.innerHTML = renderTeamStrip();
  bindActions();
}

function renderActions(player) {
  if (!player) return '';
  if (battlePhase === 'switching') {
    return `<div class="battle-action-label">Elige tu siguiente Pokémon del equipo ↓</div>`;
  }
  if (battlePhase !== 'player-turn') {
    return `<div class="battle-action-label">...</div>`;
  }
  const moveBtns = player.moves.map(m => `
    <button class="battle-move-btn" data-move='${JSON.stringify(m)}'>
      <span class="battle-move-name">${m.name.replace(/-/g,' ')}</span>
      <span class="battle-move-meta">
        <span class="battle-move-type" style="background:${(window.TYPE_COLORS||TYPE_COLORS_B)[m.type]||'#888'}">${m.type}</span>
        <span class="battle-move-power">⚡${m.power}</span>
      </span>
    </button>
  `).join('');
  return `
    <div class="battle-action-label">¿Qué hará <strong>${capitalize(player.name)}</strong>?</div>
    <div class="battle-moves-grid">${moveBtns}</div>
  `;
}

function addLog(msg) { moveLog.push(msg); }
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ') : ''; }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function animateAttack(spriteId) {
  const $s = document.getElementById(spriteId);
  if (!$s) return;
  $s.classList.add('attack-anim');
  setTimeout(() => $s.classList.remove('attack-anim'), 300);
}

function animateHit(spriteId) {
  const $s = document.getElementById(spriteId);
  if (!$s) return;
  $s.classList.add('hit-anim');
  setTimeout(() => $s.classList.remove('hit-anim'), 500);
}

function animateFaint(spriteId) {
  const $s = document.getElementById(spriteId);
  if (!$s) return;
  $s.classList.add('faint-anim');
}


/* ────────────────────────────────────────────
   RÉCORDS
   ──────────────────────────────────────────── */
function getBattleRecordKey() {
  try {
    const s = JSON.parse(localStorage.getItem('pokedex_session') || 'null');
    return s ? 'pokedex_battle_' + s.email : 'pokedex_battle_guest';
  } catch { return 'pokedex_battle_guest'; }
}

function saveRecord(won) {
  try {
    const rec = JSON.parse(localStorage.getItem(getBattleRecordKey()) || '{"wins":0,"losses":0}');
    if (won) rec.wins++; else rec.losses++;
    localStorage.setItem(getBattleRecordKey(), JSON.stringify(rec));
  } catch {}
}

function getBattleRecord() {
  try {
    return JSON.parse(localStorage.getItem(getBattleRecordKey()) || '{"wins":0,"losses":0}');
  } catch { return { wins: 0, losses: 0 }; }
}


/* ────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────── */
function initBattleModal() {
  if (document.getElementById('battle-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'battle-modal';
  modal.innerHTML = `
    <div id="battle-overlay"></div>
    <div id="battle-panel">
      <div id="battle-header">
        <span id="battle-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Batalla
        </span>
        <div id="battle-record-display"></div>
        <button id="battle-close">✕</button>
      </div>
      <div id="battle-body"></div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('battle-close').addEventListener('click', closeBattle);
  document.getElementById('battle-overlay').addEventListener('click', closeBattle);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && battleOpen) closeBattle();
  });

  // Mostrar récord
  const rec = getBattleRecord();
  const $rec = document.getElementById('battle-record-display');
  if ($rec) $rec.innerHTML = `<span class="battle-record">✦ ${rec.wins}V · ${rec.losses}D</span>`;
}

window.openBattle = openBattle;
document.addEventListener('DOMContentLoaded', initBattleModal);
