// PORTLINK — halaman login (simulasi front-end).
// Format data sama dengan app.js: pl_users dan pl_session, jadi akun lama tetap bisa dipakai.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage diblokir */ } };
  const loginForm = $("#loginForm"), registerForm = $("#registerForm");
  const users = read("pl_users", []);
  const NEXT = "menu.html";

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  }
  async function hash(pw, salt) {
    const data = new TextEncoder().encode(salt + ":" + pw);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    return btoa(salt + pw);
  }
  function clearErrs(f) { f.querySelectorAll(".err").forEach((e) => e.remove()); f.querySelectorAll(".bad").forEach((e) => e.classList.remove("bad")); }
  function fieldErr(f, name, msg) {
    const input = f.elements[name]; input.classList.add("bad");
    const s = document.createElement("span"); s.className = "err"; s.textContent = msg;
    input.closest("label").appendChild(s);
    f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
  }
  function enter(u) {
    write("pl_session", { username: u.username, email: u.email });
    location.href = NEXT;
  }

  // Pindah antara form masuk dan daftar.
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-show]");
    if (b) {
      const reg = b.dataset.show === "register";
      loginForm.classList.toggle("hidden", reg); registerForm.classList.toggle("hidden", !reg);
      [loginForm, registerForm].forEach((f) => { f.reset(); clearErrs(f); });
      (reg ? registerForm : loginForm).querySelector("input").focus();
    }
    if (e.target.matches(".eye")) {
      const i = e.target.previousElementSibling, show = i.type === "password";
      i.type = show ? "text" : "password"; e.target.textContent = show ? "Sembunyikan" : "Lihat";
    }
  });
  $("#forgot").addEventListener("click", (e) => { e.preventDefault(); toast("Reset password butuh server email. Belum tersedia di versi demo."); });

  // Masuk, dengan pembatasan percobaan (hanya pencegah ringan di sisi browser).
  let fails = 0, lockUntil = 0;
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); clearErrs(loginForm);
    const left = Math.ceil((lockUntil - Date.now()) / 1000);
    if (left > 0) return fieldErr(loginForm, "pw", `Terlalu banyak percobaan. Coba lagi dalam ${left} detik.`);
    const id = loginForm.elements.ident.value.trim().toLowerCase(), P = loginForm.elements.pw.value;
    if (!id) return fieldErr(loginForm, "ident", "Isi username atau email.");
    if (!P) return fieldErr(loginForm, "pw", "Isi password.");
    const user = users.find((u) => u.email === id || u.username.toLowerCase() === id);
    if (!user || (await hash(P, user.salt)) !== user.hash) {
      if (++fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; }
      return fieldErr(loginForm, "pw", "Username/email atau password salah.");
    }
    enter(user);
  });

  // Daftar: username, email, password minimal 8 karakter.
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault(); clearErrs(registerForm);
    const f = registerForm.elements;
    const U = f.username.value.trim(), E = f.email.value.trim().toLowerCase(), P = f.pw.value, P2 = f.pw2.value;
    let bad = false; const fail = (n, m) => { fieldErr(registerForm, n, m); bad = true; };
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(U)) fail("username", "Username 3–20 karakter: huruf, angka, titik, atau garis bawah.");
    else if (users.some((u) => u.username.toLowerCase() === U.toLowerCase())) fail("username", "Username sudah dipakai.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(E)) fail("email", "Format email belum benar.");
    else if (users.some((u) => u.email === E)) fail("email", "Email sudah terdaftar. Silakan masuk.");
    if (P.length < 8) fail("pw", "Password minimal 8 karakter.");
    if (P2 !== P) fail("pw2", "Ulangi password dengan isi yang sama.");
    if (bad) return;
    const salt = Math.random().toString(36).slice(2);
    const user = { username: U, email: E, salt, hash: await hash(P, salt) };
    users.push(user); write("pl_users", users);
    enter(user);
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