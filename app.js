// PORTLINK BATAM — akun, keranjang, detail layanan, dan pembayaran.
// PENTING: semua ini SIMULASI front-end. Data disimpan di localStorage browser,
// tidak ada server dan tidak ada uang yang diproses. Jangan masukkan data asli.

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage penuh/diblokir */ } };

  // Paket layanan per vendor (harga fiktif untuk demo).
  const PKG = {
    1: [["Kontainer 20 ft, dalam kota", 850000], ["Kontainer 40 ft, dalam kota", 1350000], ["Paket 5 perjalanan 20 ft", 3900000]],
    2: [["Pengurusan dokumen kargo", 750000], ["Konsolidasi LCL per CBM", 450000], ["Koordinasi FCL 20 ft", 2500000]],
    3: [["Sewa gudang 10 m² / hari", 350000], ["Sewa gudang 50 m² / hari", 1750000], ["Hitung stok bulanan", 600000]],
    4: [["Forklift 5 ton / hari", 1200000], ["Mobile crane 25 ton / hari", 6500000]],
    5: [["Dukungan sandar kapal", 2000000], ["Crew boat / perjalanan", 3500000]],
    6: [["Truk engkel / perjalanan", 600000], ["Truk fuso / perjalanan", 1100000]]
  };
  const BANKS = ["BCA", "Mandiri", "BNI", "BRI"];
  const WALLETS = ["GoPay", "OVO", "DANA", "ShopeePay"];

  let users = read("pl_users", []);
  let session = read("pl_session", null);
  const cartKey = () => "pl_cart_" + (session ? session.username.toLowerCase() : "guest");
  let cart = read(cartKey(), []);
  let pendingCheckout = false;
  let pay = {};

  const authDlg = $("#authDialog"), detailDlg = $("#detailDialog"), payDlg = $("#payDialog");
  const drawer = $("#cartDrawer"), scrim = $("#scrim");
  const loginForm = $("#loginForm"), registerForm = $("#registerForm");

  // ---------- Navbar ----------
  function renderNav() {
    $("#navUser").innerHTML = session
      ? `<span class="user-chip"><i>${esc(session.username[0].toUpperCase())}</i>${esc(session.username)}</span><button class="link-btn" data-act="logout">Keluar</button>`
      : `<button class="btn btn-small btn-outline" data-act="login">Masuk</button><button class="btn btn-small btn-dark" data-act="register">Daftar</button>`;
  }
  function renderBadge() { $("#cartCount").textContent = cart.reduce((s, c) => s + c.qty, 0); }

  // ---------- Akun ----------
  async function hash(pw, salt) {
    const data = new TextEncoder().encode(salt + ":" + pw);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
    }
    return btoa(salt + pw); // cadangan untuk konteks tidak aman; hanya demo
  }
  function clearErrs(f) {
    f.querySelectorAll(".err").forEach((e) => e.remove());
    f.querySelectorAll(".bad").forEach((e) => e.classList.remove("bad"));
  }
  function fieldErr(f, name, msg) {
    const input = f.elements[name];
    input.classList.add("bad");
    const span = document.createElement("span");
    span.className = "err"; span.textContent = msg;
    input.closest("label").appendChild(span);
    f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
  }
  function openAuth(tab = "login", note = "") {
    [loginForm, registerForm].forEach((f) => { f.reset(); clearErrs(f); });
    loginForm.classList.toggle("hidden", tab !== "login");
    registerForm.classList.toggle("hidden", tab !== "register");
    authDlg.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab && b.closest(".auth-tabs")));
    $("#authNote").textContent = note;
    $("#authNote").classList.toggle("hidden", !note);
    $("#strength").style.width = "0"; $("#pwHint").textContent = "Minimal 8 karakter";
    if (!authDlg.open) authDlg.showModal();
    (tab === "login" ? loginForm : registerForm).querySelector("input").focus();
  }
  function loginAs(u) {
    session = { username: u.username, email: u.email };
    write("pl_session", session);
    const guest = read("pl_cart_guest", []);
    const merged = read(cartKey(), []);
    guest.forEach((g) => {
      const m = merged.find((c) => c.vid === g.vid && c.pi === g.pi);
      m ? (m.qty += g.qty) : merged.push(g);
    });
    try { localStorage.removeItem("pl_cart_guest"); } catch { /* abaikan */ }
    cart = merged; write(cartKey(), cart);
    renderNav(); renderBadge(); renderCart();
    authDlg.close();
    showToast(`Halo, ${u.username}! Anda sudah masuk.`);
    if (pendingCheckout) { pendingCheckout = false; startCheckout(); }
  }

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault(); clearErrs(registerForm);
    const f = registerForm.elements;
    const U = f.username.value.trim(), E = f.email.value.trim().toLowerCase(), P = f.pw.value, P2 = f.pw2.value;
    let bad = false;
    const fail = (n, m) => { fieldErr(registerForm, n, m); bad = true; };
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(U)) fail("username", "Username 3–20 karakter: huruf, angka, titik, atau garis bawah.");
    else if (users.some((u) => u.username.toLowerCase() === U.toLowerCase())) fail("username", "Username sudah dipakai. Coba yang lain.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(E)) fail("email", "Format email belum benar, contoh: nama@perusahaan.com");
    else if (users.some((u) => u.email === E)) fail("email", "Email ini sudah terdaftar. Silakan masuk.");
    if (P.length < 8) fail("pw", "Password minimal 8 karakter.");
    if (P2 !== P) fail("pw2", "Ulangi password dengan isi yang sama.");
    if (bad) return;
    const salt = Math.random().toString(36).slice(2);
    const user = { username: U, email: E, salt, hash: await hash(P, salt) };
    users.push(user); write("pl_users", users);
    loginAs(user);
    showToast(`Akun dibuat. Selamat datang, ${U}!`);
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); clearErrs(loginForm);
    const id = loginForm.elements.ident.value.trim().toLowerCase(), P = loginForm.elements.pw.value;
    const user = users.find((u) => u.email === id || u.username.toLowerCase() === id);
    if (!id) return fieldErr(loginForm, "ident", "Isi email atau username.");
    if (!P) return fieldErr(loginForm, "pw", "Isi password.");
    if (!user) return fieldErr(loginForm, "ident", "Akun tidak ditemukan. Cek ejaan atau daftar akun baru.");
    if ((await hash(P, user.salt)) !== user.hash) return fieldErr(loginForm, "pw", "Password salah.");
    loginAs(user);
  });

  registerForm.elements.pw.addEventListener("input", (e) => {
    const p = e.target.value;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^\w]/.test(p) || p.length >= 12) s++;
    if (p.length < 8) s = 0;
    $("#strength").style.width = (p ? Math.max(s, 0.5) * 25 : 0) + "%";
    $("#strength").style.background = s >= 3 ? "var(--teal)" : "var(--orange)";
    $("#pwHint").textContent = !p ? "Minimal 8 karakter" : ["Belum 8 karakter", "Lemah", "Cukup", "Kuat", "Sangat kuat"][s];
  });

  function logout() {
    session = null;
    try { localStorage.removeItem("pl_session"); } catch { /* abaikan */ }
    cart = read(cartKey(), []);
    renderNav(); renderBadge(); renderCart();
    showToast("Anda sudah keluar.");
  }

  // ---------- Keranjang ----------
  const totals = () => {
    const sub = cart.reduce((s, c) => s + PKG[c.vid][c.pi][1] * c.qty, 0);
    const tax = Math.round(sub * 0.11);
    return { sub, tax, total: sub + tax };
  };
  function saveCart() { write(cartKey(), cart); renderBadge(); renderCart(); }
  function addToCart(vid, pi) {
    const line = cart.find((c) => c.vid === vid && c.pi === pi);
    line ? line.qty++ : cart.push({ vid, pi, qty: 1 });
    saveCart();
    const btn = $("#openCart");
    btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  }
  function renderCart() {
    const body = $("#cartBody"), foot = $("#cartFoot");
    if (!cart.length) {
      body.innerHTML = `<div class="cart-empty"><big>▣</big><strong>Keranjang masih kosong</strong><p>Pilih layanan dari direktori vendor, lalu tambahkan ke sini.</p><a class="btn btn-dark" href="#vendor" data-act="close-cart">Jelajahi vendor</a></div>`;
      foot.classList.add("hidden"); return;
    }
    foot.classList.remove("hidden");
    body.innerHTML = cart.map((c, i) => {
      const v = vendors.find((x) => x.id === c.vid), p = PKG[c.vid][c.pi];
      return `<div class="cart-line"><img src="${v.image}" alt=""><div><strong>${p[0]}</strong><small>${v.name}</small>
        <div class="qty"><button data-q="-1" data-i="${i}" aria-label="Kurangi">−</button><span>${c.qty}</span><button data-q="1" data-i="${i}" aria-label="Tambah">+</button></div></div>
        <div class="cart-price">${rp(p[1] * c.qty)}<button class="rm" data-rm="${i}">Hapus</button></div></div>`;
    }).join("");
    const t = totals();
    foot.innerHTML = `<div class="sum"><span>Subtotal</span><span>${rp(t.sub)}</span></div>
      <div class="sum"><span>PPN 11% (simulasi)</span><span>${rp(t.tax)}</span></div>
      <div class="sum total"><span>Total</span><span>${rp(t.total)}</span></div>
      <button class="btn btn-dark btn-full" data-act="checkout">Lanjut ke pemesanan <span>↗</span></button>
      <button class="btn btn-outline btn-full" data-act="save-cart">Simpan, lanjut belanja</button>
      <p class="foot-note">${session ? "Keranjang tersimpan otomatis di akun Anda (di browser ini)." : "Masuk agar keranjang ikut tersimpan ke akun Anda."}</p>`;
  }
  function openCart() { renderCart(); drawer.classList.add("open"); scrim.classList.add("show"); drawer.setAttribute("aria-hidden", "false"); }
  function closeCart() { drawer.classList.remove("open"); scrim.classList.remove("show"); drawer.setAttribute("aria-hidden", "true"); }

  // ---------- Detail layanan ----------
  window.openDetail = (v) => {
    $("#detailBody").innerHTML = `<div class="d-img"><img src="${v.image}" alt="Ilustrasi ${v.categoryLabel.toLowerCase()}"><span class="vendor-type">${v.categoryLabel}</span><button class="modal-close" data-close aria-label="Tutup">×</button></div>
      <div class="d-body"><div class="vendor-meta"><span>⌖ ${v.location}</span><span class="vendor-rating">★ ${v.rating}</span></div>
      <h2>${v.name}</h2><p>${v.description}</p><h3>Pilih paket layanan</h3>
      ${PKG[v.id].map((p, i) => `<div class="pkg"><div><strong>${p[0]}</strong><small>Harga demo</small></div><b>${rp(p[1])}</b><button class="btn btn-small btn-dark" data-add="${v.id}:${i}">+ Keranjang</button></div>`).join("")}
      <button class="btn btn-outline btn-full" data-rfq="${v.id}">Butuh yang lain? Minta penawaran ↗</button></div>`;
    detailDlg.showModal();
  };

  // ---------- Checkout & pembayaran ----------
  const rnd = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  const head = (n) => `<div class="modal-head"><div><span class="section-kicker">CHECKOUT</span><h2>${["Rincian pesanan", "Pilih pembayaran", "Selesaikan pembayaran", "Pesanan dibuat"][n - 1]}</h2></div><button class="modal-close" data-close aria-label="Tutup">×</button></div>
    <ol class="steps">${["Pesanan", "Pembayaran", "Selesai"].map((s, i) => `<li class="${i + 1 <= [1, 2, 2, 3][n - 1] ? "on" : ""}">${s}</li>`).join("")}</ol>`;
  const sumHtml = () => { const t = totals(); return `<div class="pay-lines">${cart.map((c) => `<div class="sum"><span>${c.qty}× ${PKG[c.vid][c.pi][0]}</span><span>${rp(PKG[c.vid][c.pi][1] * c.qty)}</span></div>`).join("")}<div class="sum"><span>PPN 11% (simulasi)</span><span>${rp(t.tax)}</span></div><div class="sum total"><span>Total</span><span>${rp(t.total)}</span></div></div>`; };

  function startCheckout() {
    if (!cart.length) return showToast("Keranjang masih kosong.");
    closeCart();
    if (!session) { pendingCheckout = true; return openAuth("login", "Masuk atau daftar dulu untuk melanjutkan pemesanan. Keranjang Anda tetap aman."); }
    pay = { step: 1 };
    renderPay(); payDlg.showModal();
  }
  function renderPay() {
    const b = $("#payBody"), t = totals();
    if (pay.step === 1) {
      b.innerHTML = head(1) + sumHtml() + `<form class="quote-form" data-pay="1"><label>Tanggal layanan<input type="date" name="date" min="${new Date().toISOString().slice(0, 10)}" required></label>
        <label>Lokasi dan catatan<input name="note" placeholder="Contoh: jemput di Batu Ampar, tujuan Kabil" required></label>
        <button class="btn btn-dark btn-full" type="submit">Pilih pembayaran <span>↗</span></button></form>`;
    } else if (pay.step === 2) {
      const group = (title, list, kind) => `<fieldset class="methods"><legend>${title}</legend><div class="chips">${list.map((n) => `<label class="chip"><input type="radio" name="m" value="${kind}:${n}" required><span>${n}</span></label>`).join("")}</div></fieldset>`;
      b.innerHTML = head(2) + `<form data-pay="2">${group("Transfer bank (virtual account)", BANKS, "bank")}${group("E-wallet", WALLETS, "ewallet")}
        <div class="pay-actions"><button class="btn btn-dark btn-full" type="submit">Bayar ${rp(t.total)}</button><button class="btn btn-outline btn-full" type="button" data-act="pay-back">Kembali</button></div>
        <p class="sim-warn">Simulasi: tidak ada uang yang dipindahkan. Jangan masukkan data kartu atau rekening asli.</p></form>`;
    } else if (pay.step === 3) {
      const [kind, name] = pay.method.split(":");
      pay.code = kind === "bank" ? ({ BCA: "39", Mandiri: "88", BNI: "98", BRI: "26" }[name] + rnd(12)) : "PL" + rnd(8);
      const shown = kind === "bank" ? pay.code.replace(/(\d{4})(?=\d)/g, "$1 ") : pay.code;
      b.innerHTML = head(3) + `<p class="modal-note">${kind === "bank" ? `Transfer ke virtual account ${name} berikut dari m-banking atau ATM.` : `Buka aplikasi ${name}, pilih bayar dengan kode, lalu masukkan kode berikut.`}</p>
        <div class="va"><small>${kind === "bank" ? "Nomor virtual account " + name : "Kode pembayaran " + name}</small><strong>${shown}</strong><small>Total ${rp(t.total)} · berlaku 24 jam (simulasi)</small></div>
        <div class="pay-actions"><button class="btn btn-outline btn-full" data-copy="${pay.code}">Salin nomor</button><button class="btn btn-dark btn-full" data-act="paid">Saya sudah bayar (simulasi)</button><button class="btn btn-outline btn-full" data-act="pay-back">Ganti metode</button></div>`;
    } else {
      b.innerHTML = head(4) + `<div class="success-message"><div class="success-check">✓</div><h3>Pesanan ${pay.no} tercatat</h3><p>Pembayaran via ${pay.method.split(":")[1]} berhasil disimulasikan. Vendor tidak dihubungi dan tidak ada uang yang diproses.</p><button class="btn btn-dark btn-full" data-close>Selesai</button></div>`;
    }
  }
  function finishOrder() {
    const t = totals();
    pay.no = "PL-ORD-" + rnd(6);
    const key = "pl_orders_" + session.username.toLowerCase();
    const orders = read(key, []);
    orders.push({ no: pay.no, date: pay.date, note: pay.note, method: pay.method, total: t.total, items: cart });
    write(key, orders);
    cart = []; saveCart();
    pay.step = 4; renderPay();
  }

  $("#payBody").addEventListener("submit", (e) => {
    e.preventDefault();
    const step = e.target.dataset.pay;
    if (step === "1") { pay.date = e.target.elements.date.value; pay.note = e.target.elements.note.value.trim(); pay.step = 2; }
    if (step === "2") { pay.method = e.target.elements.m.value; pay.step = 3; }
    renderPay();
  });

  // ---------- Pop up kecil di kartu vendor ----------
  const grid = $("#vendorGrid"), pop = $("#vpop");
  let current = null;
  function showPop(card) {
    const btn = card.querySelector("[data-vendor]");
    if (!btn || card === current) return;
    current = card;
    const v = vendors.find((x) => x.id === Number(btn.dataset.vendor));
    const min = Math.min(...PKG[v.id].map((p) => p[1]));
    pop.innerHTML = `<strong>${v.tag}</strong><span>Area ${v.area} · rating ${v.rating}</span><span>${PKG[v.id].length} paket, mulai ${rp(min)} (demo)</span><em>Klik kartu untuk lihat paket dan pesan</em>`;
    const r = card.getBoundingClientRect();
    pop.style.left = r.left + 12 + "px"; pop.style.top = r.top + 12 + "px";
    pop.classList.add("show");
  }
  const hidePop = () => { current = null; pop.classList.remove("show"); };
  grid.addEventListener("mouseover", (e) => { const c = e.target.closest(".vendor-card"); c ? showPop(c) : hidePop(); });
  grid.addEventListener("mouseleave", hidePop);
  grid.addEventListener("focusin", (e) => { const c = e.target.closest(".vendor-card"); if (c) showPop(c); });
  grid.addEventListener("focusout", hidePop);
  window.addEventListener("scroll", hidePop, { passive: true });
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".vendor-card");
    if (!card || e.target.closest("button")) return; // tombol sudah punya handler sendiri
    const btn = card.querySelector("[data-vendor]");
    if (btn) window.openDetail(vendors.find((x) => x.id === Number(btn.dataset.vendor)));
  });

  // ---------- Event umum ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a, [data-close]");
    if (!t) return;
    const d = t.dataset;
    if (t.matches("[data-close]")) t.closest("dialog").close();
    if (d.tab) openAuth(d.tab);
    if (d.act === "login") openAuth("login");
    if (d.act === "register") openAuth("register");
    if (d.act === "logout") logout();
    if (d.act === "close-cart" || d.act === "save-cart") { closeCart(); if (d.act === "save-cart") showToast("Keranjang tersimpan. Lanjutkan kapan saja."); }
    if (d.act === "checkout") startCheckout();
    if (d.act === "pay-back") { pay.step = pay.step === 3 ? 2 : 1; renderPay(); }
    if (d.act === "paid") finishOrder();
    if (d.add) {
      const [vid, pi] = d.add.split(":").map(Number);
      addToCart(vid, pi);
      t.textContent = "Ditambahkan ✓";
      setTimeout(() => (t.textContent = "+ Keranjang"), 1200);
    }
    if (d.rfq) { detailDlg.close(); openQuoteModal(vendors.find((v) => v.id === Number(d.rfq))); }
    if (d.q) { const l = cart[Number(d.i)]; l.qty += Number(d.q); if (l.qty < 1) cart.splice(Number(d.i), 1); saveCart(); }
    if (d.rm !== undefined && t.matches("[data-rm]")) { cart.splice(Number(d.rm), 1); saveCart(); }
    if (d.copy) { try { navigator.clipboard.writeText(d.copy); showToast("Nomor disalin."); } catch { showToast("Salin manual ya."); } }
    if (t.matches(".pw-toggle")) {
      const input = t.previousElementSibling, show = input.type === "password";
      input.type = show ? "text" : "password"; t.textContent = show ? "Sembunyikan" : "Lihat";
    }
  });
  $("#openCart").addEventListener("click", openCart);
  scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });
  [authDlg, detailDlg, payDlg].forEach((dlg) => dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }));

  renderNav(); renderBadge(); renderCart();
})();
