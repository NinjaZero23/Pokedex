/* ============================================================
   POKÉDEX — credits.js
   Sistema de créditos para construir tu equipo.

   Rangos de coste por suma de stats base:
   ≤270  →  10 cr  (muy débil, ej: Caterpie, Magikarp)
   ≤370  →  20 cr  (débil,     ej: Pidgey, Rattata evolucionado)
   ≤450  →  35 cr  (normal,    ej: Charizard, Blastoise)
   ≤540  →  55 cr  (fuerte,    ej: Dragonite, Tyranitar)
   >540  →  80 cr  (legendario, ej: Mewtwo, Rayquaza)

   Ganancias:
   +30 cr por victoria en batalla
   +10 cr por derrota (para no frustrar)
   +5  cr por completar el quiz con ≥7/10

   Inicio: 100 créditos gratis
   ============================================================ */


/* ────────────────────────────────────────────
   CLAVE Y CRÉDITOS INICIALES
   ──────────────────────────────────────────── */
const CREDITS_START = 100;

function getCreditsKey() {
  try {
    const s = JSON.parse(localStorage.getItem('pokedex_session') || 'null');
    return s ? 'pokedex_credits_' + s.email : 'pokedex_credits_guest';
  } catch { return 'pokedex_credits_guest'; }
}

function getCredits() {
  const raw = localStorage.getItem(getCreditsKey());
  if (raw === null) {
    // Primera vez — dar créditos iniciales
    saveCredits(CREDITS_START);
    return CREDITS_START;
  }
  return parseInt(raw) || 0;
}

function saveCredits(amount) {
  localStorage.setItem(getCreditsKey(), String(Math.max(0, amount)));
}

function addCredits(amount) {
  const current = getCredits();
  saveCredits(current + amount);
  updateCreditsDisplay();
}

function spendCredits(amount) {
  const current = getCredits();
  if (current < amount) return false;
  saveCredits(current - amount);
  updateCreditsDisplay();
  return true;
}


/* ────────────────────────────────────────────
   CALCULAR COSTE
   ──────────────────────────────────────────── */

/**
 * Calcula el coste en créditos de un pokémon
 * basado en la suma de sus stats base.
 * Si no hay stats disponibles, usa el ID como proxy.
 */
function calcCost(pokemon) {
  let total = 0;

  if (pokemon.stats && pokemon.stats.length > 0) {
    total = pokemon.stats.reduce((s, st) => s + (st.value || st.base_stat || 0), 0);
  } else {
    // Fallback: estimar por ID (pokémon más altos = más fuertes en gen1)
    total = 200 + pokemon.id * 0.5;
  }

  if (total <= 270) return 10;
  if (total <= 370) return 20;
  if (total <= 450) return 35;
  if (total <= 540) return 55;
  return 80;
}

/**
 * Nombre del rango según el coste
 */
function costTier(cost) {
  if (cost <= 10) return { label: 'Muy débil', color: '#9090b0' };
  if (cost <= 20) return { label: 'Débil',     color: '#78C850' };
  if (cost <= 35) return { label: 'Normal',    color: '#6890F0' };
  if (cost <= 55) return { label: 'Fuerte',    color: '#F08030' };
  return              { label: 'Legendario', color: '#facc15' };
}


/* ────────────────────────────────────────────
   DISPLAY EN EL HEADER
   ──────────────────────────────────────────── */

function updateCreditsDisplay() {
  const $el = document.getElementById('credits-display');
  if ($el) $el.textContent = '◈ ' + getCredits() + ' cr';
}

function initCreditsDisplay() {
  // Insertar el display en el header si no existe
  if (document.getElementById('credits-display')) {
    updateCreditsDisplay();
    return;
  }

  const $count = document.getElementById('pokemon-count');
  if (!$count) return;

  const $credits = document.createElement('span');
  $credits.id = 'credits-display';
  $credits.className = 'credits-display';
  $credits.title = 'Tus créditos';
  $credits.textContent = '◈ ' + getCredits() + ' cr';

  // Insertar después del contador
  $count.insertAdjacentElement('afterend', $credits);
}


/* ────────────────────────────────────────────
   INTERCEPTAR BOTÓN DE EQUIPO
   Reemplaza handleTeamButton para cobrar/devolver créditos
   ──────────────────────────────────────────── */

/**
 * Versión original de handleTeamButton guardada para llamarla
 * después de validar los créditos.
 */
let _originalHandleTeamButton = null;

function handleTeamButtonWithCredits(pokemon) {
  const inTeam = typeof isInTeam === 'function' && isInTeam(pokemon.id);

  if (inTeam) {
    // Quitar del equipo → devolver créditos
    const cost = calcCost(pokemon);
    if (typeof removeFromTeam === 'function') removeFromTeam(pokemon.id);
    addCredits(cost);
    if (typeof renderTeamBar === 'function') renderTeamBar();
    if (typeof updateTeamButton === 'function') updateTeamButton(pokemon.id);
    if (typeof updateCardTeamBadge === 'function') updateCardTeamBadge(pokemon.id);
    showCreditToast(`+${cost} cr devueltos`, 'success');
    return;
  }

  // Agregar al equipo → cobrar créditos
  const team = typeof getTeam === 'function' ? getTeam() : [];
  if (team.length >= 6) {
    showCreditToast('¡Equipo lleno! Máximo 6 Pokémon.', 'error');
    return;
  }

  const cost    = calcCost(pokemon);
  const current = getCredits();

  if (current < cost) {
    showCreditToast(`¡Sin créditos! Necesitas ${cost} cr (tienes ${current} cr)`, 'error');
    // Animar el display de créditos para llamar la atención
    const $d = document.getElementById('credits-display');
    if ($d) { $d.classList.add('shake'); setTimeout(() => $d.classList.remove('shake'), 500); }
    return;
  }

  // Cobrar y agregar
  spendCredits(cost);
  if (typeof addToTeam === 'function') addToTeam(pokemon);
  if (typeof renderTeamBar === 'function') renderTeamBar();
  if (typeof updateTeamButton === 'function') updateTeamButton(pokemon.id);
  if (typeof updateCardTeamBadge === 'function') updateCardTeamBadge(pokemon.id);
  showCreditToast(`-${cost} cr · ${pokemon.name} añadido`, 'spent');

  // Actualizar el botón para mostrar el coste al quitar
  setTimeout(() => {
    if (typeof updateTeamButton === 'function') updateTeamButton(pokemon.id);
  }, 100);
}


/* ────────────────────────────────────────────
   ACTUALIZAR BOTÓN CON COSTE
   Muestra el coste en créditos en el botón del panel
   ──────────────────────────────────────────── */

function updateTeamButtonWithCost(pokemonId, pokemon) {
  const $btn = document.getElementById('btn-team');
  if (!$btn) return;

  const inTeam  = typeof isInTeam === 'function' && isInTeam(pokemonId);
  const team    = typeof getTeam === 'function' ? getTeam() : [];
  const full    = team.length >= 6 && !inTeam;
  const cost    = calcCost(pokemon || { id: pokemonId, stats: [] });
  const credits = getCredits();
  const canAfford = credits >= cost;
  const tier    = costTier(cost);

  $btn.classList.toggle('in-team', inTeam);
  $btn.disabled = full || (!inTeam && !canAfford);

  if (inTeam) {
    $btn.innerHTML = `
      <span class="btn-team-icon">✓</span>
      En tu equipo
      <span class="btn-team-cost refund">+${cost} cr al quitar</span>
    `;
  } else if (full) {
    $btn.innerHTML = `<span class="btn-team-icon">⊘</span> Equipo lleno`;
  } else {
    $btn.innerHTML = `
      <span class="btn-team-icon">${canAfford ? '+' : '✕'}</span>
      Agregar al equipo
      <span class="btn-team-cost" style="color:${canAfford ? tier.color : 'var(--red)'}">
        ${cost} cr · ${tier.label}
      </span>
    `;
  }
}


/* ────────────────────────────────────────────
   COSTE EN LA BARRA DE EQUIPO
   Muestra el coste total del equipo
   ──────────────────────────────────────────── */

function renderTeamCostTotal() {
  const team = typeof getTeam === 'function' ? getTeam() : [];
  const total = team.reduce((s, p) => s + calcCost(p), 0);

  const $header = document.getElementById('team-bar-header');
  if (!$header) return;

  let $cost = document.getElementById('team-cost-total');
  if (!$cost) {
    $cost = document.createElement('span');
    $cost.id = 'team-cost-total';
    $cost.className = 'team-cost-total';
    $header.appendChild($cost);
  }
  $cost.textContent = total > 0 ? `${total} cr gastados` : '';
}


/* ────────────────────────────────────────────
   TOAST DE CRÉDITOS
   ──────────────────────────────────────────── */
let creditToastTimer = null;

function showCreditToast(msg, type) {
  let $toast = document.getElementById('credit-toast');
  if (!$toast) {
    $toast = document.createElement('div');
    $toast.id = 'credit-toast';
    document.body.appendChild($toast);
  }
  $toast.textContent = msg;
  $toast.className = 'team-toast show credit-toast-' + (type || '');
  clearTimeout(creditToastTimer);
  creditToastTimer = setTimeout(() => $toast.classList.remove('show'), 2500);
}


/* ────────────────────────────────────────────
   RACHA DIARIA
   Recompensas por días consecutivos:
   Día 1 → +10 cr
   Día 2 → +15 cr
   Día 3 → +20 cr
   Día 4 → +30 cr
   Día 5 → +40 cr
   Día 6 → +50 cr
   Día 7 → +75 cr  (máximo, se reinicia a día 1)
   Si se rompe la racha (falta un día) vuelve a día 1
   ──────────────────────────────────────────── */

const STREAK_REWARDS = [10, 15, 20, 30, 40, 50, 75];

function getStreakKey() {
  try {
    const s = JSON.parse(localStorage.getItem('pokedex_session') || 'null');
    return s ? 'pokedex_streak_' + s.email : 'pokedex_streak_guest';
  } catch { return 'pokedex_streak_guest'; }
}

function getStreakData() {
  try {
    return JSON.parse(localStorage.getItem(getStreakKey()) || 'null');
  } catch { return null; }
}

function saveStreakData(data) {
  localStorage.setItem(getStreakKey(), JSON.stringify(data));
}

/** Devuelve la fecha de hoy como string YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** Devuelve la diferencia en días entre dos strings YYYY-MM-DD */
function daysDiff(a, b) {
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.round((msB - msA) / (1000 * 60 * 60 * 24));
}

/**
 * Comprueba y procesa la racha del día actual.
 * Devuelve null si ya se reclamó hoy,
 * o { reward, streak, isMax, isBroken } si hay recompensa nueva.
 */
function checkDailyStreak() {
  const today = todayStr();
  const data  = getStreakData();

  // Ya reclamado hoy
  if (data && data.lastLogin === today) return null;

  let streak = 1;
  let isBroken = false;

  if (data) {
    const diff = daysDiff(data.lastLogin, today);
    if (diff === 1) {
      // Día consecutivo — mantener racha
      streak = (data.streak % 7) + 1;
    } else if (diff > 1) {
      // Se rompió la racha
      streak = 1;
      isBroken = true;
    }
  }

  const reward = STREAK_REWARDS[streak - 1];
  const isMax  = streak === 7;

  // Guardar nuevo estado
  saveStreakData({ lastLogin: today, streak });

  // Dar los créditos
  addCredits(reward);

  return { reward, streak, isMax, isBroken };
}


/* ────────────────────────────────────────────
   MODAL DE BIENVENIDA / RACHA
   ──────────────────────────────────────────── */

function showStreakModal(result) {
  // Eliminar modal anterior si existe
  const old = document.getElementById('streak-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'streak-modal';

  // Construir los 7 días visualmente
  const days = STREAK_REWARDS.map((r, i) => {
    const dayNum  = i + 1;
    const active  = dayNum === result.streak;
    const claimed = dayNum < result.streak;
    return `
      <div class="streak-day ${active ? 'active' : ''} ${claimed ? 'claimed' : ''}">
        <div class="streak-day-num">Día ${dayNum}</div>
        <div class="streak-day-icon">${dayNum === 7 ? '🏆' : '◈'}</div>
        <div class="streak-day-reward">${r} cr</div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="streak-overlay"></div>
    <div class="streak-panel">

      <div class="streak-header">
        ${result.isBroken
          ? `<div class="streak-title broken">Racha reiniciada</div>
             <div class="streak-sub">No entraste ayer. ¡Vuelve cada día para acumular más!</div>`
          : result.streak === 1
            ? `<div class="streak-title">¡Bienvenido!</div>
               <div class="streak-sub">Entra cada día para ganar más créditos</div>`
            : `<div class="streak-title">¡Racha de ${result.streak} días! ${result.isMax ? '🔥' : ''}</div>
               <div class="streak-sub">${result.isMax ? '¡Racha máxima! Se reinicia mañana' : 'Sigue así para ganar más mañana'}</div>`
        }
      </div>

      <div class="streak-reward-badge">
        <span class="streak-reward-num">+${result.reward}</span>
        <span class="streak-reward-label">créditos</span>
      </div>

      <div class="streak-days">${days}</div>

      <div class="streak-total">
        Tienes <strong>${getCredits()} cr</strong> en total
      </div>

      <button class="streak-btn" id="streak-close-btn">¡A explorar!</button>

    </div>
  `;

  document.body.appendChild(modal);

  // Animar entrada
  requestAnimationFrame(() => modal.classList.add('open'));

  // Cerrar
  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  };

  document.getElementById('streak-close-btn').addEventListener('click', close);
  modal.querySelector('.streak-overlay').addEventListener('click', close);
}


/* ────────────────────────────────────────────
   RECOMPENSAS (actualizar comentario)
   ──────────────────────────────────────────── */

/** Llamar desde battle.js al terminar una batalla */
function rewardBattle(won) {
  const reward = won ? 30 : 10;
  addCredits(reward);
  showCreditToast(
    won ? `+${reward} cr por victoria 🏆` : `+${reward} cr por participar`,
    'success'
  );
}

/** Llamar desde quiz.js al terminar un quiz */
function rewardQuiz(score, total) {
  if (score >= Math.ceil(total * 0.7)) {
    addCredits(5);
    showCreditToast('+5 cr por buen resultado en el quiz ✦', 'success');
  }
}

// Exponer para otros módulos
window.getCredits               = getCredits;
window.addCredits               = addCredits;
window.spendCredits             = spendCredits;
window.calcCost                 = calcCost;
window.rewardBattle             = rewardBattle;
window.rewardQuiz               = rewardQuiz;
window.updateCreditsDisplay     = updateCreditsDisplay;
window.renderTeamCostTotal      = renderTeamCostTotal;
window.updateTeamButtonWithCost = updateTeamButtonWithCost;


/* ────────────────────────────────────────────
   INIT
   ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initCreditsDisplay();

  // Sobreescribir handleTeamButton con la versión que cobra créditos
  window.handleTeamButton = handleTeamButtonWithCredits;

  // Comprobar racha diaria — pequeño delay para que la UI esté lista
  setTimeout(() => {
    const result = checkDailyStreak();
    if (result) showStreakModal(result);
  }, 800);
});
