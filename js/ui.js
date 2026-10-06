// STILIZA - UI elegante (toasts + confirmaciones)

function mostrarToast(mensaje, tipo = 'ok') {
    document.querySelectorAll('.stiliza-toast').forEach(el => el.remove());
    const icons = { ok: '✓', error: '!', info: '✦', warn: '⚠' };
    const toast = document.createElement('div');
    toast.className = 'stiliza-toast stiliza-toast-' + tipo;
    toast.innerHTML = `<span class="toast-icon">${icons[tipo] || '✦'}</span><span class="toast-msg">${mensaje}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 320);
    }, 2800);
}

function confirmarElegante({ titulo = '¿Confirmar?', mensaje = '', okText = 'Sí, continuar', cancelText = 'Cancelar', peligro = false } = {}) {
    return new Promise((resolve) => {
        document.getElementById('stilizaConfirmOverlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'stilizaConfirmOverlay';
        overlay.className = 'stiliza-confirm-overlay';
        overlay.innerHTML = `
            <div class="stiliza-confirm-box">
                <div class="stiliza-confirm-icon">${peligro ? '🗑️' : '✦'}</div>
                <h3>${titulo}</h3>
                <p>${mensaje}</p>
                <div class="stiliza-confirm-actions">
                    <button type="button" class="btn-confirm-cancel">${cancelText}</button>
                    <button type="button" class="btn-confirm-ok ${peligro ? 'peligro' : ''}">${okText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        const cerrar = (val) => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 250);
            resolve(val);
        };
        overlay.querySelector('.btn-confirm-cancel').onclick = () => cerrar(false);
        overlay.querySelector('.btn-confirm-ok').onclick = () => cerrar(true);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(false); });
    });
}

window.mostrarToast = mostrarToast;
window.confirmarElegante = confirmarElegante;
