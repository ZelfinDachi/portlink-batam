// PORTLINK — manajemen waktu sesi (menu.html dan admin.html).
// Keluar otomatis bila tidak ada aktivitas, dengan peringatan hitung mundur, plus batas maksimal satu sesi login.
// Ini pengaman di sisi browser. Penegakan di server (Supabase Auth > Sessions) tersedia di paket Pro.
(async () => {
  if (!window.sb) return;

  // ---- Pengaturan waktu (ubah di sini) ----
  const admin = /admin\.html$/.test(location.pathname);
  const IDLE_MS = (admin ? 10 : 15) * 60 * 1000;  // batas tidak aktif (admin lebih ketat)
  const WARN_MS = 60 * 1000;                       // peringatan sebelum keluar otomatis
  const MAX_MS = 8 * 60 * 60 * 1000;               // maksimal lama satu sesi login
  // -----------------------------------------

  const K = "pl_last_active"; // dibagi antar tab lewat localStorage
  const { data } = await sb.auth.getSession();
  if (!data.session) return; // belum login: dijaga oleh auth-guard.js
  const signedIn = Date.parse(data.session.user.last_sign_in_at) || Date.now();
  const lastActive = () => Math.max(Number(localStorage.getItem(K)) || 0, signedIn);
  const touch = () => { try { localStorage.setItem(K, String(Date.now())); } catch { /* storage diblokir */ } };
  let warning = false, ending = false;

  async function end(reason) {
    if (ending) return; ending = true;
    try { await sb.auth.signOut({ scope: "local" }); } catch { /* tetap keluar */ }
    localStorage.removeItem("pl_session"); localStorage.removeItem(K);
    try { sessionStorage.setItem("pl_logout_msg", reason); } catch { /* abaikan */ }
    location.href = "index.html";
  }

  const st = document.createElement("style");
  st.textContent = `dialog.pl-sess{max-width:360px;padding:22px;border:0;border-radius:14px;color:#15232b;font:14px "DM Sans",sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.35)}
dialog.pl-sess::backdrop{background:rgba(5,22,31,.6)}.pl-sess h3{margin:0 0 8px;font-size:18px}.pl-sess p{margin:0;color:#4f6064}
.pl-sess div{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.pl-sess button{padding:9px 14px;border:0;border-radius:8px;color:#fff;background:#102c3b;font:inherit;font-weight:700;cursor:pointer}
.pl-sess .alt{color:#15232b;background:#fff;border:1px solid #cdd5d0}`;
  document.head.appendChild(st);
  const dlg = document.createElement("dialog");
  dlg.className = "pl-sess";
  dlg.innerHTML = '<h3>Sesi hampir berakhir</h3><p>Tidak ada aktivitas. Anda akan keluar otomatis dalam <b id="plCount">60</b> detik.</p><div><button class="alt" id="plOut">Keluar sekarang</button><button id="plStay">Tetap masuk</button></div>';
  document.body.appendChild(dlg);
  dlg.addEventListener("cancel", (e) => e.preventDefault()); // Esc tidak menutup peringatan
  dlg.querySelector("#plStay").addEventListener("click", () => { touch(); warning = false; dlg.close(); });
  dlg.querySelector("#plOut").addEventListener("click", () => end("Anda sudah keluar."));

  // Aktivitas pengguna memperbarui waktu terakhir aktif (maksimal sekali per detik).
  let written = 0;
  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((ev) =>
    addEventListener(ev, () => { if (warning) return; const n = Date.now(); if (n - written > 1000) { written = n; touch(); } }, { passive: true, capture: true }));

  function tick() {
    const now = Date.now(), idle = now - lastActive();
    if (now - signedIn >= MAX_MS) return end("Sesi login berakhir (maksimal 8 jam). Silakan masuk lagi.");
    if (idle >= IDLE_MS) return end("Anda keluar otomatis karena tidak ada aktivitas.");
    if (idle >= IDLE_MS - WARN_MS) {
      if (!warning) { warning = true; if (!dlg.open) dlg.showModal(); }
      dlg.querySelector("#plCount").textContent = Math.ceil((IDLE_MS - idle) / 1000);
    } else if (warning) { warning = false; dlg.close(); } // tab lain sudah aktif kembali
  }

  // Dibuka kembali setelah lama ditinggal: langsung keluar. Selain itu, pembukaan halaman dihitung aktivitas.
  if (Date.now() - lastActive() >= IDLE_MS || Date.now() - signedIn >= MAX_MS) return tick();
  touch();
  setInterval(tick, 1000);
  document.addEventListener("visibilitychange", tick);

  // Keluar dari tab lain ikut mengeluarkan tab ini.
  sb.auth.onAuthStateChange((ev) => {
    if (ev === "SIGNED_OUT" && !ending) { ending = true; localStorage.removeItem("pl_session"); location.href = "index.html"; }
  });
})();
