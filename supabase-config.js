// Isi dua nilai di bawah dari Supabase: tombol "Connect" di atas, atau Project Settings > API Keys.
// Pakai kunci PUBLIK (anon / publishable). JANGAN PERNAH menaruh kunci service_role / secret di sini.
const PL_SUPABASE_URL = "https://dhcdngksnyjltwewyzuz.supabase.co";
const PL_SUPABASE_KEY = "sb_publishable_EZ-6LDgSRkm0HcZNsj6RpQ_GEGI6Zrv";

if (PL_SUPABASE_URL.includes("ISI_") || PL_SUPABASE_KEY.includes("ISI_")) {
  console.error("supabase-config.js belum diisi: ganti URL dan kunci publik Supabase.");
} else {
  window.sb = supabase.createClient(PL_SUPABASE_URL, PL_SUPABASE_KEY);
}