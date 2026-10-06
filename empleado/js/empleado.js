// Panel empleado — venta multi-vestido + reservas
let itemCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // Auth local: sesión empleado
  const session = (window.StilizaAuth && window.StilizaAuth.obtenerSesion)
    ? window.StilizaAuth.obtenerSesion()
    : JSON.parse(localStorage.getItem('stiliza_session') || 'null');
  if (!session || (session.role !== 'empleado' && session.role !== 'dueno')) {
    location.href = '../index.html';
    return;
  }
  window.__empProfile = session;

  const profile = window.__empProfile;
  const nameEl = document.getElementById('empNombre');
  if (nameEl) nameEl.textContent = profile.full_name || profile.name || profile.email || 'Empleado';

  // tema
  const KEY = 'theme_empleado';
  const saved = localStorage.getItem(KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('toggleThemePanel');
  if (btn) {
    btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    btn.onclick = () => {
      const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', n);
      localStorage.setItem(KEY, n);
      btn.textContent = n === 'dark' ? '☀️' : '🌙';
    };
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const s = item.dataset.section;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.panel-section').forEach(x => x.classList.remove('active'));
      document.getElementById('section-' + s)?.classList.add('active');
      if (s === 'reservas') renderReservasEmp();
      if (s === 'historial') renderHistorial();
    });
  });

  document.querySelectorAll('#section-reservas .filtro-admin').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#section-reservas .filtro-admin').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderReservasEmp(btn.dataset.filtro);
    });
  });

  // Multi items
  document.getElementById('btnAgregarItemVenta')?.addEventListener('click', () => agregarLineaVenta());
  agregarLineaVenta(); // al menos una línea

  document.getElementById('formNuevaVenta')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cliente = document.getElementById('ventaCliente')?.value.trim();
    const telefono = document.getElementById('ventaTelefono')?.value.trim() || '';
    const metodo = document.querySelector('input[name="ventaMetodo"]:checked')?.value || 'efectivo';
    const items = recolectarItemsVenta();
    if (!cliente) return mostrarToast?.('Nombre del cliente requerido', 'warn');
    if (!items.length) return mostrarToast?.('Agrega al menos un vestido', 'warn');

    const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const numero = 'V-2026-' + String(Math.floor(Math.random() * 90000) + 10000);
    const empEmail = profile.email || 'empleado';

    const venta = {
      numero,
      reservation_number: numero,
      cliente,
      customer_name: cliente,
      telefono,
      items: items.map(i => ({
        nombre: i.nombre,
        product_name: i.nombre,
        talla: i.talla,
        size: i.talla,
        precio: i.precio,
        unit_price: i.precio,
        cantidad: i.cantidad,
        quantity: i.cantidad
      })),
      total,
      total_amount: total,
      anticipo: total,
      deposit_amount: total,
      saldo: 0,
      remaining_amount: 0,
      estado: 'vendido',
      pickup_status: 'vendido',
      tipo: 'venta_tienda',
      metodo_pago: metodo,
      payment_method: metodo,
      fecha: new Date().toISOString(),
      created_at: new Date().toISOString(),
      empleado: empEmail,
      employee_email: empEmail
    };

    // Guardar local (y Supabase si está disponible)
    const reservas = JSON.parse(localStorage.getItem('stiliza_reservas') || '[]');
    reservas.push(venta);
    localStorage.setItem('stiliza_reservas', JSON.stringify(reservas));

    try {
      if (window.StilizaReservations?.createReservation) {
        await window.StilizaReservations.createReservation({
          customer_name: cliente,
          customer_phone: telefono,
          items: items.map(i => ({
            product_name: i.nombre,
            size: i.talla,
            unit_price: i.precio,
            quantity: i.cantidad
          })),
          payment_method: metodo,
          tipo: 'venta_tienda',
          employee_email: empEmail
        });
      }
    } catch (err) {
      console.warn('Supabase venta:', err);
    }

    mostrarToast?.('Venta registrada');
    e.target.reset();
    document.getElementById('ventaItemsLista').innerHTML = '';
    itemCount = 0;
    agregarLineaVenta();
    actualizarTotalVenta();

    window.mostrarFactura?.({
      numero,
      cliente,
      telefono,
      items: items.map(i => ({ nombre: i.nombre, talla: i.talla, precio: i.precio, cantidad: i.cantidad })),
      total,
      anticipo: total,
      saldo: 0,
      fecha: new Date(),
      tipo: 'venta',
      payment_method: metodo
    });
    renderReservasEmp();
  });

  await renderReservasEmp();
});

function agregarLineaVenta() {
  const lista = document.getElementById('ventaItemsLista');
  if (!lista) return;
  const id = ++itemCount;
  const div = document.createElement('div');
  div.className = 'venta-item-row';
  div.dataset.line = id;
  div.innerHTML = `
    <div class="form-group" style="flex:2;">
      <label>Vestido</label>
      <input type="text" class="vi-nombre" required placeholder="Nombre del vestido">
    </div>
    <div class="form-group">
      <label>Talla</label>
      <select class="vi-talla">
        <option>XS</option><option>S</option><option selected>M</option><option>L</option><option>XL</option>
      </select>
    </div>
    <div class="form-group">
      <label>Precio (Bs)</label>
      <input type="number" class="vi-precio" min="0" step="0.01" required placeholder="0">
    </div>
    <div class="form-group">
      <label>Cant.</label>
      <input type="number" class="vi-cant" min="1" value="1" required>
    </div>
    <button type="button" class="btn-quitar-linea" title="Quitar">✕</button>
  `;
  lista.appendChild(div);
  div.querySelector('.btn-quitar-linea').onclick = () => {
    if (lista.children.length <= 1) {
      mostrarToast?.('Debe quedar al menos un vestido', 'warn');
      return;
    }
    div.remove();
    actualizarTotalVenta();
  };
  div.querySelectorAll('.vi-precio, .vi-cant').forEach(inp => {
    inp.addEventListener('input', actualizarTotalVenta);
  });
  actualizarTotalVenta();
}

function recolectarItemsVenta() {
  const rows = [...document.querySelectorAll('.venta-item-row')];
  return rows.map(r => {
    const nombre = r.querySelector('.vi-nombre')?.value.trim();
    const talla = r.querySelector('.vi-talla')?.value || 'M';
    const precio = parseFloat(r.querySelector('.vi-precio')?.value) || 0;
    const cantidad = parseInt(r.querySelector('.vi-cant')?.value, 10) || 1;
    return { nombre, talla, precio, cantidad };
  }).filter(i => i.nombre && i.precio > 0);
}

function actualizarTotalVenta() {
  const items = recolectarItemsVenta();
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const el = document.getElementById('ventaTotalLabel');
  if (el) el.textContent = 'Bs ' + total.toFixed(2);
}

async function renderReservasEmp(filtro = 'pendiente') {
  let all = JSON.parse(localStorage.getItem('stiliza_reservas') || '[]');
  const now = Date.now();
  let changed = false;
  all = all.map(r => {
    const st = r.pickup_status || r.estado || 'pendiente';
    const tipo = r.tipo || 'reserva';
    if (st === 'pendiente' && tipo !== 'venta_tienda') {
      const created = new Date(r.created_at || r.fecha || 0).getTime();
      const deadline = r.pickup_deadline ? new Date(r.pickup_deadline).getTime() : (created + 7 * 86400000);
      if (created && now > deadline) {
        r.pickup_status = 'expirado';
        r.estado = 'expirado';
        changed = true;
      }
    }
    return r;
  });
  if (changed) localStorage.setItem('stiliza_reservas', JSON.stringify(all));

  let lista = all;
  if (filtro === 'pendiente') lista = all.filter(r => (r.pickup_status || r.estado) === 'pendiente' && r.tipo !== 'venta_tienda');
  else if (filtro === 'recogido') lista = all.filter(r => (r.pickup_status || r.estado) === 'recogido');
  else if (filtro === 'expirado') lista = all.filter(r => (r.pickup_status || r.estado) === 'expirado');
  else if (filtro === 'vendido') lista = all.filter(r => (r.pickup_status || r.estado) === 'vendido' || r.tipo === 'venta_tienda');

  const cont = document.getElementById('listaReservasEmp');
  if (!cont) return;
  cont.innerHTML = lista.length ? lista.map(r => {
    const num = r.numero || r.reservation_number;
    const st = r.pickup_status || r.estado || 'pendiente';
    const items = r.items || r.reservation_items || [];
    const names = items.map(i => i.nombre || i.product_name).filter(Boolean).join(', ') || r.producto || '';
    return `<div class="reserva-card">
      <div class="reserva-header"><strong>${num}</strong><span class="badge ${st}">${st}</span></div>
      <div class="reserva-body">
        <p><strong>Cliente:</strong> ${r.cliente || r.customer_name}</p>
        <p><strong>Total:</strong> Bs ${Number(r.total || r.total_amount || 0).toFixed(2)}</p>
        <p>${names}</p>
      </div>
      ${st === 'pendiente' ? `<button class="btn btn-primario btn-sm" onclick="marcarRec('${r.id || num}')">✓ Marcar recogido</button>` : ''}
    </div>`;
  }).join('') : '<p class="empty-msg">No hay registros en este filtro</p>';
}


window.marcarRec = async (id) => {
  const reservas = JSON.parse(localStorage.getItem('stiliza_reservas') || '[]');
  const i = reservas.findIndex(r => r.id === id || r.numero === id || r.reservation_number === id);
  if (i >= 0) {
    reservas[i].estado = 'recogido';
    reservas[i].pickup_status = 'recogido';
    localStorage.setItem('stiliza_reservas', JSON.stringify(reservas));
  }
  try {
    if (window.StilizaReservations?.updateStatus && id.length > 20) {
      await window.StilizaReservations.updateStatus(id, 'recogido');
    }
  } catch (_) {}
  mostrarToast?.('Marcado recogido');
  renderReservasEmp();
};

async function renderHistorial() {
  const all = JSON.parse(localStorage.getItem('stiliza_reservas') || '[]');
  const cont = document.getElementById('historialLista');
  if (!cont) return;
  cont.innerHTML = all.slice().reverse().slice(0, 40).map(r => `
    <div class="mini-row" style="padding:0.7rem 0;border-bottom:1px solid var(--border-light);">
      <div><strong>${r.numero || r.reservation_number}</strong>
      <small style="display:block;color:var(--text-muted);">${r.cliente || r.customer_name}</small></div>
      <span class="badge ${r.pickup_status || r.estado}">${r.pickup_status || r.estado}</span>
    </div>`).join('') || '<p class="empty-msg">Sin movimientos</p>';
}
