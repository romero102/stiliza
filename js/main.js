
function renderDestacadosHome() {
  const grid = document.getElementById('gridDestacados');
  if (!grid) return;
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem('stiliza_destacados') || '[]');
  } catch (_) {
    list = [];
  }
  if (!Array.isArray(list) || !list.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:1.5rem;">Pronto verás aquí los vestidos más destacados.</p>';
    window.__destacadosCache = [];
    return;
  }
  window.__destacadosCache = list;
  grid.innerHTML = list.map(p => `
    <div class="producto-card dest-card" data-id="${p.id}" role="button" tabindex="0">
      <div class="producto-imagen" style="${p.imagen ? '' : 'background:linear-gradient(145deg,#f5ede8,#d4a5a5);'}">
        ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre || ''}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        <span class="etiqueta">${p.categoria || 'destacado'}</span>
      </div>
      <div class="producto-info">
        <h3>${p.nombre || 'Vestido'}</h3>
        <p class="desc">${(p.descripcion || '').substring(0, 60)}</p>
        <span class="precio">Bs ${Number(p.precio || 0).toFixed(2)}</span>
        <div class="acciones">
          <button type="button" class="btn-agregar-carrito btn-dest-ver" data-id="${p.id}">Ver detalle</button>
        </div>
      </div>
    </div>`).join('');

  const open = (id) => {
    const prod = (window.__destacadosCache || []).find(x => String(x.id) === String(id));
    if (prod) abrirDetalleDestacado(prod);
  };

  grid.querySelectorAll('.dest-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      open(card.dataset.id);
    });
  });
  grid.querySelectorAll('.btn-dest-ver').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      open(btn.dataset.id);
    });
  });
}

function abrirDetalleDestacado(prod) {
  let modal = document.getElementById('modalDetalleDestacado');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalDetalleDestacado';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-detalle dest-detalle-modal">
        <button type="button" class="cerrar-modal-detalle" id="cerrarDetalleDest">✕</button>
        <div class="detalle-contenido">
          <div class="detalle-imagen" id="destDetImgWrap">
            <img id="destDetImg" src="" alt="">
            <div id="destDetPh" class="detalle-placeholder" style="display:none;">✦</div>
          </div>
          <div class="detalle-info">
            <span class="detalle-categoria" id="destDetCat">Categoría</span>
            <h2 id="destDetNombre">Nombre</h2>
            <p class="detalle-descripcion" id="destDetDesc"></p>
            <p class="detalle-material" id="destDetMaterial"></p>
            <div class="detalle-precio" id="destDetPrecio">Bs 0.00</div>
            <div class="detalle-tallas">
              <span class="tallas-label">Talla</span>
              <div id="destDetTallas" class="tallas-btns"></div>
            </div>
            <button type="button" class="btn-agregar-carrito-detalle" id="btnDestAgregar">
              🛍️ Añadir al carrito
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.getElementById('cerrarDetalleDest').addEventListener('click', () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
    document.getElementById('btnDestAgregar').addEventListener('click', () => {
      const p = window.__destProdActual;
      if (!p) return;
      const talla = modal.querySelector('#destDetTallas .talla-btn.seleccionada')?.dataset.talla;
      if (!talla) {
        mostrarToast?.('Selecciona una talla', 'warn');
        return;
      }
      agregarAlCarrito({
        id: p.id,
        nombre: p.nombre,
        precio: Number(p.precio) || 0,
        talla,
        cantidad: 1,
        imagen: p.imagen || ''
      });
      modal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  window.__destProdActual = prod;

  const img = document.getElementById('destDetImg');
  const ph = document.getElementById('destDetPh');
  if (prod.imagen) {
    img.src = prod.imagen;
    img.style.display = 'block';
    if (ph) ph.style.display = 'none';
  } else {
    img.style.display = 'none';
    if (ph) ph.style.display = 'flex';
  }

  document.getElementById('destDetCat').textContent = prod.categoria || 'destacado';
  document.getElementById('destDetNombre').textContent = prod.nombre || 'Vestido';
  document.getElementById('destDetDesc').textContent = prod.descripcion || '';
  const mat = document.getElementById('destDetMaterial');
  mat.innerHTML = prod.material
    ? `<strong>Material:</strong> ${prod.material}`
    : '';
  document.getElementById('destDetPrecio').textContent = 'Bs ' + Number(prod.precio || 0).toFixed(2);

  const tallas = (prod.tallas && prod.tallas.length) ? prod.tallas : ['S', 'M', 'L'];
  const box = document.getElementById('destDetTallas');
  box.innerHTML = tallas.map(t =>
    `<button type="button" class="talla-btn" data-talla="${t}">${t}</button>`
  ).join('');
  box.querySelectorAll('.talla-btn').forEach(b => {
    b.addEventListener('click', () => {
      box.querySelectorAll('.talla-btn').forEach(x => x.classList.remove('seleccionada'));
      b.classList.add('seleccionada');
    });
  });
  const mid = box.querySelector('[data-talla="M"]') || box.querySelector('.talla-btn');
  mid?.classList.add('seleccionada');

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Carrito persistente entre páginas (catálogo ↔ promociones ↔ inicio)
const CART_KEY = 'stiliza_carrito';

function cargarCarrito() {
  try {
    const raw = sessionStorage.getItem(CART_KEY) || localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function guardarCarrito() {
  try {
    const data = JSON.stringify(carrito);
    sessionStorage.setItem(CART_KEY, data);
    localStorage.setItem(CART_KEY, data);
  } catch (_) {}
}

let carrito = cargarCarrito();

function actualizarBadge() {
  const badge = document.getElementById('carritoBadge');
  if (badge) badge.textContent = carrito.reduce((s, i) => s + (i.cantidad || 1), 0);
}

function renderCarrito() {
  const cont = document.getElementById('carritoContenido');
  if (!cont) return;
  if (!carrito.length) {
    cont.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);"><span style="font-size:2.5rem;">🛍️</span><p>Tu carrito está vacío</p></div>';
    document.getElementById('totalCarrito') && (document.getElementById('totalCarrito').textContent = 'Bs 0.00');
    document.getElementById('anticipoCarrito') && (document.getElementById('anticipoCarrito').textContent = 'Bs 0.00');
    return;
  }
  cont.innerHTML = carrito.map((item, idx) => `
    <div class="carrito-item ${item.esPromo ? 'item-promo' : ''}">
      <div class="carrito-item-info">
        <strong>${item.nombre}${item.esPromo ? ' <span class="tag-promo">PROMO</span>' : ''}</strong>
        <small>${item.esPromo ? 'Promoción especial' : ('Talla: ' + (item.talla || '—'))}</small>
        ${item.precioOriginal ? `<small class="precio-tachado">Bs ${Number(item.precioOriginal).toFixed(2)}</small>` : ''}
      </div>
      <div class="carrito-item-precio">
        <strong>Bs ${(item.precio * item.cantidad).toFixed(2)}</strong>
        <button type="button" class="btn-quitar" onclick="quitarDelCarrito(${idx})">✕</button>
      </div>
    </div>`).join('');
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  document.getElementById('totalCarrito') && (document.getElementById('totalCarrito').textContent = 'Bs ' + total.toFixed(2));
  document.getElementById('anticipoCarrito') && (document.getElementById('anticipoCarrito').textContent = 'Bs ' + (total * 0.2).toFixed(2));
  document.getElementById('totalPago') && (document.getElementById('totalPago').textContent = 'Anticipo: Bs ' + (total * 0.2).toFixed(2));
}

function agregarAlCarrito(item) {
  const ex = carrito.find(i => i.id === item.id && i.talla === item.talla);
  if (ex) ex.cantidad += item.cantidad || 1;
  else carrito.push({ ...item, cantidad: item.cantidad || 1 });
  actualizarBadge();
  mostrarToast?.(`${item.nombre} añadido al carrito`);
}

function quitarDelCarrito(idx) {
  const n = carrito[idx]?.nombre;
  carrito.splice(idx, 1);
  renderCarrito();
  actualizarBadge();
  mostrarToast?.(n ? n + ' eliminado' : 'Eliminado');
}

document.addEventListener('DOMContentLoaded', () => {
  const tema = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', tema);
  const btnTheme = document.getElementById('toggleTheme');
  if (btnTheme) {
    btnTheme.textContent = tema === 'dark' ? '☀️' : '🌙';
    btnTheme.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      btnTheme.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }

  document.getElementById('abrirCarrito')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderCarrito();
    document.getElementById('modalCarrito')?.classList.add('active');
  });
  document.getElementById('cerrarModalCarrito')?.addEventListener('click', () => document.getElementById('modalCarrito')?.classList.remove('active'));
  document.getElementById('vaciarCarrito')?.addEventListener('click', async () => {
    const ok = await confirmarElegante?.({ titulo: '¿Vaciar el carrito?', mensaje: 'Se quitarán todos los vestidos.', okText: 'Sí, vaciar', peligro: true });
    if (ok === false) return;
    carrito = [];
    guardarCarrito();
    renderCarrito();
    actualizarBadge();
    mostrarToast?.('Carrito vacío');
  });
  document.getElementById('procederPago')?.addEventListener('click', () => {
    if (!carrito.length) { mostrarToast?.('Tu carrito está vacío', 'error'); return; }
    document.getElementById('modalCarrito')?.classList.remove('active');
    const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    document.getElementById('totalPago') && (document.getElementById('totalPago').textContent = 'Anticipo: Bs ' + (total * 0.2).toFixed(2));
    document.getElementById('modalPago')?.classList.add('active');
  });
  document.getElementById('cerrarModalPago')?.addEventListener('click', () => document.getElementById('modalPago')?.classList.remove('active'));

  document.querySelectorAll('.metodo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const m = btn.dataset.metodo;
      document.getElementById('formPagoTarjeta')?.classList.toggle('active', m === 'tarjeta');
      document.getElementById('formPagoQR')?.classList.toggle('active', m === 'qr');
    });
  });

  actualizarBadge();
  renderDestacadosHome();
});

window.agregarAlCarrito = agregarAlCarrito;
Object.defineProperty(window, 'carrito', { get() { return carrito; }, set(v) { carrito = v; } });

window.quitarDelCarrito = quitarDelCarrito;
window.renderCarrito = renderCarrito;
window.actualizarBadge = actualizarBadge;

window.vaciarCarritoTrasPago = function () {
  carrito = [];
  guardarCarrito();
  actualizarBadge();
  renderCarrito();
};
