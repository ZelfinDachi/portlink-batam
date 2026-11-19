// PORTLINK — halaman admin: tab Pesanan (cek data pelanggan, ACC/tolak, verifikasi pembayaran, ubah status) dan notifikasi.
// Dimuat di admin.html SETELAH admin.js dan pl-common.js. Hak akses sebenarnya dijaga RLS dan fungsi database.
(() => {
  if (!window.sb || !window.PLC) return;
  const { esc, rp, fmt, badge, STATUS, mountBell } = PLC;
  const $ = (s, r = document) => r.querySelector(s);

  $(".tabs").insertAdjacentHTML("beforeend", '<button data-tab="ord">Pesanan <span id="ordCount"></span></button>');
  $("main").insertAdjacentHTML("beforeend", `<section id="ord" hidden><div class="bar"><h1>Pesanan masuk</h1>
    <select id="ordFilter" style="width:auto"><option value="perlu">Perlu tindakan</option><option value="all">Semua</option>
    ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></div><div id="ordList"></div></section>`);
  $(".top a").insertAdjacentHTML("beforebegin", '<span id="adminBell"></span>');
  mountBell($("#adminBell"), { onPick: () => $('[data-tab="ord"]').click() });

  let rows = [], users = {};
  const NEED = ["menunggu_konfirmasi", "menunggu_verifikasi"];

  async function load() {
    const [o, p] = await Promise.all([
      sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
      sb.from("profiles").select("id, username, email")
    ]);
    if (o.error) { $("#ordList").innerHTML = `<p class="note">${esc(o.error.message)}</p>`; return; }
    rows = o.data; users = Object.fromEntries((p.data || []).map((u) => [u.id, u]));
    const n = rows.filter((r) => NEED.includes(r.status)).length;
    $("#ordCount").textContent = n ? `(${n})` : "";
    render();
  }

  const btn = (id, act, label, cls = "") => `<button data-oa="${act}" data-id="${id}" class="${cls}">${label}</button>`;
  const actions = (o) => (o.payment_proof ? btn(o.id, "proof", "Lihat bukti pembayaran") : "") + ({
    menunggu_konfirmasi: btn(o.id, "approve", "✓ ACC pesanan", "pri") + btn(o.id, "reject", "✕ Tolak", "danger"),
    menunggu_verifikasi: btn(o.id, "payok", "✓ Pembayaran valid", "pri") + btn(o.id, "paybad", "✕ Pembayaran tidak valid", "danger"),
    dibayar: btn(o.id, "process", "Mulai proses", "pri"), diproses: btn(o.id, "finish", "Tandai selesai", "pri")
  }[o.status] || "");

  const card = (o) => {
    const u = users[o.user_id] || {};
    const phone = /^[0-9]{9,15}$/.test(o.phone || "") ? `<a href="https://wa.me/${o.phone}" target="_blank" rel="noopener">${esc(o.phone)}</a>` : esc(o.phone || "-");
    return `<section class="vendor"><div class="vh"><div><strong>${esc(o.order_no)}</strong> ${badge(o.status)}
      <small>${fmt(o.created_at)} · akun ${esc(u.username || "-")} (${esc(u.email || "-")})</small></div><strong>${rp(o.total)}</strong></div>
      <div class="tblwrap"><table>
        <tr><th>Perusahaan</th><td>${esc(o.company || "-")}</td><th>Kontak</th><td>${esc(o.contact_name || "-")}</td></tr>
        <tr><th>Telepon / WA</th><td>${phone}</td><th>Tanggal layanan</th><td>${esc(o.service_date || "-")}</td></tr>
        <tr><th>Asal</th><td>${esc(o.origin || "-")}</td><th>Tujuan</th><td>${esc(o.destination || "-")}</td></tr>
        <tr><th>Catatan</th><td colspan="3">${esc(o.note || "-")}</td></tr>
        <tr><th>Pembayaran</th><td colspan="3">${o.payment_method ? esc(o.payment_method.replace(":", " – ")) + (o.paid_at ? " · dilaporkan " + fmt(o.paid_at) : "") : "Belum dipilih"}</td></tr></table></div>
      <div class="tblwrap"><table><tr><th>Vendor</th><th>Paket</th><th>Jumlah</th><th>Harga satuan</th></tr>
        ${o.order_items.map((i) => `<tr><td>${esc(i.vendor_name)}</td><td>${esc(i.package_name)}</td><td>${i.qty}</td><td>${rp(i.unit_price)}</td></tr>`).join("")}</table></div>
      ${o.admin_note ? `<p class="note">Catatan admin: ${esc(o.admin_note)}</p>` : ""}<div class="acts" style="margin-top:10px">${actions(o)}</div></section>`;
  };

  function render() {
    const f = $("#ordFilter").value;
    const list = rows.filter((r) => f === "all" || (f === "perlu" ? NEED.includes(r.status) : r.status === f));
    $("#ordList").innerHTML = list.map(card).join("") || '<p class="note">Tidak ada pesanan pada filter ini.</p>';
  }
  $("#ordFilter").addEventListener("change", render);

  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) { $("#ord").hidden = t.dataset.tab !== "ord"; if (t.dataset.tab === "ord") load(); return; }
    const b = e.target.closest("[data-oa]"); if (!b) return;
    const id = Number(b.dataset.id), a = b.dataset.oa;
    if (a === "proof") { // bukti dibuka lewat tautan sementara (5 menit), bucket tetap privat
      const w = window.open("about:blank", "_blank"); if (w) w.opener = null;
      const row = rows.find((r) => r.id === id);
      const { data, error } = await sb.storage.from("payment-proofs").createSignedUrl(row.payment_proof, 300);
      if (error) { if (w) w.close(); return alert("Bukti tidak bisa dibuka: " + error.message); }
      if (w) w.location.href = data.signedUrl; else alert("Izinkan pop-up di browser untuk melihat bukti pembayaran.");
      return;
    }
    let note = null;
    if (a === "reject" || a === "paybad") {
      note = prompt(a === "reject" ? "Alasan penolakan (dilihat pelanggan):" : "Alasan pembayaran tidak valid (dilihat pelanggan):");
      if (note === null) return;
    }
    b.disabled = true;
    const call = {
      approve: ["review_order", { p_order: id, p_approve: true, p_note: null }],
      reject: ["review_order", { p_order: id, p_approve: false, p_note: note }],
      payok: ["verify_payment", { p_order: id, p_ok: true, p_note: null }],
      paybad: ["verify_payment", { p_order: id, p_ok: false, p_note: note }],
      process: ["set_order_status", { p_order: id, p_status: "diproses" }],
      finish: ["set_order_status", { p_order: id, p_status: "selesai" }]
    }[a];
    const { error } = await sb.rpc(call[0], call[1]);
    if (error) alert(error.message);
    load();
  });

  load(); // hitung jumlah pesanan yang perlu tindakan untuk lencana pada tab
  setInterval(() => { if (!document.hidden) load(); }, 45000);
})();
