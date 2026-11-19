// PORTLINK — sisi pelanggan: form pemesanan, riwayat pesanan, pembayaran setelah disetujui admin, notifikasi.
// Dimuat di menu.html SETELAH catalog.js dan pl-common.js.
(() => {
  if (!window.sb || !window.PL_CART || !window.PLC) return;
  const { esc, rp, fmt, badge, mountBell } = PLC;
  const $ = (s, r = document) => r.querySelector(s);

  const dlg = document.createElement("dialog");
  dlg.className = "modal pay"; dlg.innerHTML = '<div id="plBody"></div>';
  document.body.appendChild(dlg);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  const body = $("#plBody");
  let orders = [], cur = null;

  const nav = $(".nav-links");
  nav.insertAdjacentHTML("afterbegin", '<button class="cart-btn" id="plOrdersBtn">Pesanan saya</button><span id="plBellHost"></span>');
  const bell = mountBell($("#plBellHost"), { btnClass: "cart-btn", onPick: () => openHistory() });
  $("#plOrdersBtn").addEventListener("click", openHistory);

  const head = (title, kicker) => `<div class="modal-head"><div><span class="section-kicker">${kicker}</span><h2>${title}</h2></div><button class="modal-close" data-close aria-label="Tutup">×</button></div>`;
  const showErr = (form, msg) => { let p = form.querySelector(".err"); if (!p) { p = document.createElement("p"); p.className = "err"; form.prepend(p); } p.textContent = msg; };
  const lines = () => PL_CART.get().map((c) => {
    const p = (PL_PKG[c.vid] || [])[c.pi]; return p ? { name: p[0], price: p[1], qty: c.qty, id: p[2] } : null;
  }).filter(Boolean);
  const open = () => { if (!dlg.open) dlg.showModal(); };

  // 1) Form pemesanan: data lengkap untuk diperiksa admin.
  function openForm() {
    const L = lines(); if (!L.length) return;
    const sub = L.reduce((s, l) => s + l.price * l.qty, 0), tax = Math.round(sub * 0.11);
    body.innerHTML = head("Data pemesanan", "LANGKAH 1 DARI 3") +
      `<div class="pay-lines">${L.map((l) => `<div class="sum"><span>${l.qty}× ${l.name}</span><span>${rp(l.price * l.qty)}</span></div>`).join("")}
       <div class="sum"><span>PPN 11% (simulasi)</span><span>${rp(tax)}</span></div><div class="sum total"><span>Total</span><span>${rp(sub + tax)}</span></div></div>
       <p class="modal-note">Pesanan diperiksa admin lebih dulu. Pembayaran dilakukan setelah pesanan disetujui.</p>
       <form class="quote-form" id="plForm">
         <label>Nama perusahaan<input name="company" required maxlength="80"></label>
         <label>Nama kontak<input name="contact" required maxlength="60" value="${esc((window.PL_USER || {}).username || "")}"></label>
         <label>No. WhatsApp / telepon<input name="phone" required inputmode="tel" placeholder="6281234567890"></label>
         <label>Lokasi asal<input name="origin" required maxlength="100"></label>
         <label>Tujuan<input name="destination" required maxlength="100"></label>
         <label>Tanggal layanan<input name="date" type="date" required min="${new Date().toISOString().slice(0, 10)}"></label>
         <label>Catatan<textarea name="note" rows="2" maxlength="300"></textarea></label>
         <button class="btn btn-dark btn-full" type="submit">Kirim pesanan <span>↗</span></button></form>`;
    open();
  }

  // 2) Riwayat pesanan dan pembayaran.
  const card = (o) => `<div class="pl-ord"><div class="pl-ordh"><strong>${esc(o.order_no)}</strong>${badge(o.status)}</div>
    <small>${fmt(o.created_at)} · layanan ${esc(o.service_date || "-")} · ${esc(o.origin || "-")} → ${esc(o.destination || "-")}</small>
    ${o.order_items.map((i) => `<div class="sum"><span>${i.qty}× ${esc(i.package_name)} (${esc(i.vendor_name)})</span><span>${rp(i.unit_price * i.qty)}</span></div>`).join("")}
    <div class="sum total"><span>Total (termasuk PPN)</span><span>${rp(o.total)}</span></div>
    ${o.payment_method ? `<small>Pembayaran: ${esc(o.payment_method.replace(":", " – "))}</small>` : ""}
    ${o.payment_proof ? "<small>Bukti pembayaran sudah diunggah</small>" : ""}
    ${o.admin_note ? `<p class="modal-note">Catatan admin: ${esc(o.admin_note)}</p>` : ""}
    <div class="pay-actions">${o.status === "disetujui" ? `<button class="btn btn-dark btn-full" data-pay="${o.id}">Pilih pembayaran</button>` : ""}
    ${["menunggu_konfirmasi", "disetujui"].includes(o.status) ? `<button class="btn btn-outline btn-full" data-cancel="${o.id}">Batalkan pesanan</button>` : ""}</div></div>`;

  async function openHistory() {
    open();
    body.innerHTML = head("Pesanan saya", "RIWAYAT") + '<p class="modal-note">Memuat…</p>';
    const { data, error } = await sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    if (error) { body.innerHTML = head("Pesanan saya", "RIWAYAT") + `<p class="err">${esc(error.message)}</p>`; return; }
    orders = data;
    body.innerHTML = head("Pesanan saya", "RIWAYAT") + (data.length ? data.map(card).join("") : '<p class="modal-note">Belum ada pesanan.</p>');
  }

  function pickMethod() {
    const group = (t, list, k) => `<fieldset class="methods"><legend>${t}</legend><div class="chips">${list.map((n) => `<label class="chip"><input type="radio" name="m" value="${k}:${n}" required><span>${n}</span></label>`).join("")}</div></fieldset>`;
    body.innerHTML = head("Pilih pembayaran", esc(cur.order_no)) + `<form id="plMethod">${group("Transfer bank (virtual account)", ["BCA", "Mandiri", "BNI", "BRI"], "bank")}${group("E-wallet", ["GoPay", "OVO", "DANA", "ShopeePay"], "ewallet")}
      <div class="pay-actions"><button class="btn btn-dark btn-full" type="submit">Bayar ${rp(cur.total)}</button><button class="btn btn-outline btn-full" type="button" data-back>Kembali</button></div>
      <p class="sim-warn">Simulasi: tidak ada uang yang dipindahkan.</p></form>`;
  }
  function showInstruction() {
    const [kind, name] = cur.method.split(":");
    const code = kind === "bank" ? { BCA: "39", Mandiri: "88", BNI: "98", BRI: "26" }[name] + String(cur.id).padStart(12, "0") : "PL" + String(cur.id).padStart(8, "0");
    body.innerHTML = head("Selesaikan pembayaran", esc(cur.order_no)) +
      `<p class="modal-note">${kind === "bank" ? `Transfer ke virtual account ${esc(name)}.` : `Buka aplikasi ${esc(name)} dan masukkan kode berikut.`}</p>
       <div class="va"><small>${kind === "bank" ? "Nomor virtual account" : "Kode pembayaran"} ${esc(name)}</small><strong>${code}</strong><small>Total ${rp(cur.total)} (simulasi)</small></div>
       <form class="quote-form" id="plProof"><label>Unggah bukti pembayaran (JPG, PNG, WebP, atau PDF, maks. 10 MB)<input type="file" name="proof" accept="image/jpeg,image/png,image/webp,application/pdf" required></label>
       <button class="btn btn-dark btn-full" type="submit">Kirim bukti pembayaran</button><button class="btn btn-outline btn-full" type="button" data-back>Nanti saja</button></form>`;
  }
  const done = (title, text) => { body.innerHTML = head(title, "SELESAI") + `<div class="success-message"><div class="success-check">✓</div><h3>${title}</h3><p>${text}</p><button class="btn btn-dark btn-full" data-hist>Lihat pesanan saya</button></div>`; };

  body.addEventListener("submit", async (e) => {
    e.preventDefault(); const form = e.target, f = form.elements, btn = form.querySelector("button[type=submit]");
    if (form.id === "plMethod") { cur.method = f.m.value; return showInstruction(); }
    if (form.id === "plProof") {
      const file = f.proof.files[0];
      const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
      if (!file) return showErr(form, "Pilih file bukti pembayaran.");
      if (file.size > 10 * 1024 * 1024) return showErr(form, "Ukuran file maksimal 10 MB.");
      if (!TYPES[file.type]) return showErr(form, "Format harus JPG, PNG, WebP, atau PDF.");
      btn.disabled = true; btn.textContent = "Mengunggah…";
      const uid = (await sb.auth.getUser()).data.user.id;
      const path = `${uid}/${cur.id}-${Date.now()}.${TYPES[file.type]}`;
      const reset = () => { btn.disabled = false; btn.textContent = "Kirim bukti pembayaran"; };
      const up = await sb.storage.from("payment-proofs").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { reset(); return showErr(form, "Gagal mengunggah: " + up.error.message); }
      const { error } = await sb.rpc("submit_payment", { p_order: cur.id, p_method: cur.method, p_proof: path });
      if (error) { reset(); return showErr(form, error.message); }
      bell.reload();
      return done("Bukti pembayaran terkirim", "Admin akan memeriksa bukti pembayaran Anda. Status terbaru bisa dilihat di Pesanan saya dan lewat notifikasi.");
    }
    if (form.id !== "plForm") return;
    let phone = f.phone.value.replace(/\D/g, ""); if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    if (!/^[0-9]{9,15}$/.test(phone)) return showErr(form, "Nomor telepon harus 9–15 digit, contoh 6281234567890.");
    if (!window.PL_LIVE) return showErr(form, "Katalog online belum termuat. Muat ulang halaman lalu coba lagi.");
    btn.disabled = true;
    const items = lines().map((l) => ({ package_id: l.id, qty: l.qty }));
    const { data, error } = await sb.rpc("place_order", {
      p_items: items, p_date: f.date.value, p_note: f.note.value.trim(), p_company: f.company.value.trim(),
      p_contact: f.contact.value.trim(), p_phone: phone, p_origin: f.origin.value.trim(), p_destination: f.destination.value.trim()
    });
    if (error) { btn.disabled = false; showErr(form, error.message); window.PL_reload && PL_reload(); return; }
    PL_CART.set([]); window.PL_reload && PL_reload(); bell.reload();
    done("Pesanan terkirim", `Nomor ${esc(data)}. Admin akan memeriksa data pesanan Anda. Anda mendapat notifikasi setelah disetujui, lalu bisa memilih pembayaran di Pesanan saya.`);
  });

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
    if (d.hist !== undefined || d.back !== undefined) return openHistory();
    if (d.pay) { cur = orders.find((o) => o.id === Number(d.pay)); return pickMethod(); }
    if (d.cancel && confirm("Batalkan pesanan ini?")) {
      const { error } = await sb.rpc("cancel_order", { p_order: Number(d.cancel) });
      if (error) alert(error.message);
      bell.reload(); window.PL_reload && PL_reload(); return openHistory();
    }
  });

  // Tombol "Lanjut ke pemesanan" di keranjang membuka form baru (menggantikan alur lama).
  document.addEventListener("click", (e) => {
    if (!e.target.closest('[data-act="checkout"]')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!PL_CART.get().length) return;
    $("#scrim").click(); openForm();
  }, true);
})();
