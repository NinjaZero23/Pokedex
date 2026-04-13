/* ============================================================
   POKÉDEX — auth.js
   Solo corre en login.html
   ============================================================ */

const USERS_KEY   = 'pokedex_users';
const SESSION_KEY = 'pokedex_session';

/* ── HELPERS ── */
function getUsers()        { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
function saveUsers(u)      { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
function getSession()      { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
function saveSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email })); }

function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = Math.imul(31, h) + pw.charCodeAt(i) | 0; }
  return h.toString(16);
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

/* ── SI YA HAY SESIÓN ACTIVA → IR DIRECTO A LA POKÉDEX ── */
if (getSession()) {
  window.location.replace('index.html');
}

/* ── UI HELPERS ── */
const $msg = document.getElementById('auth-message');

function showMsg(text, type) {
  $msg.textContent = text;
  $msg.className = 'auth-message ' + (type || 'error');
  $msg.style.display = 'block';
}

function hideMsg() { $msg.style.display = 'none'; }

function markInvalid(el) {
  el.classList.add('invalid');
  el.addEventListener('input', () => el.classList.remove('invalid'), { once: true });
}

/* ── TABS ── */
document.querySelectorAll('.auth-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.auth-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(function(f) { f.style.display = 'none'; });
    document.getElementById('tab-' + tab.dataset.tab).style.display = 'flex';
    hideMsg();
  });
});

/* ── MOSTRAR / OCULTAR CONTRASEÑA ── */
document.querySelectorAll('.auth-eye').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var input   = document.getElementById(btn.dataset.target);
    var hidden  = input.type === 'password';
    input.type  = hidden ? 'text' : 'password';
    btn.querySelectorAll('svg')[0].style.display = hidden ? 'none'  : 'block';
    btn.querySelectorAll('svg')[1].style.display = hidden ? 'block' : 'none';
  });
});

/* ── LOGIN ── */
function doLogin() {
  var emailEl = document.getElementById('login-email');
  var passEl  = document.getElementById('login-password');
  var email   = emailEl.value.trim().toLowerCase();
  var pass    = passEl.value;

  hideMsg();

  if (!email)                { showMsg('Ingresa tu correo.');          markInvalid(emailEl); return; }
  if (!isValidEmail(email))  { showMsg('El correo no es válido.');     markInvalid(emailEl); return; }
  if (!pass)                 { showMsg('Ingresa tu contraseña.');      markInvalid(passEl);  return; }

  var users = getUsers();
  var user  = users.find(function(u) { return u.email === email; });

  if (!user)                               { showMsg('No existe cuenta con ese correo.'); markInvalid(emailEl); return; }
  if (user.password !== hashPassword(pass)) { showMsg('Contraseña incorrecta.');          markInvalid(passEl);  return; }

  saveSession(user);
  showMsg('¡Bienvenido, ' + user.name + '! Entrando...', 'success');
  setTimeout(function() { window.location.replace('index.html'); }, 900);
}

document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('login-password').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
document.getElementById('login-email').addEventListener('keydown',    function(e) { if (e.key === 'Enter') document.getElementById('login-password').focus(); });

/* ── REGISTRO ── */
function doRegister() {
  var nameEl    = document.getElementById('reg-name');
  var emailEl   = document.getElementById('reg-email');
  var passEl    = document.getElementById('reg-password');
  var confirmEl = document.getElementById('reg-confirm');

  var name    = nameEl.value.trim();
  var email   = emailEl.value.trim().toLowerCase();
  var pass    = passEl.value;
  var confirm = confirmEl.value;

  hideMsg();

  if (!name || name.length < 2)        { showMsg('Nombre de al menos 2 caracteres.');       markInvalid(nameEl);    return; }
  if (!email || !isValidEmail(email))  { showMsg('Ingresa un correo válido.');               markInvalid(emailEl);   return; }
  if (pass.length < 6)                 { showMsg('La contraseña debe tener 6+ caracteres.'); markInvalid(passEl);    return; }
  if (pass !== confirm)                { showMsg('Las contraseñas no coinciden.');           markInvalid(confirmEl); return; }

  var users = getUsers();
  if (users.find(function(u) { return u.email === email; })) {
    showMsg('Ese correo ya está registrado.'); markInvalid(emailEl); return;
  }

  var newUser = { name: name, email: email, password: hashPassword(pass), createdAt: new Date().toISOString() };
  users.push(newUser);
  saveUsers(users);
  saveSession(newUser);

  showMsg('¡Cuenta creada! Bienvenido, ' + name + '. Entrando...', 'success');
  setTimeout(function() { window.location.replace('index.html'); }, 900);
}

document.getElementById('btn-register').addEventListener('click', doRegister);
document.getElementById('reg-confirm').addEventListener('keydown', function(e) { if (e.key === 'Enter') doRegister(); });
