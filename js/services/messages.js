window.StilizaMessages = {
  async create({ name, email, phone, message }) {
    const sb = window.StilizaDB.sb;
    if (!sb) throw new Error('Supabase no configurado');
    const { data, error } = await sb.from('contact_messages').insert({
      name, email, phone: phone || '', message
    }).select().single();
    if (error) throw error;
    return data;
  },
  async list() {
    const sb = window.StilizaDB.sb;
    if (!sb) return [];
    const { data, error } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  }
};
