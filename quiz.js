/* ============================================================
   POKÉDEX — quiz.js
   Quiz "¿Quién es ese Pokémon?" con siluetas.

   Mecánicas:
   - Sprite en silueta negra, 4 opciones de respuesta
   - 10 preguntas por ronda
   - Puntuación + récord guardado por usuario
   - Dificultad: Gen I (151) o Todos (905)
   - Tiempo límite de 15 segundos por pregunta
   ============================================================ */


/* ────────────────────────────────────────────
   ESTADO
   ──────────────────────────────────────────── */
const QUIZ_TOTAL     = 10;
const QUIZ_TIME      = 15; // segundos por pregunta

let quizOpen       = false;
let quizPokemon    = [];     // pool de pokémon para esta sesión
let currentQ       = 0;
let score          = 0;
let answered       = false;
let timerInterval  = null;
let timeLeft       = QUIZ_TIME;
let currentAnswer  = '';     // nombre correcto de la pregunta actual
let difficulty     = 'gen1'; // 'gen1' | 'all'


/* ────────────────────────────────────────────
   RÉCORDS
   ──────────────────────────────────────────── */
function getRecordKey() {
  try {
    const s = JSON.parse(localStorage.getItem('pokedex_session') || 'null');
    return s ? 'pokedex_quiz_' + s.email : 'pokedex_quiz_guest';
  } catch { return 'pokedex_quiz_guest'; }
}

function getRecord() {
  try {
    return JSON.parse(localStorage.getItem(getRecordKey()) || '{"gen1":0,"all":0}');
  } catch { return { gen1: 0, all: 0 }; }
}

function saveRecord(score, diff) {
  const rec = getRecord();
  if (score > (rec[diff] || 0)) {
    rec[diff] = score;
    localStorage.setItem(getRecordKey(), JSON.stringify(rec));
    return true; // nuevo récord
  }
  return false;
}


/* ────────────────────────────────────────────
   POOL DE POKÉMON
   ──────────────────────────────────────────── */

/** Mezcla un array aleatoriamente (Fisher-Yates) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Construye el pool de pokémon para el quiz.
 * Usa los pokémon ya cargados en la app si coinciden con la dificultad,
 * si no, genera IDs aleatorios.
 */
function buildPool(diff) {
  const allLoaded = window._allPokemon || [];
  let pool = [];

  if (diff === 'gen1') {
    pool = allLoaded.filter(p => p.id <= 151);
    if (pool.length < 20) {
      // Generar desde IDs si no hay suficientes cargados
      pool = Array.from({ length: 151 }, (_, i) => ({ id: i + 1, name: null, sprite: null }));
    }
  } else {
    pool = allLoaded.length >= 50 ? allLoaded : Array.from({ length: 905 }, (_, i) => ({ id: i + 1, name: null, sprite: null }));
  }

  return shuffle(pool);
}


/* ────────────────────────────────────────────
   FETCH DE PREGUNTA
   ──────────────────────────────────────────── */
const quizCache = {};

async function fetchQuizPokemon(idOrName) {
  const key = String(idOrName);
  if (quizCache[key]) return quizCache[key];
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
  if (!r.ok) throw new Error('Error');
  const d = await r.json();
  const result = { id: d.id, name: d.name, sprite: d.sprites.front_default };
  quizCache[key] = result;
  quizCache[d.id] = result;
  return result;
}

/** Genera 4 opciones: 1 correcta + 3 aleatorias del pool */
function generateOptions(correct, pool) {
  const others = pool
    .filter(p => p.name !== correct.name && p.id !== correct.id)
    .slice(0, 20);
  const decoys = shuffle(others).slice(0, 3);

  // Si los señuelos no tienen nombre, usar IDs como placeholder
  const options = [correct, ...decoys].map(p => p.name || `pokemon-${p.id}`);
  return shuffle(options);
}


/* ────────────────────────────────────────────
   ABRIR / CERRAR MODAL
   ──────────────────────────────────────────── */

function openQuiz() {
  quizOpen = true;
  const $modal = document.getElementById('quiz-modal');
  $modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  showQuizScreen('start');
}

function closeQuiz() {
  quizOpen = false;
  clearInterval(timerInterval);
  const $modal = document.getElementById('quiz-modal');
  $modal.classList.remove('open');
  document.body.style.overflow = '';
}

function showQuizScreen(screen) {
  const $body = document.getElementById('quiz-body');
  if (!$body) return;

  if (screen === 'start')   renderStartScreen($body);
  if (screen === 'playing') renderQuestion($body);
  if (screen === 'result')  renderResultScreen($body);
}


/* ────────────────────────────────────────────
   PANTALLA DE INICIO
   ──────────────────────────────────────────── */

function renderStartScreen($body) {
  clearInterval(timerInterval);
  const rec = getRecord();

  $body.innerHTML = `
    <div class="quiz-start">

      <div class="quiz-start-icon">◉</div>
      <h2 class="quiz-start-title">¿Quién es ese Pokémon?</h2>
      <p class="quiz-start-sub">Adivina el pokémon por su silueta.<br>${QUIZ_TOTAL} preguntas · ${QUIZ_TIME}s por pregunta</p>

      <div class="quiz-records">
        <div class="quiz-record-item">
          <span class="quiz-record-label">Récord Gen I</span>
          <span class="quiz-record-val">${rec.gen1 || 0} / ${QUIZ_TOTAL}</span>
        </div>
        <div class="quiz-record-item">
          <span class="quiz-record-label">Récord Todos</span>
          <span class="quiz-record-val">${rec.all || 0} / ${QUIZ_TOTAL}</span>
        </div>
      </div>

      <div class="quiz-diff-label">Dificultad</div>
      <div class="quiz-diff-btns">
        <button class="quiz-diff-btn${difficulty === 'gen1' ? ' active' : ''}" data-diff="gen1">
          Gen I
          <span class="quiz-diff-sub">Pokémon 1–151</span>
        </button>
        <button class="quiz-diff-btn${difficulty === 'all' ? ' active' : ''}" data-diff="all">
          Todos
          <span class="quiz-diff-sub">Pokémon 1–905</span>
        </button>
      </div>

      <button class="quiz-btn-start" id="quiz-btn-start">¡Empezar!</button>

    </div>
  `;

  // Seleccionar dificultad
  $body.querySelectorAll('.quiz-diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      difficulty = btn.dataset.diff;
      $body.querySelectorAll('.quiz-diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Empezar
  document.getElementById('quiz-btn-start').addEventListener('click', startQuiz);
}


/* ────────────────────────────────────────────
   INICIAR QUIZ
   ──────────────────────────────────────────── */

async function startQuiz() {
  currentQ  = 0;
  score     = 0;
  answered  = false;
  quizPokemon = buildPool(difficulty).slice(0, QUIZ_TOTAL + 10); // extra por si falla alguno

  const $body = document.getElementById('quiz-body');
  $body.innerHTML = `<div class="quiz-loading"><div class="pokeball"></div><span>Preparando preguntas...</span></div>`;

  // Pre-cargar los primeros pokémon
  try {
    const first = quizPokemon[0];
    if (!first.sprite) {
      const fetched = await fetchQuizPokemon(first.id);
      quizPokemon[0] = fetched;
    }
    showQuizScreen('playing');
  } catch {
    $body.innerHTML = `<div class="quiz-loading"><p style="color:var(--red)">Error al cargar. Revisa tu conexión.</p></div>`;
  }
}


/* ────────────────────────────────────────────
   RENDERIZAR PREGUNTA
   ──────────────────────────────────────────── */

async function renderQuestion($body) {
  clearInterval(timerInterval);
  answered = false;
  timeLeft = QUIZ_TIME;

  // Obtener pokémon actual
  let current = quizPokemon[currentQ];
  if (!current.sprite || !current.name) {
    try {
      current = await fetchQuizPokemon(current.id);
      quizPokemon[currentQ] = current;
    } catch {
      // Saltar esta pregunta si falla
      currentQ++;
      if (currentQ < QUIZ_TOTAL) {
        renderQuestion($body);
      } else {
        showQuizScreen('result');
      }
      return;
    }
  }

  currentAnswer = current.name;

  // Pre-cargar siguiente en paralelo
  const next = quizPokemon[currentQ + 1];
  if (next && !next.sprite) {
    fetchQuizPokemon(next.id).then(p => { quizPokemon[currentQ + 1] = p; }).catch(() => {});
  }

  // Generar opciones
  const options = generateOptions(current, quizPokemon.slice(0, 40));

  $body.innerHTML = `
    <div class="quiz-question">

      <!-- Progreso y puntuación -->
      <div class="quiz-top">
        <div class="quiz-progress-wrap">
          <div class="quiz-progress-bar" style="width:${(currentQ / QUIZ_TOTAL) * 100}%"></div>
        </div>
        <div class="quiz-meta">
          <span class="quiz-q-num">${currentQ + 1} / ${QUIZ_TOTAL}</span>
          <span class="quiz-score-live">✦ ${score}</span>
        </div>
      </div>

      <!-- Timer -->
      <div class="quiz-timer-wrap">
        <div class="quiz-timer-bar" id="quiz-timer-bar" style="width:100%"></div>
      </div>
      <div class="quiz-timer-num" id="quiz-timer-num">${timeLeft}s</div>

      <!-- Silueta -->
      <div class="quiz-sprite-wrap">
        <img
          id="quiz-sprite"
          class="quiz-sprite silhouette"
          src="${current.sprite}"
          alt="¿Quién es?"
        />
      </div>
      <div class="quiz-question-text">¿Quién es ese Pokémon?</div>

      <!-- Opciones -->
      <div class="quiz-options" id="quiz-options">
        ${options.map(name => `
          <button class="quiz-option" data-name="${name}">
            ${name.replace(/-/g, ' ')}
          </button>
        `).join('')}
      </div>

    </div>
  `;

  // Eventos de opciones
  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn.dataset.name, current));
  });

  // Timer
  startTimer($body, current);
}


/* ────────────────────────────────────────────
   TIMER
   ──────────────────────────────────────────── */

function startTimer($body, current) {
  const $bar = document.getElementById('quiz-timer-bar');
  const $num = document.getElementById('quiz-timer-num');

  timerInterval = setInterval(() => {
    timeLeft--;
    const pct = (timeLeft / QUIZ_TIME) * 100;

    if ($bar) {
      $bar.style.width = pct + '%';
      // Cambiar color según tiempo restante
      if (timeLeft <= 5) $bar.style.background = 'var(--red)';
      else if (timeLeft <= 8) $bar.style.background = '#facc15';
      else $bar.style.background = 'var(--accent)';
    }
    if ($num) $num.textContent = timeLeft + 's';

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!answered) handleAnswer(null, current); // tiempo agotado
    }
  }, 1000);
}


/* ────────────────────────────────────────────
   MANEJAR RESPUESTA
   ──────────────────────────────────────────── */

function handleAnswer(selected, current) {
  if (answered) return;
  answered = true;
  clearInterval(timerInterval);

  const correct = selected === current.name;
  if (correct) score++;

  // Revelar la silueta
  const $sprite = document.getElementById('quiz-sprite');
  if ($sprite) $sprite.classList.remove('silhouette');

  // Marcar opciones
  document.querySelectorAll('.quiz-option').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.name === current.name) {
      btn.classList.add('correct');
    } else if (btn.dataset.name === selected && !correct) {
      btn.classList.add('wrong');
    }
  });

  // Mostrar feedback
  const $q = document.querySelector('.quiz-question');
  if ($q) {
    const feedback = document.createElement('div');
    feedback.className = 'quiz-feedback ' + (correct ? 'correct' : selected ? 'wrong' : 'timeout');
    feedback.textContent = correct
      ? '¡Correcto! +1'
      : selected
        ? `Incorrecto — era ${current.name.replace(/-/g, ' ')}`
        : `¡Tiempo! — era ${current.name.replace(/-/g, ' ')}`;
    $q.appendChild(feedback);
  }

  // Siguiente pregunta automáticamente después de 1.8s
  setTimeout(() => {
    const $body = document.getElementById('quiz-body');
    if (!$body || !quizOpen) return;
    currentQ++;
    if (currentQ < QUIZ_TOTAL) {
      renderQuestion($body);
    } else {
      showQuizScreen('result');
    }
  }, 1800);
}


/* ────────────────────────────────────────────
   PANTALLA DE RESULTADO
   ──────────────────────────────────────────── */

function renderResultScreen($body) {
  clearInterval(timerInterval);
  const isNewRecord = saveRecord(score, difficulty);
  const pct = Math.round((score / QUIZ_TOTAL) * 100);

  // Recompensar créditos si buen resultado
  if (window.rewardQuiz) window.rewardQuiz(score, QUIZ_TOTAL);

  let emoji = '😓';
  let msg   = 'Sigue practicando';
  if (pct >= 90)      { emoji = '🏆'; msg = '¡Maestro Pokémon!'; }
  else if (pct >= 70) { emoji = '⭐'; msg = '¡Muy bien!'; }
  else if (pct >= 50) { emoji = '👍'; msg = 'Nada mal'; }

  $body.innerHTML = `
    <div class="quiz-result">

      <div class="quiz-result-emoji">${emoji}</div>
      <div class="quiz-result-msg">${msg}</div>

      <div class="quiz-result-score">
        <span class="quiz-result-num">${score}</span>
        <span class="quiz-result-total">/ ${QUIZ_TOTAL}</span>
      </div>
      <div class="quiz-result-pct">${pct}% de aciertos</div>

      ${isNewRecord ? `<div class="quiz-new-record">✦ ¡Nuevo récord!</div>` : ''}

      <div class="quiz-result-btns">
        <button class="quiz-btn-secondary" id="quiz-btn-again">Jugar de nuevo</button>
        <button class="quiz-btn-start" id="quiz-btn-menu">Menú principal</button>
      </div>

    </div>
  `;

  document.getElementById('quiz-btn-again').addEventListener('click', startQuiz);
  document.getElementById('quiz-btn-menu').addEventListener('click', () => showQuizScreen('start'));
}


/* ────────────────────────────────────────────
   INIT — crear modal en el DOM
   ──────────────────────────────────────────── */

function initQuiz() {
  if (document.getElementById('quiz-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'quiz-modal';
  modal.innerHTML = `
    <div id="quiz-overlay"></div>
    <div id="quiz-panel">
      <div id="quiz-header">
        <span id="quiz-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Quiz Pokémon
        </span>
        <button id="quiz-close">✕</button>
      </div>
      <div id="quiz-body"></div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('quiz-close').addEventListener('click', closeQuiz);
  document.getElementById('quiz-overlay').addEventListener('click', closeQuiz);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && quizOpen) closeQuiz();
  });
}

// Exponer
window.openQuiz = openQuiz;

document.addEventListener('DOMContentLoaded', initQuiz);
