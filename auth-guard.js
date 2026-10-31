// Dipasang di <head> menu.html. Memastikan hanya pengguna yang sudah login (sesi Supabase) yang melihat halaman,
// dan memasang tombol Keluar yang benar-benar mengakhiri sesi Supabase.
// Catatan keamanan: ini hanya pengaman tampilan. Data yang sebenarnya dilindungi oleh aturan RLS di database.
(async () => {
  document.documentElement.style.visibility = "hidden";
  try {
    if (!window.sb) throw new Error("Supabase belum dikonfigurasi");
    const { data } = await sb.auth.getSession();
    if (!data.session) { localStorage.removeItem("pl_session"); location.replace("index.html"); return; }
    const user = data.session.user;
    const { data: p } = await sb.from("profiles").select("username, role").eq("id", user.id).maybeSingle();
    // Jembatan untuk app.js lama yang membaca pl_session.
    localStorage.setItem("pl_session", JSON.stringify({
      username: p?.username || user.email.split("@")[0], email: user.email, role: p?.role || "user"
    }));
    window.PL_USER = { id: user.id, email: user.email, username: p?.username, role: p?.role || "user" };
  } catch (err) {
    console.error(err);
    location.replace("index.html");
    return;
  }
  // Tautan Admin di navbar, hanya untuk admin dan super admin (tampilan saja; akses sebenarnya dijaga RLS).
  if (["admin", "super_admin"].includes(window.PL_USER.role)) {
    const addLink = () => {
      const nav = document.querySelector(".nav-links");
      if (!nav || nav.querySelector("[data-admin-link]")) return;
      const a = document.createElement("a");
      a.href = "admin.html"; a.textContent = "Admin"; a.dataset.adminLink = "";
      nav.prepend(a);
    };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", addLink) : addLink();
  }
  document.documentElement.style.visibility = "";
})();

document.addEventListener("click", async (e) => {
  if (!e.target.closest('[data-act="logout"]')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  try { await sb.auth.signOut(); } catch { /* tetap lanjut keluar */ }
  localStorage.removeItem("pl_session");
  location.href = "index.html";
}, true);
