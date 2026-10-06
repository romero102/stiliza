document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('formContacto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('contactoNombre')?.value.trim()
      || document.getElementById('nombre')?.value.trim();
    const email = document.getElementById('contactoEmail')?.value.trim()
      || document.getElementById('email')?.value.trim();
    const mensaje = document.getElementById('contactoMensaje')?.value.trim()
      || document.getElementById('mensaje')?.value.trim();
    const telefono = document.getElementById('contactoTelefono')?.value?.trim() || '';

    if (!nombre || !email || !mensaje) {
      mostrarToast?.('Completa todos los campos', 'warn');
      return;
    }

    const msg = {
      id: 'm' + Date.now(),
      name: nombre,
      email,
      phone: telefono,
      message: mensaje,
      fecha: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const list = JSON.parse(localStorage.getItem('stiliza_mensajes') || '[]');
    list.push(msg);
    localStorage.setItem('stiliza_mensajes', JSON.stringify(list));

    try {
      await window.StilizaMessages?.create?.({ name: nombre, email, phone: telefono, message: mensaje });
    } catch (_) {}

    const texto = encodeURIComponent(`*Mensaje Stiliza*\nNombre: ${nombre}\nEmail: ${email}\n\n${mensaje}`);
    window.open(`https://wa.me/59174954029?text=${texto}`, '_blank');
    e.target.reset();
    mostrarToast?.('Mensaje enviado');
  });
});
