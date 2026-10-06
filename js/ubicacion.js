// UBICACIÓN - STILIZA

document.addEventListener('DOMContentLoaded', () => {
    // Copiar dirección
    const direccion = document.getElementById('direccionTexto');
    if (direccion) {
        direccion.addEventListener('click', () => {
            const texto = direccion.textContent.trim();
            navigator.clipboard.writeText(texto).then(() => {
                const original = direccion.innerHTML;
                direccion.innerHTML = '✅ ¡Dirección copiada!';
                direccion.style.color = 'var(--accent)';
                setTimeout(() => {
                    direccion.innerHTML = original;
                    direccion.style.color = '';
                }, 2000);
            }).catch(() => {
                alert('Dirección: ' + texto);
            });
        });
    }

    // Tema
    const btnTheme = document.getElementById('toggleTheme');
    if (btnTheme) {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        btnTheme.textContent = current === 'dark' ? '☀️' : '🌙';
    }
});
