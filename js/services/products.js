window.StilizaProducts = {
  async listActive() {
    const sb = window.StilizaDB.sb;
    if (!sb) return [];
    const { data, error } = await sb.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },
  async listAll() {
    const sb = window.StilizaDB.sb;
    if (!sb) return [];
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },
  async create(product) {
    const sb = window.StilizaDB.sb;
    const { data, error } = await sb.from('products').insert(product).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, patch) {
    const sb = window.StilizaDB.sb;
    const { data, error } = await sb.from('products').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id) {
    const sb = window.StilizaDB.sb;
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) throw error;
  },
  async toggleActive(id, isActive) {
    return this.update(id, { is_active: isActive });
  }
};
