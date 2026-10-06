// Catálogo: productos del dueño (localStorage) + lista por defecto
let productosCache = [];
let productoActual = null;
let tallaActual = null;

const DEFAULT_PRODUCTS = [
  { id: 'd1', nombre: 'Vestido Gala Rubí Nocturno', descripcion: 'Elegante vestido sirena en tono vino.', material: 'Tul, satén y pedrería', precio: 615, categoria: 'gala', imagen: '', tallas: ['XS','S','M','L','XL'] },
  { id: 'd2', nombre: 'Vestido Gala Lavanda Crystal', descripcion: 'Vestido sirena lavanda con pedrería.', material: 'Satén, tul y cristales', precio: 560, categoria: 'gala', imagen: '', tallas: ['S','M','L','XL'] },
  { id: 'd3', nombre: 'Vestido Floral Elegance', descripcion: 'Vestido corto con detalles florales.', material: 'Algodón y gasa', precio: 495, categoria: 'casual', imagen: '', tallas: ['XS','S','M','L'] },
  { id: 'd4', nombre: 'Vestido Pink Elegance', descripcion: 'Vestido corto de satén rosa empolvado.', material: 'Satén', precio: 655, categoria: 'fiesta', imagen: '', tallas: ['XS','S','M','L'] },
  { id: 'd5', nombre: 'Vestido de Novia Imperial Crystal', descripcion: 'Corte sirena con pedrería y cola.', material: 'Encaje, tul y cristales', precio: 1850, categoria: 'boda', imagen: '', tallas: ['S','M','L','XL'] },
  { id: 'd6', nombre: 'Vestido Royal Ruby', descripcion: 'Quinceañera rojo intenso.', material: 'Tul, satén y brillos', precio: 1650, categoria: 'quinceañera', imagen: '', tallas: ['XS','S','M','L','XL'] }
];

function mapAdminProduct(p) {
  return {
    id: p.id,
    nombre: p.nombre || p.name || '',
    descripcion: p.descripcion || p.description || '',
    material: p.material || '',
    precio: Number(p.precio ?? p.price ?? 0),
    categoria: p.categoria || p.category || 'gala',
    imagen: p.imagen || p.image_url || '',
    tallas: p.tallas || p.sizes || ['S', 'M', 'L'],
    activo: p.activo !== false && p.is_active !== false
  };
}

function obtenerProductosCatalogo() {
  try {
    const admin = JSON.parse(localStorage.getItem('stiliza_productos_admin') || '[]');
    if (Array.isArray(admin) && admin.length) {
      const mapped = admin.map(mapAdminProduct).filter(p => p.activo && p.nombre);
      if (mapped.length) return mapped;
    }
  } catch (e) {
    console.warn('catalogo localStorage', e);
  }
  return DEFAULT_PRODUCTS;
}

function renderCatalogo(lista) {
  const grid = document.getElementById('gridCatalogo');
  if (!grid) return;
  if (!lista.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:3rem;">No hay productos en el catálogo.</p>';
    return;
  }
  grid.innerHTML = lista.map(p => `
    <div class="producto-card" data-id="${p.id}" data-categoria="${p.categoria}">
      <div class="producto-imagen" style="${p.imagen ? '' : 'background:linear-gradient(145deg,#f5ede8,#e8d5c8,#d4a5a5);'}">
        ${p.imagen ? `<img src="${p.imagen}" alt="${p.nombre}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        <span class="etiqueta">${p.categoria}</span>
      </div>
      <div class="producto-info">
        <h3>${p.nombre}</h3>
        <p class="desc">${(p.descripcion || '').substring(0, 70)}${(p.descripcion || '').length > 70 ? '…' : ''}</p>
        <span class="precio">Bs ${Number(p.precio).toFixed(2)}</span>
        <div class="acciones">
          <button type="button" class="btn-agregar-carrito" onclick="abrirDetalle('${p.id}')">🛍️ Añadir</button>
          <button type="button" class="btn-detalle" onclick="abrirDetalle('${p.id}')">+ Info</button>
        </div>
      </div>
    </div>`).join('');
}

function setupFiltros() {
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filtro;
      const base = obtenerProductosCatalogo();
      const lista = f === 'todos' ? base : base.filter(p => p.categoria === f);
      renderCatalogo(lista);
    });
  });
}

function abrirDetalle(id) {
  const prod = obtenerProductosCatalogo().find(p => String(p.id) === String(id));
  if (!prod) return;
  productoActual = prod;
  tallaActual = null;
  const cat = document.getElementById('detalleCategoria');
  const nom = document.getElementById('detalleNombre');
  const des = document.getElementById('detalleDescripcion');
  const mat = document.getElementById('detalleMaterial');
  const pre = document.getElementById('detallePrecio');
  if (cat) cat.textContent = prod.categoria;
  if (nom) nom.textContent = prod.nombre;
  if (des) des.textContent = prod.descripcion || '';
  if (mat) mat.innerHTML = prod.material ? `<strong>Material:</strong> ${prod.material}` : '';
  if (pre) pre.textContent = `Bs ${Number(prod.precio).toFixed(2)}`;
  const img = document.getElementById('detalleImagen');
  const ph = document.getElementById('detalleImagenPlaceholder');
  if (img && prod.imagen) {
    img.src = prod.imagen;
    img.style.display = 'block';
    if (ph) ph.style.display = 'none';
  } else if (img) {
    img.style.display = 'none';
    if (ph) ph.style.display = 'flex';
  }
  const tc = document.getElementById('tallasContainer');
  if (tc) {
    tc.innerHTML = (prod.tallas || ['S', 'M', 'L']).map(t =>
      `<button type="button" class="talla-btn" data-talla="${t}" onclick="seleccionarTalla('${t}', this)">${t}</button>`
    ).join('');
  }
  document.getElementById('modalDetalle')?.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (typeof renderSocial === 'function') renderSocial(String(prod.id));
}

function seleccionarTalla(talla, btn) {
  tallaActual = talla;
  document.querySelectorAll('.talla-btn').forEach(b => b.classList.remove('seleccionada'));
  btn.classList.add('seleccionada');
}

function cerrarDetalle() {
  document.getElementById('modalDetalle')?.classList.remove('active');
  document.body.style.overflow = '';
}

function likesKey(id) { return 'stiliza_likes_' + id; }
function commentsKey(id) { return 'stiliza_comments_' + id; }
function getLikes(id) {
  return JSON.parse(localStorage.getItem(likesKey(id)) || '{"count":0,"users":[]}');
}
function toggleLike(id, email) {
  const data = getLikes(id);
  if (!email) return data;
  const i = data.users.indexOf(email);
  if (i >= 0) { data.users.splice(i, 1); data.count = Math.max(0, data.count - 1); }
  else { data.users.push(email); data.count += 1; }
  localStorage.setItem(likesKey(id), JSON.stringify(data));
  return data;
}
function getComments(id) {
  return JSON.parse(localStorage.getItem(commentsKey(id)) || '[]');
}
function addComment(id, email, name, text) {
  const list = getComments(id);
  list.push({ email, name, text, at: new Date().toISOString() });
  localStorage.setItem(commentsKey(id), JSON.stringify(list));
  return list;
}
function renderSocial(prodId) {
  const session = JSON.parse(localStorage.getItem('stiliza_session') || 'null');
  const likes = getLikes(prodId);
  const countEl = document.getElementById('countLike');
  const iconEl = document.getElementById('iconLike');
  if (countEl) countEl.textContent = likes.count;
  if (iconEl) iconEl.textContent = (session && likes.users.includes(session.email)) ? '♥' : '♡';
  const lista = document.getElementById('listaComentarios');
  if (lista) {
    const comments = getComments(prodId);
    lista.innerHTML = comments.length ? comments.map(c => `
      <div class="comentario-item">
        <strong>${c.name || c.email}</strong>
        <small>${new Date(c.at).toLocaleDateString('es-BO')}</small>
        <p>${c.text}</p>
      </div>`).join('') : '<p class="empty-msg" style="font-size:0.85rem;">Sé la primera en comentar</p>';
  }
  const formWrap = document.getElementById('formComentarioWrap');
  const aviso = document.getElementById('avisoComentarioLogin');
  const canComment = session && session.role === 'cliente';
  if (formWrap) formWrap.style.display = canComment ? 'block' : 'none';
  if (aviso) aviso.style.display = canComment ? 'none' : 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  setupFiltros();
  document.getElementById('cerrarModalDetalle')?.addEventListener('click', cerrarDetalle);
  document.getElementById('modalDetalle')?.addEventListener('click', e => {
    if (e.target.id === 'modalDetalle') cerrarDetalle();
  });
  document.getElementById('btnAgregarDetalle')?.addEventListener('click', () => {
    if (!productoActual) return;
    if (!tallaActual) {
      mostrarToast?.('Selecciona una talla', 'warn');
      return;
    }
    if (typeof window.agregarAlCarrito === 'function') {
      window.agregarAlCarrito({
        id: productoActual.id,
        nombre: productoActual.nombre,
        precio: productoActual.precio,
        talla: tallaActual,
        cantidad: 1,
        imagen: productoActual.imagen
      });
    }
    cerrarDetalle();
  });
  document.getElementById('btnLikeVestido')?.addEventListener('click', () => {
    const session = JSON.parse(localStorage.getItem('stiliza_session') || 'null');
    if (!session) {
      mostrarToast?.('Inicia sesión para dar me gusta', 'warn');
      return;
    }
    if (!productoActual) return;
    const data = toggleLike(String(productoActual.id), session.email);
    const cl = document.getElementById('countLike');
    const ic = document.getElementById('iconLike');
    if (cl) cl.textContent = data.count;
    if (ic) ic.textContent = data.users.includes(session.email) ? '♥' : '♡';
    mostrarToast?.(data.users.includes(session.email) ? 'Te gusta este vestido' : 'Me gusta quitado');
  });
  document.getElementById('btnEnviarComentario')?.addEventListener('click', () => {
    const session = JSON.parse(localStorage.getItem('stiliza_session') || 'null');
    if (!session || session.role !== 'cliente') {
      mostrarToast?.('Solo clientes registrados pueden comentar', 'warn');
      return;
    }
    if (!productoActual) return;
    const text = document.getElementById('inputComentario')?.value.trim();
    if (!text) return mostrarToast?.('Escribe un comentario', 'warn');
    addComment(String(productoActual.id), session.email, session.name || session.email, text);
    document.getElementById('inputComentario').value = '';
    renderSocial(String(productoActual.id));
    mostrarToast?.('Comentario publicado');
  });

  productosCache = obtenerProductosCatalogo();
  renderCatalogo(productosCache);
});

window.abrirDetalle = abrirDetalle;
window.seleccionarTalla = seleccionarTalla;
window.obtenerProductosCatalogo = obtenerProductosCatalogo;