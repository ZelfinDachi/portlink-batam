// PORTLINK — halaman login yang tersambung ke Supabase Auth.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const forms = { login: $("#loginForm"), register: $("#registerForm"), forgot: $("#forgotForm"), reset: $("#resetForm") };
  const recovering = /type=recovery/.test(location.hash); // datang dari tautan email reset

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 4500);
  }
  function clearErrs(f) { f.querySelectorAll(".err").forEach((e) => e.remove()); f.querySelectorAll(".bad").forEach((e) => e.classList.remove("bad")); }
  function fieldErr(f, name, msg) {
    const input = f.elements[name]; input.classList.add("bad");
    const s = document.createElement("span"); s.className = "err"; s.textContent = msg;
    input.closest("label").appendChild(s);
    f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
  }
  function busy(f, on) {
    const b = f.querySelector(".gold"); b.disabled = on;
    if (on) { b.dataset.t = b.textContent; b.textContent = "Memproses…"; } else if (b.dataset.t) b.textContent = b.dataset.t;
  }
  function show(name) {
    Object.entries(forms).forEach(([k, f]) => { f.classList.toggle("hidden", k !== name); f.reset(); clearErrs(f); });
    const first = forms[name].querySelector("input"); if (first) first.focus();
  }
  const friendly = (e) => {
    const m = (e.message || "").toLowerCase();
    if (m.includes("invalid login")) return "Email atau password salah.";
    if (m.includes("not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk Anda.";
    if (m.includes("already registered") || m.includes("database error")) return "Email atau username sudah dipakai.";
    if (m.includes("rate limit")) return "Terlalu banyak permintaan email. Coba lagi nanti.";
    return "Terjadi kesalahan: " + e.message;
  };

  if (!window.sb) {
    toast("Konfigurasi Supabase belum diisi (supabase-config.js).");
    return;
  }

  // Masuk ke menu.html. pl_session hanya jembatan untuk app.js lama; sumber kebenaran tetap sesi Supabase.
  async function enter(user) {
    const { data: p } = await sb.from("profiles").select("username, role").eq("id", user.id).maybeSingle();
    localStorage.setItem("pl_session", JSON.stringify({ username: p?.username || user.email.split("@")[0], email: user.email, role: p?.role || "user" }));
    location.href = "menu.html";
  }

  sb.auth.getSession().then(({ data }) => { if (data.session && !recovering) enter(data.session.user); });
  sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") show("reset"); });

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-show]");
    if (b) { e.preventDefault(); show(b.dataset.show); }
    if (e.target.matches(".eye")) {
      const i = e.target.previousElementSibling, vis = i.type === "password";
      i.type = vis ? "text" : "password"; e.target.textContent = vis ? "Sembunyikan" : "Lihat";
    }
  });

  // Masuk (dengan pembatasan percobaan ringan di sisi browser).
  let fails = 0, lockUntil = 0;
  forms.login.addEventListener("submit", async (e) => {
    e.preventDefault(); const f = forms.login; clearErrs(f);
    const left = Math.ceil((lockUntil - Date.now()) / 1000);
    if (left > 0) return fieldErr(f, "pw", `Terlalu banyak percobaan. Coba lagi dalam ${left} detik.`);
    const E = f.elements.ident.value.trim().toLowerCase(), P = f.elements.pw.value;
    if (!E) return fieldErr(f, "ident", "Isi email Anda.");
    if (!P) return fieldErr(f, "pw", "Isi password.");
    busy(f, true);
    const { data, error } = await sb.auth.signInWithPassword({ email: E, password: P });
    busy(f, false);
    if (error) { if (++fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; } return fieldErr(f, "pw", friendly(error)); }
    enter(data.user);
  });

  // Daftar: username, email, password minimal 8 karakter.
  forms.register.addEventListener("submit", async (e) => {
    e.preventDefault(); const f = forms.register; clearErrs(f);
    const U = f.elements.username.value.trim(), E = f.elements.email.value.trim().toLowerCase();
    const P = f.elements.pw.value, P2 = f.elements.pw2.value;
    let bad = false; const fail = (n, m) => { fieldErr(f, n, m); bad = true; };
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(U)) fail("username", "Username 3–20 karakter: huruf, angka, titik, atau garis bawah.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(E)) fail("email", "Format email belum benar.");
    if (P.length < 8) fail("pw", "Password minimal 8 karakter.");
    if (P2 !== P) fail("pw2", "Ulangi password dengan isi yang sama.");
    if (bad) return;
    busy(f, true);
    const { data, error } = await sb.auth.signUp({ email: E, password: P, options: { data: { username: U } } });
    busy(f, false);
    if (error) return fieldErr(f, "email", friendly(error));
    if (data.session) return enter(data.user);
    show("login"); toast("Akun dibuat. Cek email Anda untuk konfirmasi, lalu masuk.");
  });

  // Lupa password: kirim tautan reset ke email.
  forms.forgot.addEventListener("submit", async (e) => {
    e.preventDefault(); const f = forms.forgot; clearErrs(f);
    const E = f.elements.email.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(E)) return fieldErr(f, "email", "Format email belum benar.");
    busy(f, true);
    const { error } = await sb.auth.resetPasswordForEmail(E, { redirectTo: location.origin + location.pathname });
    busy(f, false);
    if (error) return fieldErr(f, "email", friendly(error));
    show("login"); toast("Jika email terdaftar, tautan reset sudah dikirim. Cek juga folder spam.");
  });

  // Password baru setelah klik tautan di email.
  forms.reset.addEventListener("submit", async (e) => {
    e.preventDefault(); const f = forms.reset; clearErrs(f);
    const P = f.elements.pw.value, P2 = f.elements.pw2.value;
    if (P.length < 8) return fieldErr(f, "pw", "Password minimal 8 karakter.");
    if (P2 !== P) return fieldErr(f, "pw2", "Ulangi password dengan isi yang sama.");
    busy(f, true);
    const { data, error } = await sb.auth.updateUser({ password: P });
    busy(f, false);
    if (error) return fieldErr(f, "pw", friendly(error));
    history.replaceState(null, "", location.pathname);
    enter(data.user);
  });

  // Slide gambar dan teks di sisi kanan.
  const SLIDES = [
    ["Temukan layanan logistik terbaik.", "Trucking, forwarding, gudang, dan alat berat untuk industri Batam dalam satu platform."],
    ["Bandingkan vendor dengan mudah.", "Lihat paket, area layanan, dan harga indikatif sebelum memutuskan."],
    ["Pesan dan bayar dalam satu alur.", "Dari keranjang sampai pembayaran bank atau e-wallet (simulasi)."]
  ];
  const slides = document.querySelectorAll(".slide"), dots = $("#dots");
  let cur = 0, timer;
  SLIDES.forEach((_, i) => { const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Slide " + (i + 1)); b.onclick = () => { go(i); auto(); }; dots.appendChild(b); });
  function go(i) {
    cur = i;
    slides.forEach((s, k) => s.classList.toggle("on", k === i));
    dots.querySelectorAll("button").forEach((b, k) => b.classList.toggle("on", k === i));
    $("#capTitle").textContent = SLIDES[i][0]; $("#capText").textContent = SLIDES[i][1];
  }
  function auto() {
    clearInterval(timer);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) timer = setInterval(() => go((cur + 1) % SLIDES.length), 5500);
  }
  go(0); auto();
})();