const PROMO_KEY = 'stiliza_promociones';
let promoActual = null;

function daysLeft(p) {
  if (p.end_date) {
    const end = new Date(p.end_date + 'T23:59:59');
    if (!isNaN(end.getTime())) return Math.max(0, Math.ceil((end - new Date()) / 86400000));
  }
  if (p.created_at && p.days_total != null) {
    const start = new Date(p.created_at);
    if (!isNaN(start.getTime())) {
      const end = new Date(start.getTime() + Number(p.days_total) * 86400000);
      return Math.max(0, Math.ceil((end - new Date()) / 86400000));
    }
  }
  if (p.is_active !== false && p.days_total) return Number(p.days_total);
  return p.is_active === false ? 0 : 7;
}

function getPromosActivas() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(PROMO_KEY) || '[]'); } catch (_) { list = []; }
  if (!Array.isArray(list)) list = [];
  return list.filter(p => {
    if (p.is_active === false) return false;
    return daysLeft(p) > 0;
  });
}

function precioConDescuento(p) {
  // precio base opcional; si no hay, usamos un valor referencial o 0
  const base = Number(p.original_price || p.price || 0);
  const pct = Number(p.discount_percent || 0);
  if (base > 0 && pct > 0) return Math.round(base * (1 - pct / 100) * 100) / 100;
  return base;
}

function renderPromocionesCliente() {
  const grid =
    document.getElementById('promocionesGrid') ||
    document.getElementById('listaPromociones') ||
    document.querySelector('.promociones-grid');

  if (!grid) return;

  const promos = getPromosActivas();
  const todas = JSON.parse(localStorage.getItem(PROMO_KEY) || '[]');

  if (!promos.length) {
    grid.innerHTML = todas.length
      ? '<p class="empty-msg" style="grid-column:1/-1;text-align:center;padding:2rem;">Las promociones publicadas vencieron o están ocultas.</p>'
      : '<p class="empty-msg" style="grid-column:1/-1;text-align:center;padding:2rem;">Pronto habrá promociones especiales 🌸</p>';
    return;
  }

  grid.innerHTML = promos.map(p => {
    const left = daysLeft(p);
    const pct = Number(p.discount_percent || 0);
    return `
      <article class="promo-card" data-promo-id="${p.id}">
        <div class="promo-card-img">
          ${p.image_url ? `<img src="${p.image_url}" alt="">` : '<span class="promo-emoji">🌸</span>'}
          <span class="promo-badge">${p.discount_label || (pct ? '-' + pct + '%' : 'Promo')}</span>
        </div>
        <div class="promo-card-body">
          <span class="promo-cat">${p.category || 'promoción'}</span>
          <h3>${p.title || 'Promoción'}</h3>
          <p>${p.description || ''}</p>
          <div class="promo-countdown">⏱ Quedan <strong>${left}</strong> día${left !== 1 ? 's' : ''}</div>
          <button type="button" class="btn btn-primario btn-sm btn-promo-cart" data-id="${p.id}">
            🛍️ Añadir al carrito
          </button>
        </div>
      </article>`;
  }).join('');

  grid.querySelectorAll('.btn-promo-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      const promo = getPromosActivas().find(x => String(x.id) === String(id));
      if (promo) abrirModalPromo(promo);
    });
  });

  // click card opens modal
  grid.querySelectorAll('.promo-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-promo-cart')) return;
      const id = card.dataset.promoId;
      const promo = getPromosActivas().find(x => String(x.id) === String(id));
      if (promo) abrirModalPromo(promo);
    });
  });
}

function abrirModalPromo(p) {
  promoActual = p;
  const modal = document.getElementById('modalPromocion');
  if (!modal) {
    agregarPromoAlCarrito(p);
    return;
  }
  const imgBox = document.getElementById('promoImg');
  if (imgBox) {
    if (p.image_url) {
      imgBox.innerHTML = `<img src="${p.image_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`;
    } else {
      imgBox.innerHTML = '<span style="font-size:3rem;">🌸</span>';
      imgBox.style.display = 'flex';
      imgBox.style.alignItems = 'center';
      imgBox.style.justifyContent = 'center';
      imgBox.style.minHeight = '180px';
      imgBox.style.background = 'linear-gradient(145deg,#f5ede8,#d4a5a5)';
      imgBox.style.borderRadius = '16px';
    }
  }
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('promoNombre', p.title || 'Promoción');
  set('promoDesc', p.description || '');
  set('promoBadge', p.discount_label || ('-' + (p.discount_percent || 0) + '%'));
  const left = daysLeft(p);
  set('promoFecha', left > 0 ? `⏱ Quedan ${left} día${left !== 1 ? 's' : ''}` : 'Último día');

  const pct = Number(p.discount_percent || 0);
  const base = Number(p.original_price || p.price || 0);
  const precioEl = document.getElementById('promoPrecios');
  if (precioEl) {
    if (base > 0) {
      const final = precioConDescuento(p);
      precioEl.innerHTML = pct
        ? `<span class="precio-antes">Bs ${base.toFixed(2)}</span> <span class="precio-ahora">Bs ${final.toFixed(2)}</span>`
        : `<span class="precio-ahora">Bs ${base.toFixed(2)}</span>`;
    } else if (pct) {
      precioEl.innerHTML = `<span class="precio-ahora">${pct}% de descuento en tu compra</span>`;
    } else {
      precioEl.innerHTML = `<span class="precio-ahora">${p.discount_label || 'Promoción especial'}</span>`;
    }
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function cerrarModalPromo() {
  document.getElementById('modalPromocion')?.classList.remove('active');
  document.body.style.overflow = '';
  promoActual = null;
}

function agregarPromoAlCarrito(p) {
  if (!p) return;
  const pct = Number(p.discount_percent || 0);
  const base = Number(p.original_price || p.price || 0);
  // Si no hay precio base, usamos un monto simbólico según descuento para que el carrito funcione
  // Mejor: precio final = base con descuento; si no hay base, el item es "promo pack" con precio 0 y etiqueta
  let precioFinal = base > 0 ? precioConDescuento(p) : 0;
  // Permitir precio opcional en modal si el dueño no puso precio: pedir no, usar 0 y mostrar descuento en nombre
  const nombre = pct
    ? `${p.title} (−${pct}%)`
    : (p.title || 'Promoción Stiliza');

  if (typeof window.agregarAlCarrito === 'function') {
    window.agregarAlCarrito({
      id: 'promo-' + p.id,
      nombre,
      precio: precioFinal > 0 ? precioFinal : (base || 0),
      precioOriginal: base || null,
      descuento: pct,
      talla: 'Promo',
      cantidad: 1,
      imagen: p.image_url || '',
      tipo: 'promocion',
      esPromo: true
    });
  } else {
    mostrarToast?.('Carrito no disponible', 'error');
    return;
  }
  cerrarModalPromo();
}

document.addEventListener('DOMContentLoaded', () => {
  renderPromocionesCliente();

  document.getElementById('cerrarModalPromocion')?.addEventListener('click', cerrarModalPromo);
  document.getElementById('modalPromocion')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalPromocion') cerrarModalPromo();
  });
  document.getElementById('btnAgregarPromo')?.addEventListener('click', () => {
    if (promoActual) agregarPromoAlCarrito(promoActual);
  });
});
