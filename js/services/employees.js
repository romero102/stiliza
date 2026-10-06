window.StilizaEmployees = {
  async list() {
    const sb = window.StilizaDB.sb;
    if (!sb) return [];
    const { data, error } = await sb.from('profiles').select('*').eq('role', 'empleado').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },
  // El dueño crea empleado: signUp con metadata role empleado
  // Nota: en producción conviene Edge Function con service role.
  async create({ email, password, full_name }) {
    const sb = window.StilizaDB.sb;
    if (!sb) throw new Error('Supabase no configurado');
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name, role: 'empleado' } }
    });
    if (error) throw error;
    // Asegurar rol en profiles
    if (data.user) {
      await sb.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name,
        role: 'empleado'
      });
    }
    return data;
  },
  async remove(profileId) {
    const sb = window.StilizaDB.sb;
    // Solo marca/elimina profile; borrar auth.user requiere service role
    const { error } = await sb.from('profiles').update({ role: 'cliente' }).eq('id', profileId);
    if (error) throw error;
  }
};
