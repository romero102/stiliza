// Cliente único de Supabase
(function () {
  const cfg = window.STILIZA_SUPABASE || {};
  let client = null;

  function getClient() {
    if (client) return client;
    if (!window.supabase || !window.supabase.createClient) {
      console.error('[Stiliza] Carga el CDN @supabase/supabase-js antes de este archivo');
      return null;
    }
    if (!cfg.url || cfg.url.includes('TU-PROYECTO') || !cfg.anonKey || cfg.anonKey.includes('TU-ANON')) {
      console.warn('[Stiliza] Configura js/supabase-config.js con tu URL y anon key');
      return null;
    }
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    return client;
  }

  window.StilizaDB = {
    getClient,
    get sb() { return getClient(); }
  };
})();
