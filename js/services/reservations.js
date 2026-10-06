window.StilizaReservations = {
  // Lista completa: incluye los productos de cada reserva.
  // Se conserva para las funciones que necesiten el detalle.
  async list(filters = {}) {
    const sb = window.StilizaDB.sb;
    if (!sb) return [];

    let q = sb
      .from('reservations')
      .select('*, reservation_items(*)')
      .order('created_at', { ascending: false });

    if (filters.pickup_status) {
      q = q.eq('pickup_status', filters.pickup_status);
    }

    if (filters.tipo) {
      q = q.eq('tipo', filters.tipo);
    }

    const { data, error } = await q;

    if (error) {
      console.error(error);
      return [];
    }

    return data || [];
  },

  // Lista ligera para el dashboard.
  // No descarga reservation_items ni columnas innecesarias.
  async listSummary() {
    const sb = window.StilizaDB.sb;
    if (!sb) return [];

    const { data, error } = await sb
      .from('reservations')
      .select(`
        id,
        reservation_number,
        customer_name,
        total_amount,
        deposit_amount,
        pickup_status,
        employee_email,
        created_at,
        tipo
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando resumen de reservas:', error);
      return [];
    }

    return data || [];
  },

  async createReservation({
    customer_name,
    customer_phone,
    customer_email,
    items,
    payment_method,
    tipo,
    employee_email
  }) {
    const sb = window.StilizaDB.sb;
    if (!sb) throw new Error('Supabase no configurado');

    const total = items.reduce(
      (s, i) => s + Number(i.unit_price) * Number(i.quantity || 1),
      0
    );

    const isVenta = tipo === 'venta_tienda';
    const deposit = isVenta ? total : total * 0.2;
    const remaining = total - deposit;

    const numero =
      (isVenta ? 'V' : 'R') +
      '-2026-' +
      String(Math.floor(Math.random() * 90000) + 10000);

    const deadline = isVenta
      ? null
      : new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10);

    const session = await sb.auth.getSession();
    const uid = session?.data?.session?.user?.id || null;

    const { data: res, error } = await sb
      .from('reservations')
      .insert({
        reservation_number: numero,
        customer_name,
        customer_phone: customer_phone || '',
        customer_email: customer_email || '',
        total_amount: total,
        deposit_amount: deposit,
        remaining_amount: remaining,
        payment_method: payment_method || 'tarjeta',
        payment_status: 'pagado',
        pickup_status: isVenta ? 'vendido' : 'pendiente',
        tipo: isVenta ? 'venta_tienda' : 'reserva',
        pickup_deadline: deadline,
        employee_email: employee_email || '',
        created_by: uid
      })
      .select()
      .single();

    if (error) throw error;

    const rows = items.map(i => ({
      reservation_id: res.id,
      product_id: i.product_id || null,
      product_name: i.product_name,
      size: i.size || 'M',
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity || 1),
      subtotal:
        Number(i.unit_price) * Number(i.quantity || 1)
    }));

    const { error: e2 } = await sb
      .from('reservation_items')
      .insert(rows);

    if (e2) throw e2;

    const { data: full } = await sb
      .from('reservations')
      .select('*, reservation_items(*)')
      .eq('id', res.id)
      .single();

    return full || res;
  },

  async updateStatus(id, pickup_status) {
    const sb = window.StilizaDB.sb;

    const { data, error } = await sb
      .from('reservations')
      .update({ pickup_status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
};
