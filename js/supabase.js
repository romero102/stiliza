// STILIZA - Cliente Supabase + Auth local por roles
// La URL y anon key están en: js/supabase-config.js
// Orden de scripts en el HTML:
//   1) CDN de Supabase
//   2) js/supabase-config.js
//   3) js/supabase.js

const SUPABASE_URL = (window.STILIZA_SUPABASE && window.STILIZA_SUPABASE.url) || 'https://ldezoxhgecvfxpudsqlb.supabase.co';
const SUPABASE_ANON_KEY = (window.STILIZA_SUPABASE && window.STILIZA_SUPABASE.anonKey) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZXpveGhnZWN2ZnhwdWRzcWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTMwNTgsImV4cCI6MjEwNDcyOTA1OH0.nRBHXgH-pKO0qu9pcFIIddKjql696puiqqRu_CUcdgU';

let supabaseClient = null;

/**
 * Inicializa el cliente de Supabase.
 * Requiere que esté cargado el CDN:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */
function initSupabase() {
    if (supabaseClient) return supabaseClient;

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('[Stiliza] CDN de Supabase no cargado. Auth local sigue funcionando.');
        return null;
    }

    if (!SUPABASE_URL || SUPABASE_URL.includes('TU-PROYECTO') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('TU-ANON')) {
        console.warn('[Stiliza] Configura url y anonKey en js/supabase-config.js');
        return null;
    }

    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Stiliza] Supabase conectado:', SUPABASE_URL);
    } catch (err) {
        console.error('[Stiliza] Error al crear cliente Supabase:', err);
        supabaseClient = null;
    }
    return supabaseClient;
}

function getSupabase() {
    return supabaseClient || initSupabase();
}

const OWNER_EMAIL = 'dueno@stiliza.com';

function getBasePath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/dueno/') || path.includes('/empleado/')) {
        return '../';
    }
    return '';
}

function getRoleFromEmail(email) {
    if (!email) return 'cliente';
    const clean = email.trim().toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const ownerList = ['dueno@stiliza.com', 'dueño@stiliza.com', 'admin@stiliza.com', 'owner@stiliza.com'];
    for (const o of ownerList) {
        const oClean = o.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (clean === oClean) return 'dueno';
    }
    if (clean.includes('dueno') && clean.includes('stiliza')) return 'dueno';

    const empleados = JSON.parse(localStorage.getItem('stiliza_empleados') || '[]');
    const empClean = empleados.map(e => String(e).toLowerCase().trim());
    if (empClean.includes(clean) || empClean.includes(email.trim().toLowerCase())) {
        return 'empleado';
    }
    return 'cliente';
}

function guardarSesion(email, role, name = '') {
    const session = {
        email: email.toLowerCase().trim(),
        role,
        name,
        loginAt: new Date().toISOString()
    };
    localStorage.setItem('stiliza_session', JSON.stringify(session));
    return session;
}

function obtenerSesion() {
    try {
        const data = localStorage.getItem('stiliza_session');
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function cerrarSesion() {
    localStorage.removeItem('stiliza_session');
    const base = getBasePath();
    window.location.href = base + 'index.html';
}

function redirigirSegunRol(role) {
    const base = getBasePath();
    if (role === 'dueno') {
        window.location.href = (base === '' ? 'dueno/index.html' : '../dueno/index.html');
    } else if (role === 'empleado') {
        window.location.href = (base === '' ? 'empleado/empleado.html' : '../empleado/empleado.html');
    } else {
        window.location.href = base + 'index.html';
    }
}

// Auto-init al cargar
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});

window.StilizaAuth = {
    OWNER_EMAIL,
    getRoleFromEmail,
    guardarSesion,
    obtenerSesion,
    cerrarSesion,
    redirigirSegunRol,
    initSupabase,
    getSupabase,
    getBasePath,
    SUPABASE_URL,
    SUPABASE_ANON_KEY
};

window.getSupabase = getSupabase;
window.initSupabase = initSupabase;
