// Login Stiliza — dueño / empleado / cliente
const OWNER_EMAIL = 'dueno@stiliza.com';
const OWNER_PASSWORD = 'STILIZA555$';
const EMP_PASS_KEY = 'stiliza_empleados_auth';

function getEmpleadosAuth() {
  try {
    return JSON.parse(localStorage.getItem(EMP_PASS_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveEmpleadosAuth(list) {
  localStorage.setItem(EMP_PASS_KEY, JSON.stringify(list));
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getRoleFromEmail(email) {
  const clean = normalizeEmail(email);
  if (!clean) return 'cliente';
  if (clean.includes('doristiliza')) return 'cliente';

  if (
    clean === 'dueno@stiliza.com' ||
    clean === 'dueño@stiliza.com' ||
    clean === 'dueno@gmail.com' ||
    (clean.includes('dueno') && clean.includes('stiliza')) ||
    (clean.includes('dueño') && clean.includes('stiliza'))
  ) {
    return 'dueno';
  }

  const emps = getEmpleadosAuth();
  if (emps.some(e => normalizeEmail(e.email) === clean)) return 'empleado';

  const simple = JSON.parse(localStorage.getItem('stiliza_empleados') || '[]');
  if (simple.some(e => {
    if (typeof e === 'string') return normalizeEmail(e) === clean;
    return normalizeEmail(e.email) === clean;
  })) return 'empleado';

  return 'cliente';
}

function guardarSesion(email, role, name = '') {
  const session = {
    email: normalizeEmail(email),
    role,
    name: name || '',
    full_name: name || '',
    loginAt: new Date().toISOString()
  };
  localStorage.setItem('stiliza_session', JSON.stringify(session));
  return session;
}

function obtenerSesion() {
  try {
    return JSON.parse(localStorage.getItem('stiliza_session') || 'null');
  } catch {
    return null;
  }
}

function panelBase() {
  const path = location.pathname.replace(/\\/g, '/');
  if (path.includes('/dueno/') || path.includes('/empleado/')) return '../';
  return '';
}

function cerrarSesion() {
  localStorage.removeItem('stiliza_session');
  if (window.StilizaDB?.sb) {
    try { window.StilizaDB.sb.auth.signOut(); } catch (_) {}
  }
  location.href = panelBase() + 'index.html';
}

function redirigirSegunRol(role) {
  const path = location.pathname.replace(/\\/g, '/');
  const inDueno = path.includes('/dueno/');
  const inEmp = path.includes('/empleado/');

  if (role === 'dueno') {
    if (inDueno) location.href = 'index.html';
    else if (inEmp) location.href = '../dueno/index.html';
    else location.href = 'dueno/index.html';
  } else if (role === 'empleado') {
    if (inEmp) location.href = 'index.html';
    else if (inDueno) location.href = '../empleado/index.html';
    else location.href = 'empleado/index.html';
  } else {
    if (inDueno || inEmp) location.href = '../index.html';
    else location.href = 'index.html';
  }
}

function requireRole(allowed) {
  const session = obtenerSesion();
  if (!session || !allowed.includes(session.role)) {
    location.href = panelBase() + 'index.html';
    return null;
  }
  return session;
}

async function getProfile() {
  return obtenerSesion();
}

function updateAuthUI(session) {
  const btnLogin = document.getElementById('btnAbrirLogin');
  const userInfo = document.getElementById('userInfo');
  if (!userInfo) return;
  if (session) {
    if (btnLogin) btnLogin.style.display = 'none';
    userInfo.style.display = 'flex';
    const go = session.role === 'dueno' || session.role === 'empleado';
    userInfo.innerHTML = `
      <span class="user-email">${session.name || session.email}</span>
      ${go ? `<button type="button" class="btn-login" id="btnIrPanel">Panel</button>` : ''}
      <button type="button" class="btn-logout" id="btnLogout">Salir</button>`;
    document.getElementById('btnLogout')?.addEventListener('click', cerrarSesion);
    document.getElementById('btnIrPanel')?.addEventListener('click', () => redirigirSegunRol(session.role));
  } else {
    if (btnLogin) btnLogin.style.display = '';
    userInfo.style.display = 'none';
    userInfo.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalLogin');
  const form = document.getElementById('formLogin');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const passGroup = document.getElementById('loginPassGroup') || passInput?.closest('.form-group');
  const subtitle = modal?.querySelector('.modal-sub') || modal?.querySelector('.modal-header p');

  if (passGroup) passGroup.style.display = 'none';
  if (passInput) {
    passInput.required = false;
    passInput.value = '';
  }
  if (subtitle) subtitle.textContent = 'Solo necesitas tu correo electrónico';

  let pendingStaff = null;

  document.getElementById('btnAbrirLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    pendingStaff = null;
    if (passGroup) passGroup.style.display = 'none';
    if (passInput) { passInput.required = false; passInput.value = ''; }
    if (subtitle) subtitle.textContent = 'Solo necesitas tu correo electrónico';
    modal?.classList.add('active');
  });
  document.getElementById('cerrarModalLogin')?.addEventListener('click', () => {
    modal?.classList.remove('active');
    pendingStaff = null;
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      pendingStaff = null;
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim() || '';
    const name = document.getElementById('loginName')?.value.trim() || '';
    const password = passInput?.value || '';

    if (!email) {
      mostrarToast?.('Ingresa tu correo', 'warn');
      return;
    }

    if (pendingStaff) {
      if (pendingStaff.role === 'dueno') {
        let ok = password === OWNER_PASSWORD;
        if (!ok && window.StilizaDB?.sb) {
          try {
            const { data, error } = await window.StilizaDB.sb.auth.signInWithPassword({
              email: pendingStaff.email,
              password
            });
            ok = !error && !!data?.session;
          } catch (_) {}
        }
        if (!ok) {
          mostrarToast?.('Contraseña incorrecta', 'error');
          return;
        }
        guardarSesion(pendingStaff.email, 'dueno', pendingStaff.name || 'Dueño');
        modal?.classList.remove('active');
        redirigirSegunRol('dueno');
        return;
      }

      if (pendingStaff.role === 'empleado') {
        const mail = normalizeEmail(pendingStaff.email);
        const emps = getEmpleadosAuth();
        const emp = emps.find(e => normalizeEmail(e.email) === mail);
        let ok = !!(emp && String(emp.password) === String(password));
        if (!ok && window.StilizaDB?.sb) {
          try {
            const { data, error } = await window.StilizaDB.sb.auth.signInWithPassword({
              email: mail,
              password
            });
            ok = !error && !!data?.session;
          } catch (_) {}
        }
        if (!ok) {
          mostrarToast?.('Contraseña incorrecta o empleado no registrado', 'error');
          return;
        }
        const nombre = emp?.nombre || pendingStaff.name || mail;
        guardarSesion(mail, 'empleado', nombre);
        modal?.classList.remove('active');
        redirigirSegunRol('empleado');
        return;
      }
    }

    const role = getRoleFromEmail(email);

    if (role === 'dueno' || role === 'empleado') {
      pendingStaff = { email, role, name };
      if (passGroup) passGroup.style.display = 'block';
      if (passInput) {
        passInput.required = true;
        passInput.value = '';
        passInput.focus();
      }
      if (subtitle) subtitle.textContent = 'Confirma tu acceso con la contraseña';
      mostrarToast?.('Ingresa tu contraseña para continuar', 'info');
      return;
    }

    const sb = window.StilizaDB?.sb;
    if (sb) {
      const tempPassword = 'StilizaClientPassword123*';
      try {
        let authRes = await sb.auth.signUp({
          email: normalizeEmail(email),
          password: tempPassword,
          options: { data: { full_name: name || 'Cliente Stiliza', role: 'cliente' } }
        });
        if (authRes.error && String(authRes.error.message || '').toLowerCase().includes('already')) {
          try {
            await sb.auth.signInWithPassword({
              email: normalizeEmail(email),
              password: tempPassword
            });
          } catch (_) {}
        }
      } catch (_) {}
    }

    guardarSesion(email, 'cliente', name);
    try {
      const clientes = JSON.parse(localStorage.getItem('stiliza_clientes') || '[]');
      if (!clientes.some(c => c.email === normalizeEmail(email))) {
        clientes.push({ email: normalizeEmail(email), name, at: new Date().toISOString() });
        localStorage.setItem('stiliza_clientes', JSON.stringify(clientes));
      }
    } catch (_) {}
    mostrarToast?.('¡Listo!');
    modal?.classList.remove('active');
    updateAuthUI(obtenerSesion());
  });

  updateAuthUI(obtenerSesion());
});

window.StilizaAuth = {
  OWNER_EMAIL,
  OWNER_PASSWORD,
  getRoleFromEmail,
  guardarSesion,
  obtenerSesion,
  cerrarSesion,
  redirigirSegunRol,
  requireRole,
  getProfile,
  getEmpleadosAuth,
  saveEmpleadosAuth,
  updateAuthUI
};