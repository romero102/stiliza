// Panel Dueño — Stiliza (productos + empleados + dashboard corregidos)
let productos = [];
let reservas = [];
let empleados = [];
let editId = null;

function esEmpleadoBloqueado(email) {
  const em = String(email || "").toLowerCase();
  // Solo basura conocida, NO bloquear correos reales de empleados
  const ban = ["doristiliza", "empleado@ejemplo"];
  return ban.some((b) => em.includes(b));
}

function limpiarEmpleadosFalsos() {
  try {
    let auth = JSON.parse(
      localStorage.getItem("stiliza_empleados_auth") || "[]",
    );
    const before = auth.length;
    auth = auth.filter((e) => e && e.email && !esEmpleadoBloqueado(e.email));
    if (auth.length !== before)
      localStorage.setItem("stiliza_empleados_auth", JSON.stringify(auth));
  } catch (_) {}
}

/** Comprime imagen base64 para no llenar localStorage (~5MB) */
function comprimirImagen(dataUrl, maxW, calidad) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl || "");
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const max = maxW || 800;
        let w = img.width;
        let h = img.height;
        if (w > max) {
          h = Math.round(h * (max / w));
          w = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", calidad || 0.65));
      } catch (_) {
        resolve("");
      }
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

function safeSetProductos(lista) {
  try {
    localStorage.setItem("stiliza_productos_admin", JSON.stringify(lista));
    return true;
  } catch (err) {
    // Quota: reintentar sin imágenes
    try {
      const light = lista.map((p) => ({
        ...p,
        imagen: "",
        image_url: "",
      }));
      localStorage.setItem("stiliza_productos_admin", JSON.stringify(light));
      if (typeof mostrarToast === "function") {
        mostrarToast(
          "Espacio lleno: productos guardados sin imagen. Usá fotos más pequeñas.",
          "warn",
        );
      } else {
        alert("Espacio lleno: productos guardados sin imagen.");
      }
      return true;
    } catch (e2) {
      if (typeof mostrarToast === "function") {
        mostrarToast(
          "No hay espacio en el navegador. Borrá productos viejos o usá fotos más chicas.",
          "error",
        );
      } else {
        alert("No hay espacio en el navegador (quota).");
      }
      return false;
    }
  }
}

function leerProductosLocal() {
  try {
    const arr = JSON.parse(
      localStorage.getItem("stiliza_productos_admin") || "[]",
    );
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  limpiarEmpleadosFalsos();
  const profile =
    window.StilizaAuth && window.StilizaAuth.requireRole
      ? window.StilizaAuth.requireRole(["dueno"])
      : JSON.parse(localStorage.getItem("stiliza_session") || "null");
  if (!profile || profile.role !== "dueno") {
    location.href =
      (location.pathname.includes("/dueno/") ? "../" : "") + "index.html";
    return;
  }
  const oe = document.getElementById("ownerEmail");
  if (oe) oe.textContent = profile.email || profile.name || "";

  const KEY = "theme_dueno";
  const saved = localStorage.getItem(KEY) || "light";
  document.documentElement.setAttribute("data-theme", saved);
  const btn = document.getElementById("toggleThemePanel");
  if (btn) {
    btn.textContent = saved === "dark" ? "☀️" : "🌙";
    btn.onclick = () => {
      const n =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "light"
          : "dark";
      document.documentElement.setAttribute("data-theme", n);
      localStorage.setItem(KEY, n);
      btn.textContent = n === "dark" ? "☀️" : "🌙";
    };
  }

  document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const s = item.dataset.section;
      if (!s) return;
      document
        .querySelectorAll(".nav-item")
        .forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      document
        .querySelectorAll(".panel-section")
        .forEach((x) => x.classList.remove("active"));
      const sec = document.getElementById("section-" + s);
      if (sec) sec.classList.add("active");
      const titles = {
        dashboard: "Dashboard",
        productos: "Productos",
        reservas: "Reservas",
        empleados: "Empleados",
        estadisticas: "Estadísticas",
        destacados: "Destacados",
        promociones: "Promociones",
        mensajes: "Mensajes",
      };
      const pt = document.getElementById("panelTitle");
      if (pt) pt.textContent = titles[s] || s;
      if (s === "dashboard") await renderDashboard();
      if (s === "productos") await renderProductos();
      if (s === "reservas") await renderReservas();
      if (s === "empleados") await renderEmpleados();
      if (s === "estadisticas") await renderEstadisticas();
      if (s === "mensajes") await renderMensajes();
      if (s === "destacados") renderDestacados();
      if (s === "promociones") renderPromos();
    });
  });

  setupProductos();
  setupEmpleados();
  setupReservasFiltros();
  setupDestacados();
  setupPromos();
  await renderDashboard();
  await renderProductos();
  await renderEmpleados();
});

async function loadData({ refreshReservations = false } = {}) {
  productos = leerProductosLocal();

  try {
    if (!productos.length && window.StilizaProducts?.listAll) {
      const r = await window.StilizaProducts.listAll();
      if (r && r.length) productos = r;
    }
  } catch (e) {
    console.warn("products", e);
  }

  // Solo consultar Supabase cuando realmente necesitamos actualizar las reservas
  if (refreshReservations || !reservas.length) {
    try {
      if (window.StilizaReservations?.listSummary) {
        const r = await window.StilizaReservations.listSummary();
        if (r && r.length) reservas = r;
      }
    } catch (e) {
      console.warn("reservas", e);
    }
  }

  // Si Supabase no devolvió reservas, usar localStorage como respaldo
  if (!reservas.length) {
    try {
      reservas = JSON.parse(localStorage.getItem("stiliza_reservas") || "[]");
    } catch (_) {
      reservas = [];
    }
  }

  try {
    const auth = JSON.parse(
      localStorage.getItem("stiliza_empleados_auth") || "[]",
    );

    empleados = auth
      .filter((e) => e && e.email && !esEmpleadoBloqueado(e.email))
      .map((e) => ({
        email: e.email,
        full_name: e.nombre || e.name || e.email,
        role: "empleado",
      }));
  } catch (_) {
    empleados = [];
  }
}

async function renderDashboard() {
  await loadData();
  // Contar SOLO productos locales reales (no defaults del catálogo)
  const prodsLocal = leerProductosLocal();
  const prodsActivos = prodsLocal.filter(
    (p) =>
      p && p.is_active !== false && p.activo !== false && (p.name || p.nombre),
  ).length;

  const lista = (reservas || []).map((r) => ({
    ...r,
    reservation_number: r.reservation_number || r.numero || "—",
    customer_name: r.customer_name || r.cliente || "Cliente",
    deposit_amount: Number(r.deposit_amount ?? r.anticipo ?? 0),
    total_amount: Number(r.total_amount ?? r.total ?? 0),
    pickup_status: r.pickup_status || r.estado || "pendiente",
    employee_email: r.employee_email || r.empleado || "",
  }));

  const pendientes = lista.filter(
    (r) => r.pickup_status === "pendiente",
  ).length;
  const ingresos = lista.reduce((s, r) => s + r.deposit_amount, 0);

  const elR = document.getElementById("statReservas");
  const elI = document.getElementById("statIngresos");
  const elP = document.getElementById("statProductos");
  const elPend = document.getElementById("statPendientes");
  if (elR) elR.textContent = lista.length;
  if (elI) elI.textContent = "Bs " + ingresos.toFixed(0);
  if (elP) elP.textContent = prodsActivos;
  if (elPend) elPend.textContent = pendientes;

  const cont = document.getElementById("ultimasReservas");
  if (cont) {
    const ultimas = lista
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at || b.fecha || 0) -
          new Date(a.created_at || a.fecha || 0),
      )
      .slice(0, 5);
    cont.innerHTML = ultimas.length
      ? ultimas
          .map(
            (r) => `
      <div class="mini-row">
        <div><strong>${r.reservation_number}</strong><small>${r.customer_name}</small></div>
        <div class="mini-right">
          <span class="badge ${r.pickup_status}">${r.pickup_status}</span>
          <strong>Bs ${r.deposit_amount.toFixed(0)}</strong>
        </div>
      </div>`,
          )
          .join("")
      : '<p class="empty-msg">Sin reservas aún</p>';
  }

  const topBox = document.getElementById("topEmpleado");
  if (topBox) {
    const byEmp = {};
    lista.forEach((r) => {
      const em = r.employee_email;
      if (!em || esEmpleadoBloqueado(em)) return;
      if (!byEmp[em]) byEmp[em] = { count: 0, total: 0 };
      byEmp[em].count += 1;
      byEmp[em].total += r.total_amount || r.deposit_amount;
    });
    const ranking = Object.entries(byEmp).sort(
      (a, b) => b[1].count - a[1].count,
    );
    let empsAuth = [];
    try {
      empsAuth = JSON.parse(
        localStorage.getItem("stiliza_empleados_auth") || "[]",
      );
    } catch (_) {}

    if (!ranking.length) {
      topBox.innerHTML =
        '<p class="empty-msg">Aún no hay ventas registradas por empleados.<br><small>Cuando un empleado registre una venta, aparecerá aquí.</small></p>';
    } else {
      const [email, info] = ranking[0];
      const emp = empsAuth.find((e) => e.email === email);
      const nombre = emp?.nombre || email.split("@")[0];
      const inicial = (nombre || "E")[0].toUpperCase();
      topBox.innerHTML = `
        <div class="top-emp-card">
          <div class="top-emp-avatar">${inicial}</div>
          <div class="top-emp-info">
            <span class="top-emp-label">🏆 Más ventas</span>
            <strong class="top-emp-name">${nombre}</strong>
            <small>${email}</small>
          </div>
          <div class="top-emp-nums">
            <div><span class="num">${info.count}</span><small>ventas</small></div>
            <div><span class="num">Bs ${info.total.toFixed(0)}</span><small>monto</small></div>
          </div>
        </div>`;
    }
  }
}

function setupProductos() {
  const modal = document.getElementById("modalProducto");
  document.getElementById("btnNuevoProducto")?.addEventListener("click", () => {
    editId = null;
    document.getElementById("formProducto")?.reset();
    const hi = document.getElementById("prodImagen");
    if (hi) hi.value = "";
    const prev = document.getElementById("prodImagenPreview");
    if (prev) prev.style.display = "none";
    modal?.classList.add("active");
  });
  document
    .getElementById("cerrarModalProducto")
    ?.addEventListener("click", () => modal?.classList.remove("active"));

  document
    .getElementById("prodImagenFile")
    ?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        mostrarToast?.(
          "Imagen muy pesada. Elegí una de menos de 4 MB.",
          "warn",
        );
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const compressed = await comprimirImagen(ev.target.result, 800, 0.6);
        const hi = document.getElementById("prodImagen");
        if (hi) hi.value = compressed;
        const img = document.getElementById("prodImagenPreviewImg");
        const prev = document.getElementById("prodImagenPreview");
        if (img) img.src = compressed;
        if (prev) prev.style.display = "block";
      };
      reader.readAsDataURL(file);
    });

  document
    .getElementById("formProducto")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tallas = [
        ...document.querySelectorAll(
          "#formProducto .tallas-check input:checked, .tallas-check input:checked",
        ),
      ]
        .map((c) => c.value)
        .filter((v, i, a) => a.indexOf(v) === i);
      let imageData = document.getElementById("prodImagen")?.value || "";
      if (imageData && imageData.length > 400000) {
        imageData = await comprimirImagen(imageData, 600, 0.5);
      }
      const payload = {
        name: document.getElementById("prodNombre").value.trim(),
        description: document.getElementById("prodDesc")?.value.trim() || "",
        material: document.getElementById("prodMaterial")?.value.trim() || "",
        category: document.getElementById("prodCategoria").value,
        price: parseFloat(document.getElementById("prodPrecio").value) || 0,
        image_url: imageData,
        sizes: tallas.length ? tallas : ["S", "M", "L"],
        is_active: true,
      };
      if (!payload.name || payload.price <= 0) {
        mostrarToast?.("Nombre y precio obligatorios", "error");
        return;
      }
      try {
        try {
          if (editId && window.StilizaProducts?.update)
            await window.StilizaProducts.update(editId, payload);
          else if (window.StilizaProducts?.create)
            await window.StilizaProducts.create(payload);
        } catch (err) {
          console.warn(err);
        }

        let local = leerProductosLocal();
        const row = {
          id: editId || "local-" + Date.now(),
          nombre: payload.name,
          name: payload.name,
          descripcion: payload.description,
          description: payload.description,
          material: payload.material,
          categoria: payload.category,
          category: payload.category,
          precio: payload.price,
          price: payload.price,
          imagen: payload.image_url,
          image_url: payload.image_url,
          tallas: payload.sizes,
          sizes: payload.sizes,
          activo: true,
          is_active: true,
        };
        if (editId) {
          const i = local.findIndex((x) => String(x.id) === String(editId));
          if (i >= 0) local[i] = { ...local[i], ...row };
          else local.unshift(row);
        } else {
          local.unshift(row);
        }
        if (!safeSetProductos(local)) return;
        modal?.classList.remove("active");
        mostrarToast?.("Producto guardado");
        await renderProductos();
        await renderDashboard();
      } catch (err) {
        console.error(err);
        mostrarToast?.(err.message || "Error al guardar", "error");
      }
    });
}

async function renderProductos() {
  productos = leerProductosLocal();
  const cont = document.getElementById("listaProductos");
  if (!cont) return;
  if (!productos.length) {
    cont.innerHTML =
      '<p class="empty-msg">No hay productos. Agrega el primero.</p>';
    return;
  }
  cont.innerHTML = `<div class="tabla-productos"><div class="tabla-header"><span>Producto</span><span>Categoría</span><span>Precio</span><span>Estado</span><span>Acciones</span></div>
    ${productos
      .map((p) => {
        const nombre = p.name || p.nombre || "";
        const cat = p.category || p.categoria || "";
        const precio = Number(p.price ?? p.precio ?? 0);
        const activo = p.is_active !== false && p.activo !== false;
        const id = String(p.id || "").replace(/'/g, "");
        return `<div class="tabla-row">
      <div class="prod-nombre"><strong>${nombre}</strong></div>
      <span class="cat-badge">${cat}</span>
      <strong class="precio-cell">Bs ${precio.toFixed(0)}</strong>
      <span class="badge ${activo ? "activo" : "inactivo"}">${activo ? "Activo" : "Oculto"}</span>
      <div class="acciones-cell">
        <button type="button" class="btn-icon" onclick="editarProducto('${id}')">✏️</button>
        <button type="button" class="btn-icon" onclick="toggleProducto('${id}', ${!activo})">${activo ? "👁️" : "🚫"}</button>
        <button type="button" class="btn-icon btn-danger" onclick="eliminarProducto('${id}')">🗑️</button>
      </div></div>`;
      })
      .join("")}</div>`;
}

window.editarProducto = async (id) => {
  const p = leerProductosLocal().find((x) => String(x.id) === String(id));
  if (!p) return;
  editId = id;
  document.getElementById("prodNombre").value = p.name || p.nombre || "";
  document.getElementById("prodDesc").value =
    p.description || p.descripcion || "";
  document.getElementById("prodMaterial").value = p.material || "";
  document.getElementById("prodCategoria").value =
    p.category || p.categoria || "gala";
  document.getElementById("prodPrecio").value = p.price ?? p.precio ?? 0;
  document.getElementById("prodImagen").value = p.image_url || p.imagen || "";
  document.getElementById("modalProducto")?.classList.add("active");
};

window.toggleProducto = async (id, active) => {
  let local = leerProductosLocal();
  const i = local.findIndex((x) => String(x.id) === String(id));
  if (i >= 0) {
    local[i].is_active = active;
    local[i].activo = active;
    safeSetProductos(local);
  }
  try {
    await window.StilizaProducts?.toggleActive?.(id, active);
  } catch (_) {}
  mostrarToast?.("Actualizado");
  await renderProductos();
  await renderDashboard();
};

window.eliminarProducto = async (id) => {
  const ok =
    typeof confirmarElegante === "function"
      ? await confirmarElegante({
          titulo: "¿Eliminar producto?",
          mensaje: "Se quitará del catálogo.",
          okText: "Eliminar",
          peligro: true,
        })
      : confirm("¿Eliminar producto?");
  if (ok === false) return;
  let local = leerProductosLocal().filter((x) => String(x.id) !== String(id));
  safeSetProductos(local);
  try {
    await window.StilizaProducts?.remove?.(id);
  } catch (_) {}
  mostrarToast?.("Eliminado");
  await renderProductos();
  await renderDashboard();
};

function setupReservasFiltros() {
  document
    .querySelectorAll("#section-reservas .filtro-admin")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("#section-reservas .filtro-admin")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderReservas(btn.dataset.filtro);
      });
    });
}

async function renderReservas(filtro = "todas") {
  await loadData();
  let lista = [];
  try {
    lista = JSON.parse(localStorage.getItem("stiliza_reservas") || "[]");
  } catch (_) {}
  lista = lista.map((r) => ({
    ...r,
    reservation_number: r.reservation_number || r.numero,
    customer_name: r.customer_name || r.cliente,
    total_amount: r.total_amount ?? r.total ?? 0,
    deposit_amount: r.deposit_amount ?? r.anticipo ?? 0,
    pickup_status: r.pickup_status || r.estado || "pendiente",
    reservation_items: r.reservation_items || r.items || [],
    tipo: r.tipo || "reserva",
    id: r.id || r.numero || r.reservation_number,
  }));

  const now = Date.now();
  let changed = false;
  lista.forEach((r) => {
    if (r.pickup_status === "pendiente" && r.tipo !== "venta_tienda") {
      const created = new Date(r.created_at || r.fecha || 0).getTime();
      const deadline = r.pickup_deadline
        ? new Date(r.pickup_deadline).getTime()
        : created + 7 * 86400000;
      if (created && now > deadline) {
        r.pickup_status = "expirado";
        r.estado = "expirado";
        changed = true;
      }
    }
  });
  if (changed) {
    try {
      localStorage.setItem("stiliza_reservas", JSON.stringify(lista));
    } catch (_) {}
  }

  if (filtro && filtro !== "todas") {
    lista = lista.filter((r) => {
      const st = r.pickup_status || "pendiente";
      if (filtro === "pendiente")
        return st === "pendiente" && r.tipo !== "venta_tienda";
      if (filtro === "recogido") return st === "recogido";
      if (filtro === "expirado") return st === "expirado";
      return st === filtro;
    });
  }

  const cont = document.getElementById("listaReservas");
  if (!cont) return;
  cont.innerHTML = lista.length
    ? lista
        .map((r) => {
          const items = r.reservation_items || [];
          const names = items
            .map(
              (i) =>
                (i.product_name || i.nombre || "") +
                (i.size || i.talla ? " (" + (i.size || i.talla) + ")" : ""),
            )
            .filter(Boolean)
            .join(", ");
          return `<div class="reserva-admin-card">
      <div class="reserva-admin-header"><strong>${r.reservation_number}</strong><span class="badge ${r.pickup_status}">${r.pickup_status}</span></div>
      <div class="reserva-admin-body">
        <p><strong>Cliente:</strong> ${r.customer_name || "—"}</p>
        <p><strong>Total:</strong> Bs ${Number(r.total_amount).toFixed(2)} · Anticipo: Bs ${Number(r.deposit_amount).toFixed(2)}</p>
        <p>${names || "—"}</p>
      </div>
      <div class="reserva-admin-actions">
        ${
          r.pickup_status === "pendiente"
            ? `<button class="btn btn-primario btn-sm" onclick="setStatusLocal('${r.id}','recogido')">✓ Recogido</button>
        <button class="btn btn-secundario btn-sm" onclick="setStatusLocal('${r.id}','expirado')">Expirar</button>`
            : ""
        }
      </div>
    </div>`;
        })
        .join("")
    : '<p class="empty-msg">No hay registros en este filtro</p>';
}

window.setStatusLocal = async (id, status) => {
  let lista = [];
  try {
    lista = JSON.parse(localStorage.getItem("stiliza_reservas") || "[]");
  } catch (_) {}
  const i = lista.findIndex(
    (r) =>
      String(r.id) === String(id) ||
      String(r.numero) === String(id) ||
      String(r.reservation_number) === String(id),
  );
  if (i >= 0) {
    lista[i].pickup_status = status;
    lista[i].estado = status;
    try {
      localStorage.setItem("stiliza_reservas", JSON.stringify(lista));
    } catch (_) {}
  }
  mostrarToast?.("Estado actualizado");
  await renderReservas(
    document.querySelector("#section-reservas .filtro-admin.active")?.dataset
      .filtro || "todas",
  );
};

/* ========== EMPLEADOS (una sola versión) ========== */
function setupEmpleados() {
  const card = document.getElementById("formEmpleadoCard");
  const form = document.getElementById("formNuevoEmpleado");

  document.getElementById("btnNuevoEmpleado")?.addEventListener("click", () => {
    if (card) card.style.display = "block";
  });
  document.getElementById("cancelarEmpleado")?.addEventListener("click", () => {
    if (card) card.style.display = "none";
  });

  if (!form) {
    console.error("No se encontró #formNuevoEmpleado");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const nombre = (document.getElementById("empNombre")?.value || "").trim();
    const email = (document.getElementById("empEmail")?.value || "")
      .trim()
      .toLowerCase();
    const password = document.getElementById("empPassword")?.value || "";

    if (!nombre || !email) {
      alert("Nombre y correo son obligatorios");
      return;
    }
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    let authList = [];
    try {
      authList = JSON.parse(
        localStorage.getItem("stiliza_empleados_auth") || "[]",
      );
    } catch (_) {
      authList = [];
    }

    if (authList.some((emp) => (emp.email || "").toLowerCase() === email)) {
      alert("Ese correo ya está registrado");
      return;
    }

    authList.push({ email, password, nombre });
    try {
      localStorage.setItem("stiliza_empleados_auth", JSON.stringify(authList));
    } catch (err) {
      alert(
        "No se pudo guardar (espacio del navegador lleno). Liberá espacio y reintentá.",
      );
      return;
    }

    let simple = [];
    try {
      simple = JSON.parse(localStorage.getItem("stiliza_empleados") || "[]");
    } catch (_) {}
    if (
      !simple.some(
        (s) =>
          (typeof s === "string" ? s : s.email || "").toLowerCase() === email,
      )
    ) {
      simple.push(email);
      try {
        localStorage.setItem("stiliza_empleados", JSON.stringify(simple));
      } catch (_) {}
    }

    form.reset();
    if (card) card.style.display = "none";
    await renderEmpleados();
    if (typeof mostrarToast === "function") {
      mostrarToast("Empleado creado. Puede entrar con correo y contraseña");
    } else {
      alert("Empleado creado: " + email);
    }
  });
}

async function renderEmpleados() {
  let authList = [];
  try {
    authList = JSON.parse(
      localStorage.getItem("stiliza_empleados_auth") || "[]",
    );
  } catch (_) {
    authList = [];
  }
  authList = authList.filter(
    (e) => e && e.email && !esEmpleadoBloqueado(e.email),
  );

  empleados = authList.map((e) => ({
    email: e.email,
    full_name: e.nombre || e.name || e.email,
    role: "empleado",
  }));

  const cont = document.getElementById("listaEmpleados");
  if (!cont) return;

  if (!authList.length) {
    cont.innerHTML =
      '<p class="empty-msg">Sin empleados. Crea el primero con correo y contraseña.</p>';
    return;
  }

  cont.innerHTML = authList
    .map((e) => {
      const nombre = e.nombre || e.name || "Empleado";
      const inicial = (nombre || e.email || "E")[0].toUpperCase();
      const safeEmail = String(e.email).replace(/'/g, "\\'");
      return `
    <div class="empleado-row">
      <div class="emp-avatar">${inicial}</div>
      <div class="emp-info">
        <strong>${nombre}</strong>
        <small>${e.email}</small>
      </div>
      <button type="button" class="btn-icon btn-danger" title="Eliminar"
        onclick="eliminarEmpleadoAuth('${safeEmail}')">🗑️</button>
    </div>`;
    })
    .join("");
}

window.eliminarEmpleadoAuth = async (email) => {
  if (!confirm("¿Eliminar empleado " + email + "?")) return;
  let authList = [];
  try {
    authList = JSON.parse(
      localStorage.getItem("stiliza_empleados_auth") || "[]",
    );
  } catch (_) {}
  authList = authList.filter(
    (e) => (e.email || "").toLowerCase() !== String(email).toLowerCase(),
  );
  localStorage.setItem("stiliza_empleados_auth", JSON.stringify(authList));

  let simple = [];
  try {
    simple = JSON.parse(localStorage.getItem("stiliza_empleados") || "[]");
  } catch (_) {}
  simple = simple.filter((e) => {
    const em = typeof e === "string" ? e : e.email || "";
    return em.toLowerCase() !== String(email).toLowerCase();
  });
  localStorage.setItem("stiliza_empleados", JSON.stringify(simple));

  mostrarToast?.("Empleado eliminado");
  await renderEmpleados();
};

async function renderEstadisticas() {
  await loadData();
  let reservasLocal = [];
  try {
    reservasLocal = JSON.parse(
      localStorage.getItem("stiliza_reservas") || "[]",
    );
  } catch (_) {}
  if (reservasLocal.length) reservas = reservasLocal;
  productos = leerProductosLocal();
  let empsAuth = [];
  try {
    empsAuth = JSON.parse(
      localStorage.getItem("stiliza_empleados_auth") || "[]",
    );
  } catch (_) {}

  const conteo = {};
  const imgs = {};
  (productos || []).forEach((p) => {
    const n = p.name || p.nombre;
    if (n) imgs[n] = p.image_url || p.imagen || "";
  });
  (reservas || []).forEach((r) => {
    const items = r.reservation_items || r.items || [];
    if (items.length) {
      items.forEach((i) => {
        const key = i.product_name || i.nombre || "Producto";
        conteo[key] =
          (conteo[key] || 0) + Number(i.quantity || i.cantidad || 1);
        if (i.imagen) imgs[key] = i.imagen;
      });
    } else if (r.producto) {
      conteo[r.producto] = (conteo[r.producto] || 0) + 1;
    }
  });

  const ranking = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  const top3 = ranking.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  const el = document.getElementById("top3Vestidos");
  if (el) {
    el.innerHTML = top3.length
      ? `<div class="top3-grid">${top3
          .map(
            ([n, c], i) => `
          <div class="top3-card rank-${i + 1}">
            <div class="top3-medal">${medals[i]}</div>
            <div class="top3-img">${imgs[n] ? `<img src="${imgs[n]}" alt="">` : "<span>👗</span>"}</div>
            <strong>${n}</strong>
            <span class="top3-cant">${c} venta${c !== 1 ? "s" : ""}</span>
          </div>`,
          )
          .join("")}</div>`
      : '<p class="empty-msg">Aún no hay ventas.</p>';
  }

  const ctx = document.getElementById("chartVestidos");
  if (ctx && window.Chart) {
    if (window.chartV) {
      try {
        window.chartV.destroy();
      } catch (_) {}
    }
    if (ranking.length) {
      window.chartV = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ranking
            .slice(0, 8)
            .map(([n]) => (n.length > 22 ? n.slice(0, 22) + "…" : n)),
          datasets: [
            {
              data: ranking.slice(0, 8).map(([, c]) => c),
              backgroundColor: [
                "#b48b7a",
                "#d4a5a5",
                "#c9a88a",
                "#8b7355",
                "#e8c4b8",
                "#a67c6d",
                "#c4a484",
                "#9c7b6b",
              ],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 12, font: { size: 11 } },
            },
            title: { display: true, text: "Ventas por vestido" },
          },
          cutout: "55%",
        },
      });
    }
  }

  const byEmp = {};
  (reservas || []).forEach((r) => {
    const email = r.employee_email || r.empleado;
    if (!email || esEmpleadoBloqueado(email)) return;
    if (!byEmp[email]) byEmp[email] = { count: 0, items: [] };
    byEmp[email].count++;
    (r.reservation_items || r.items || []).forEach((i) => {
      byEmp[email].items.push(i.product_name || i.nombre);
    });
  });

  const contE = document.getElementById("graficoEmpleados");
  if (contE) {
    const entries = Object.entries(byEmp);
    empsAuth.forEach((e) => {
      if (e.email && !byEmp[e.email])
        entries.push([e.email, { count: 0, items: [] }]);
    });
    const seen = new Set();
    const unique = [];
    entries.forEach(([email, info]) => {
      if (seen.has(email)) return;
      seen.add(email);
      unique.push([email, info]);
    });
    unique.sort((a, b) => b[1].count - a[1].count);
    contE.innerHTML = unique.length
      ? unique
          .map(([email, info]) => {
            const emp = empsAuth.find((e) => e.email === email);
            const name = emp?.nombre || email.split("@")[0];
            return `<div class="emp-stat-card">
        <div class="emp-avatar">${(name || "E")[0].toUpperCase()}</div>
        <div class="emp-stat-info"><strong>${name}</strong><small>${email}</small></div>
        <div class="emp-stat-num"><span class="num">${info.count}</span><small>ventas</small></div>
      </div>`;
          })
          .join("")
      : '<p class="empty-msg">Sin ventas de empleados aún</p>';
  }
}

async function renderMensajes() {
  const cont = document.getElementById("listaMensajes");
  if (!cont) return;
  let msgs = [];
  try {
    msgs = JSON.parse(localStorage.getItem("stiliza_mensajes") || "[]");
  } catch (_) {}
  try {
    const remote = await window.StilizaMessages?.list?.();
    if (remote?.length) msgs = remote;
  } catch (_) {}
  msgs = msgs.slice().reverse();
  cont.innerHTML = msgs.length
    ? msgs
        .map((m) => {
          const texto = encodeURIComponent(
            "Hola " + (m.name || m.nombre || "") + ", te escribe Stiliza.",
          );
          return `<div class="msg-card">
      <div class="msg-header"><strong>${m.name || m.nombre || "Cliente"}</strong>
      <small>${m.fecha || m.created_at ? new Date(m.fecha || m.created_at).toLocaleString("es-BO") : ""}</small></div>
      <p class="msg-email">${m.email || ""}</p>
      <p class="msg-body">${m.message || m.mensaje || ""}</p>
      <div class="msg-actions"><a class="btn btn-primario btn-sm" target="_blank" rel="noopener" href="https://wa.me/59174954029?text=${texto}">WhatsApp</a></div>
    </div>`;
        })
        .join("")
    : '<p class="empty-msg">Aún no hay mensajes de contacto</p>';
}

const PROMO_KEY = "stiliza_promociones";
const DEFAULT_PROMOS = [
  {
    id: "p1",
    title: "Pack Novia + Damas de honor",
    description:
      "Compra el vestido de novia con los de damas y obtén 20% de descuento.",
    discount_percent: 20,
    discount_label: "-20% Pack boda",
    category: "boda",
    image_url: "",
    is_active: true,
    days_total: 30,
    end_date: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "p2",
    title: "Quinceañera de ensueño",
    description:
      "Reserva tu vestido de quinceañera y lleva un accesorio con 15% off.",
    discount_percent: 15,
    discount_label: "-15% XV",
    category: "quinceañera",
    image_url: "",
    is_active: true,
    days_total: 20,
    end_date: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "p3",
    title: "Temporada de fiestas",
    description: "Gala y fiesta: descuentos especiales de temporada.",
    discount_percent: 10,
    discount_label: "-10% Fiesta",
    category: "fiesta",
    image_url: "",
    is_active: true,
    days_total: 15,
    end_date: null,
    created_at: new Date().toISOString(),
  },
];

function daysLeft(p) {
  if (p.end_date) {
    const end = new Date(p.end_date + "T23:59:59");
    return Math.max(0, Math.ceil((end - new Date()) / 86400000));
  }
  if (p.created_at && p.days_total) {
    const start = new Date(p.created_at);
    const end = new Date(start.getTime() + Number(p.days_total) * 86400000);
    return Math.max(0, Math.ceil((end - new Date()) / 86400000));
  }
  return p.days_total || 0;
}

function refreshPromoStatus(list) {
  let changed = false;
  list.forEach((p) => {
    const left = daysLeft(p);
    p.days_left = left;
    if (left <= 0 && p.is_active) {
      p.is_active = false;
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(PROMO_KEY, JSON.stringify(list));
    } catch (_) {}
  }
  return list;
}

function loadPromos() {
  let list = null;
  try {
    list = JSON.parse(localStorage.getItem(PROMO_KEY) || "null");
  } catch (_) {}
  if (!list) {
    list = DEFAULT_PROMOS.map((p) => ({ ...p }));
    try {
      localStorage.setItem(PROMO_KEY, JSON.stringify(list));
    } catch (_) {}
  }
  return refreshPromoStatus(list);
}
function savePromos(list) {
  try {
    localStorage.setItem(PROMO_KEY, JSON.stringify(list));
  } catch (_) {}
}

function setupPromos() {
  const modal = document.getElementById("modalPromo");
  document.getElementById("btnNuevaPromo")?.addEventListener("click", () => {
    window.__editPromoId = null;
    document.getElementById("formPromo")?.reset();
    const pi = document.getElementById("promoImagen");
    if (pi) pi.value = "";
    const prev = document.getElementById("promoImagenPreview");
    if (prev) prev.style.display = "none";
    const dias = document.getElementById("promoDias");
    if (dias) dias.value = "20";
    const tit = document.getElementById("tituloModalPromo");
    if (tit) tit.textContent = "Nueva promoción";
    modal?.classList.add("active");
  });
  document
    .getElementById("cerrarModalPromo")
    ?.addEventListener("click", () => modal?.classList.remove("active"));
  document
    .getElementById("promoImagenFile")
    ?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async (ev) => {
        const compressed = await comprimirImagen(ev.target.result, 700, 0.6);
        document.getElementById("promoImagen").value = compressed;
        document.getElementById("promoImagenPreviewImg").src = compressed;
        document.getElementById("promoImagenPreview").style.display = "block";
      };
      r.readAsDataURL(f);
    });
  document.getElementById("formPromo")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const list = loadPromos();
    const dias =
      parseInt(document.getElementById("promoDias")?.value, 10) || 20;
    const fechaFin = document.getElementById("promoFechaFin")?.value || "";
    const created = new Date().toISOString();
    const payload = {
      id: window.__editPromoId || "p" + Date.now(),
      title: document.getElementById("promoTitulo").value.trim(),
      description: document.getElementById("promoDesc").value.trim(),
      discount_percent:
        parseInt(document.getElementById("promoDescPct").value, 10) || 0,
      discount_label:
        document.getElementById("promoLabel").value.trim() ||
        "-" + (document.getElementById("promoDescPct").value || 0) + "%",
      category: document.getElementById("promoCat").value,
      image_url: document.getElementById("promoImagen").value || "",
      original_price:
        parseFloat(document.getElementById("promoPrecioBase")?.value) || 0,
      is_active: true,
      days_total: dias,
      end_date: fechaFin || null,
      created_at: window.__editPromoId
        ? list.find((x) => x.id === window.__editPromoId)?.created_at || created
        : created,
    };
    if (!fechaFin && dias > 0) {
      const d = new Date();
      d.setDate(d.getDate() + dias);
      payload.end_date = d.toISOString().slice(0, 10);
    }
    if (!payload.title) return mostrarToast?.("Título requerido", "warn");
    const idx = list.findIndex((x) => x.id === payload.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...payload };
    else list.unshift(payload);
    savePromos(list);
    modal?.classList.remove("active");
    mostrarToast?.("Promoción guardada");
    renderPromos();
  });
}

function renderPromos() {
  const list = loadPromos();
  const cont = document.getElementById("listaPromos");
  if (!cont) return;
  if (!list.length) {
    cont.innerHTML =
      '<p class="empty-msg">No hay promociones. Crea la primera.</p>';
    return;
  }
  cont.innerHTML = list
    .map((p) => {
      const left = daysLeft(p);
      const vencida = left <= 0;
      const activa = p.is_active !== false && !vencida;
      return `
    <div class="promo-admin-card ${!activa ? "promo-inactiva" : ""}">
      <div class="promo-admin-img">${p.image_url ? `<img src="${p.image_url}" alt="">` : "<span>🌸</span>"}</div>
      <div class="promo-admin-info">
        <strong>${p.title}</strong>
        <small>${p.discount_label || ""} · ${p.category || ""}</small>
        <p>${(p.description || "").substring(0, 90)}</p>
        <div class="promo-timer ${vencida ? "vencida" : ""}">
          ${vencida ? "⏱ Finalizada" : "⏱ Quedan <strong>" + left + "</strong> día" + (left !== 1 ? "s" : "")}
        </div>
        <span class="badge ${activa ? "activo" : "inactivo"}">${activa ? "Visible" : "Oculta"}</span>
      </div>
      <div class="promo-admin-actions">
        <button type="button" class="btn-icon" onclick="togglePromoVisible('${p.id}')">${activa ? "👁️" : "🚫"}</button>
        <button type="button" class="btn-icon" onclick="editarPromo('${p.id}')">✏️</button>
        <button type="button" class="btn-icon btn-danger" onclick="eliminarPromo('${p.id}')">🗑️</button>
      </div>
    </div>`;
    })
    .join("");
}

window.togglePromoVisible = (id) => {
  const list = loadPromos();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  if (daysLeft(p) <= 0) {
    mostrarToast?.("Esta promoción ya venció.", "warn");
    return;
  }
  p.is_active = !p.is_active;
  savePromos(list);
  renderPromos();
  mostrarToast?.(p.is_active ? "Promoción visible" : "Promoción ocultada");
};

window.editarPromo = (id) => {
  const p = loadPromos().find((x) => x.id === id);
  if (!p) return;
  window.__editPromoId = id;
  document.getElementById("promoTitulo").value = p.title;
  document.getElementById("promoDesc").value = p.description || "";
  document.getElementById("promoDescPct").value = p.discount_percent || 0;
  document.getElementById("promoLabel").value = p.discount_label || "";
  document.getElementById("promoCat").value = p.category || "general";
  if (document.getElementById("promoDias"))
    document.getElementById("promoDias").value =
      p.days_total || daysLeft(p) || 20;
  if (document.getElementById("promoPrecioBase"))
    document.getElementById("promoPrecioBase").value = p.original_price || "";
  if (document.getElementById("promoFechaFin"))
    document.getElementById("promoFechaFin").value = p.end_date || "";
  document.getElementById("promoImagen").value = p.image_url || "";
  if (p.image_url) {
    document.getElementById("promoImagenPreviewImg").src = p.image_url;
    document.getElementById("promoImagenPreview").style.display = "block";
  }
  document.getElementById("tituloModalPromo").textContent = "Editar promoción";
  document.getElementById("modalPromo")?.classList.add("active");
};

window.eliminarPromo = async (id) => {
  if (!confirm("¿Eliminar promoción?")) return;
  savePromos(loadPromos().filter((x) => x.id !== id));
  mostrarToast?.("Promoción eliminada");
  renderPromos();
};

const DEST_KEY = "stiliza_destacados";

function loadDestacados() {
  try {
    return JSON.parse(localStorage.getItem(DEST_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveDestacados(list) {
  try {
    localStorage.setItem(DEST_KEY, JSON.stringify(list));
  } catch (_) {}
}

function setupDestacados() {
  const modal = document.getElementById("modalDestacado");
  document
    .getElementById("btnNuevoDestacado")
    ?.addEventListener("click", () => {
      window.__editDestId = null;
      document.getElementById("formDestacado")?.reset();
      document.getElementById("destImagen").value = "";
      document.querySelectorAll('input[name="destTalla"]').forEach((c) => {
        c.checked = ["S", "M", "L"].includes(c.value);
      });
      const prev = document.getElementById("destImagenPreviewImg");
      if (prev) {
        prev.style.display = "none";
        prev.src = "";
      }
      const ph = document.getElementById("destImgPlaceholder");
      if (ph) ph.style.display = "flex";
      modal?.classList.add("active");
    });
  document
    .getElementById("cerrarModalDestacado")
    ?.addEventListener("click", () => modal?.classList.remove("active"));
  document
    .getElementById("destImagenFile")
    ?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async (ev) => {
        const compressed = await comprimirImagen(ev.target.result, 700, 0.6);
        document.getElementById("destImagen").value = compressed;
        const img = document.getElementById("destImagenPreviewImg");
        if (img) {
          img.src = compressed;
          img.style.display = "block";
        }
        const ph = document.getElementById("destImgPlaceholder");
        if (ph) ph.style.display = "none";
      };
      r.readAsDataURL(f);
    });
  document.getElementById("formDestacado")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const list = loadDestacados();
    const tallas = [
      ...document.querySelectorAll('input[name="destTalla"]:checked'),
    ].map((c) => c.value);
    const payload = {
      id: window.__editDestId || "dest-" + Date.now(),
      nombre: document.getElementById("destNombre").value.trim(),
      descripcion: document.getElementById("destDesc").value.trim(),
      material: document.getElementById("destMaterial")?.value.trim() || "",
      precio: parseFloat(document.getElementById("destPrecio").value) || 0,
      categoria: document.getElementById("destCat").value,
      imagen: document.getElementById("destImagen").value || "",
      tallas: tallas.length ? tallas : ["S", "M", "L"],
    };
    if (!payload.nombre) return mostrarToast?.("Nombre requerido", "warn");
    if (!payload.precio) return mostrarToast?.("Precio requerido", "warn");
    const idx = list.findIndex((x) => x.id === payload.id);
    if (idx >= 0) list[idx] = payload;
    else list.unshift(payload);
    saveDestacados(list);
    modal?.classList.remove("active");
    mostrarToast?.("Destacado guardado");
    renderDestacados();
  });
}

function renderDestacados() {
  const list = loadDestacados();
  const cont = document.getElementById("listaDestacados");
  if (!cont) return;
  cont.innerHTML = list.length
    ? list
        .map(
          (p) => `
    <div class="promo-admin-card">
      <div class="promo-admin-img">${p.imagen ? `<img src="${p.imagen}" alt="">` : "<span>👗</span>"}</div>
      <div class="promo-admin-info">
        <strong>${p.nombre}</strong>
        <small>${p.categoria || ""} · Bs ${Number(p.precio).toFixed(0)}</small>
        <p>${(p.descripcion || "").substring(0, 80)}</p>
      </div>
      <div class="promo-admin-actions">
        <button type="button" class="btn-icon btn-danger" onclick="eliminarDestacado('${p.id}')">🗑️</button>
      </div>
    </div>`,
        )
        .join("")
    : '<p class="empty-msg">Aún no hay destacados.</p>';
}

window.eliminarDestacado = async (id) => {
  if (!confirm("¿Quitar de destacados?")) return;
  saveDestacados(loadDestacados().filter((x) => x.id !== id));
  mostrarToast?.("Quitado de destacados");
  renderDestacados();
};
