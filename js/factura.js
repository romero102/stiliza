function generarFacturaHTML(datos) {
  const esVenta = datos.tipo === 'venta' || datos.tipo === 'venta_tienda';
  const fechaObj = datos.fecha instanceof Date ? datos.fecha : new Date(datos.fecha || Date.now());
  const fechaStr = fechaObj.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
  const items = datos.items || [];
  const filas = items.map(item => {
    const sub = Number(item.precio || item.unit_price) * Number(item.cantidad || item.quantity || 1);
    return `<tr><td>${item.nombre || item.product_name}</td><td class="c">${item.talla || item.size || '—'}</td><td class="r">Bs ${Number(item.precio || item.unit_price).toFixed(2)}</td><td class="c">${item.cantidad || item.quantity || 1}</td><td class="r">Bs ${sub.toFixed(2)}</td></tr>`;
  }).join('');
  const metodoLabel = { efectivo: 'Efectivo', qr: 'QR', tarjeta: 'Tarjeta' }[datos.metodo_pago || datos.payment_method] || (datos.metodo_pago || datos.payment_method || '');
  const resumen = esVenta
    ? `<div class="fac-row"><span>Total pagado</span><span>Bs ${Number(datos.total).toFixed(2)}</span></div>${metodoLabel ? `<div class="fac-row"><span>Método</span><span>${metodoLabel}</span></div>` : ''}<div class="fac-row fac-saldo"><span>Estado</span><span>Pagado · Entrega inmediata</span></div>`
    : `<div class="fac-row"><span>Total de la compra</span><span>Bs ${Number(datos.total).toFixed(2)}</span></div><div class="fac-row fac-anticipo"><span>Anticipo pagado (20%)</span><span>Bs ${Number(datos.anticipo).toFixed(2)}</span></div><div class="fac-row fac-saldo"><span>Saldo pendiente</span><span>Bs ${Number(datos.saldo).toFixed(2)}</span></div>`;
  const aviso = esVenta
    ? `<div class="fac-aviso fac-aviso-venta"><span class="fac-aviso-icon">✓</span><div><strong>Venta en tienda.</strong> Entrega inmediata.</div></div>`
    : `<div class="fac-aviso"><span class="fac-aviso-icon">!</span><div><strong>Importante:</strong> Tiene <strong>7 días</strong> para recoger. Si no recoge, <strong>no hay reembolso del 20%</strong>.</div></div>`;
  return `<div class="fac-paper fac-paper-color" id="facturaPrintable"><div class="fac-logo-area"><img src="${(location.pathname.includes('/dueno')||location.pathname.includes('/empleado')) ? '../' : ''}assets/logo.webp" class="fac-logo" style="max-height:48px;width:auto;" onerror="this.style.display='none'"><div class="fac-brand">Stiliza</div><div class="fac-tagline">VESTIDOS QUE TE DEFINEN</div></div><h1 class="fac-titulo">${esVenta ? 'COMPROBANTE DE VENTA' : 'COMPROBANTE DE RESERVA'}</h1><div class="fac-ornament">✦</div><div class="fac-meta"><div class="fac-cliente"><span class="fac-label">CLIENTE</span><span class="fac-valor">${datos.cliente || ''}</span></div><div class="fac-nums"><div><span class="fac-label">N°</span><span class="fac-valor">${datos.numero}</span></div><div><span class="fac-label">FECHA</span><span class="fac-valor">${fechaStr}</span></div></div></div><table class="fac-tabla"><thead><tr><th>VESTIDO</th><th class="c">TALLA</th><th class="r">PRECIO</th><th class="c">CANT.</th><th class="r">SUBTOTAL</th></tr></thead><tbody>${filas}</tbody></table><div class="fac-resumen">${resumen}</div>${aviso}<div class="fac-footer"><span>📍 Mercado Central Satélite Norte, Warnes</span><span>📞 +591 74954029</span></div></div>`;
}

function mostrarFactura(datos) {
  let cont = document.getElementById('facturaContenido');
  let modal = document.getElementById('modalFactura');
  if (!modal) {
    const o = document.createElement('div');
    o.id = 'modalFactura';
    o.className = 'modal-overlay active';
    o.innerHTML = `<div class="modal-factura"><button class="cerrar-modal" id="cerrarModalFactura">✕</button><div id="facturaContenido"></div><div class="factura-acciones"><button class="btn btn-primario" id="btnImprimirFactura">🖨️ Imprimir / PDF</button><button class="btn btn-secundario" id="cerrarFac2">Cerrar</button></div></div>`;
    document.body.appendChild(o);
    cont = document.getElementById('facturaContenido');
    modal = o;
    document.getElementById('cerrarModalFactura').onclick = () => { o.remove(); document.body.style.overflow = ''; };
    document.getElementById('cerrarFac2').onclick = () => { o.remove(); document.body.style.overflow = ''; };
    document.getElementById('btnImprimirFactura').onclick = imprimirFactura;
  }
  cont.innerHTML = generarFacturaHTML(datos);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function imprimirFactura() {
  const el = document.getElementById('facturaPrintable');
  if (!el) return;
  const w = window.open('', '_blank', 'width=800,height=1000');
  w.document.write(`<!DOCTYPE html><html><head><title>Comprobante</title><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Inter:wght@400;600&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;padding:20px}.fac-paper{max-width:640px;margin:0 auto;background:#fdf8f4;padding:36px;color:#3a322c}.fac-brand{font-family:Playfair Display,serif;font-size:1.8rem;color:#b48b7a;font-style:italic;text-align:center}.fac-titulo{text-align:center;color:#b48b7a;letter-spacing:2px;font-family:Playfair Display,serif}.fac-tabla{width:100%;border-collapse:collapse;font-size:0.88rem}.fac-tabla th{background:#f5ebe4;padding:8px;text-align:left}.fac-tabla td{padding:8px;border-bottom:1px solid #f0e8e0}.c{text-align:center}.r{text-align:right}.fac-resumen{margin-left:auto;width:240px}.fac-row{display:flex;justify-content:space-between;padding:4px 0}.fac-aviso{margin-top:16px;padding:12px;background:#fdf2ed;border-radius:10px;font-size:0.85rem}</style></head><body>${el.outerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

async function generarFacturaCompleta(nombre, telefono, payment_method) {
  const cartItems = Array.from(window.carrito || []);
  if (!cartItems.length) { mostrarToast?.('Carrito vacío', 'error'); return; }

  const items = cartItems.map(i => ({
    product_id: i.id,
    product_name: i.nombre,
    nombre: i.nombre,
    size: i.talla || 'M',
    talla: i.talla || 'M',
    unit_price: i.precio,
    precio: i.precio,
    quantity: i.cantidad || 1,
    cantidad: i.cantidad || 1
  }));
  const total = items.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0);
  const anticipo = Math.round(total * 0.2 * 100) / 100;
  const saldo = Math.round((total - anticipo) * 100) / 100;
  const numero = 'R-2026-' + String(Math.floor(Math.random() * 90000) + 10000);
  const fecha = new Date().toISOString();

  const reserva = {
    id: 'local-' + Date.now(),
    numero,
    reservation_number: numero,
    cliente: nombre,
    customer_name: nombre,
    telefono: telefono || '',
    customer_phone: telefono || '',
    items,
    reservation_items: items,
    total,
    total_amount: total,
    anticipo,
    deposit_amount: anticipo,
    saldo,
    remaining_amount: saldo,
    estado: 'pendiente',
    pickup_status: 'pendiente',
    tipo: 'reserva',
    metodo_pago: payment_method || 'tarjeta',
    payment_method: payment_method || 'tarjeta',
    fecha,
    created_at: fecha
  };

  // Guardar local siempre
  const lista = JSON.parse(localStorage.getItem('stiliza_reservas') || '[]');
  lista.push(reserva);
  localStorage.setItem('stiliza_reservas', JSON.stringify(lista));

  try {
    await window.StilizaReservations?.createReservation?.({
      customer_name: nombre,
      customer_phone: telefono || '',
      items,
      payment_method: payment_method || 'tarjeta',
      tipo: 'reserva'
    });
  } catch (err) {
    console.warn('Supabase reserva:', err);
  }

  // Vaciar carrito persistente
  if (typeof window.vaciarCarritoTrasPago === 'function') window.vaciarCarritoTrasPago();
  else {
    try {
      if (window.carrito) window.carrito = [];
      sessionStorage.removeItem('stiliza_carrito');
      localStorage.removeItem('stiliza_carrito');
    } catch (_) {}
    actualizarBadge?.();
    renderCarrito?.();
  }

  document.getElementById('modalPago')?.classList.remove('active');
  mostrarFactura({
    numero,
    cliente: nombre,
    telefono,
    items: items.map(i => ({
      nombre: i.nombre,
      talla: i.talla,
      precio: i.precio,
      cantidad: i.cantidad
    })),
    total,
    anticipo,
    saldo,
    fecha,
    tipo: 'reserva',
    payment_method: payment_method || 'tarjeta'
  });
  mostrarToast?.('Reserva registrada');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cerrarModalFactura')?.addEventListener('click', () => {
    document.getElementById('modalFactura')?.classList.remove('active');
    document.body.style.overflow = '';
  });
  document.getElementById('btnImprimirFactura')?.addEventListener('click', imprimirFactura);
  document.getElementById('formPagoTarjeta') && (document.getElementById('formPagoTarjeta').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre')?.value.trim();
    const tel = document.getElementById('telefono')?.value.trim() || '';
    if (!nombre) return mostrarToast?.('Ingresa tu nombre', 'error');
    await generarFacturaCompleta(nombre, tel, 'tarjeta');
  });
  document.getElementById('formPagoQR') && (document.getElementById('formPagoQR').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-qr')?.value.trim();
    const tel = document.getElementById('telefono-qr')?.value.trim() || '';
    if (!nombre) return mostrarToast?.('Ingresa tu nombre', 'error');
    await generarFacturaCompleta(nombre, tel, 'qr');
  });
});

window.mostrarFactura = mostrarFactura;
window.generarFacturaCompleta = generarFacturaCompleta;
window.imprimirFactura = imprimirFactura;
window.generarFacturaHTML = generarFacturaHTML;
