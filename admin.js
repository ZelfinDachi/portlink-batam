// PORTLINK — halaman admin. Hak akses SEBENARNYA dijaga oleh aturan RLS di database;
// pemeriksaan peran di bawah hanya untuk mengatur tampilan.
(async () => {
  const $ = (s, r = document) => r.querySelector(s);
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3800); }
  const fail = (error) => { toast(error.message || "Terjadi kesalahan"); return true; };

  if (!window.sb) { document.body.classList.remove("wait"); document.body.textContent = "Supabase belum dikonfigurasi (supabase-config.js)."; return; }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return location.replace("index.html");
  const { data: me } = await sb.from("profiles").select("id, username, role").eq("id", session.user.id).maybeSingle();
  if (!me || !["admin", "super_admin"].includes(me.role)) return location.replace("menu.html");
  const isSuper = me.role === "super_admin";

  $("#who").textContent = `${me.username} · ${me.role}`;
  $("#tabUsr").hidden = !isSuper;
  document.body.classList.remove("wait");

  let vendors = [], packs = [], editV = null, editP = null;

  // ---------- Katalog ----------
  async function loadCatalog() {
    const [v, p] = await Promise.all([sb.from("vendors").select("*").order("id"), sb.from("packages").select("*").order("id")]);
    if (v.error || p.error) return fail(v.error || p.error);
    vendors = v.data; packs = p.data; renderCatalog();
  }
  function renderCatalog() {
    $("#vendors").innerHTML = vendors.map((v) => {
      const ps = packs.filter((p) => p.vendor_id === v.id);
      const rows = ps.map((p) => `<tr><td>${esc(p.name)}</td><td>${rp(p.price)}</td><td>${p.stock}</td><td>${p.active ? "Aktif" : "Nonaktif"}</td>
        <td><button data-ep="${p.id}">Edit</button> <button data-dp="${p.id}" class="danger">Hapus</button></td></tr>`).join("");
      return `<section class="vendor ${v.active ? "" : "off"}"><div class="vh"><div><strong>${esc(v.name)}</strong>
        <small>${esc(v.category_label || v.category)} · ${esc(v.area || "-")} · ★ ${esc(v.rating)} · WA: ${v.whatsapp ? esc(v.whatsapp) : "-"}${v.active ? "" : " · NONAKTIF"}</small></div>
        <div class="acts"><button data-ev="${v.id}">Edit</button><button data-dv="${v.id}" class="danger">Hapus</button><button data-np="${v.id}" class="pri">+ Paket</button></div></div>
        <div class="tblwrap"><table><tr><th>Paket</th><th>Harga</th><th>Stok</th><th>Status</th><th></th></tr>${rows || `<tr><td colspan="5" class="note">Belum ada paket.</td></tr>`}</table></div></section>`;
    }).join("") || `<p class="note">Belum ada vendor. Klik "+ Vendor baru".</p>`;
  }

  function openVendor(v) {
    editV = v ? v.id : null;
    const f = $("#vForm").elements; $("#vTitle").textContent = v ? "Edit vendor" : "Vendor baru";
    ["name", "category", "category_label", "area", "location", "tag", "description", "image_url", "whatsapp"].forEach((k) => (f[k].value = v?.[k] ?? ""));
    if (!v) f.category.value = "Trucking";
    f.rating.value = v?.rating ?? 4.5; f.active.checked = v ? v.active : true;
    $("#vDlg").showModal();
  }
  $("#vForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target.elements;
    let wa = f.whatsapp.value.replace(/\D/g, ""); if (wa.startsWith("0")) wa = "62" + wa.slice(1);
    if (wa && !/^[0-9]{9,15}$/.test(wa)) return toast("Nomor WhatsApp harus 9–15 digit, contoh 6281234567890.");
    const img = f.image_url.value.trim();
    if (img && !/^https:\/\//i.test(img)) return toast("Alamat gambar harus diawali https://");
    const row = {
      name: f.name.value.trim(), category: f.category.value, category_label: f.category_label.value.trim() || null,
      area: f.area.value.trim() || null, location: f.location.value.trim() || null, tag: f.tag.value.trim() || null,
      description: f.description.value.trim() || null, image_url: img || null,
      rating: Math.min(5, Math.max(0, Number(f.rating.value) || 4.5)), whatsapp: wa || null, active: f.active.checked
    };
    const { error } = editV ? await sb.from("vendors").update(row).eq("id", editV) : await sb.from("vendors").insert(row);
    if (error) return fail(error);
    $("#vDlg").close(); toast("Vendor tersimpan."); loadCatalog();
  });

  function openPack(vendorId, p) {
    editP = { id: p ? p.id : null, vendor_id: vendorId };
    const f = $("#pForm").elements; $("#pTitle").textContent = p ? "Edit paket" : "Paket baru";
    f.name.value = p?.name ?? ""; f.price.value = p?.price ?? ""; f.stock.value = p?.stock ?? 0;
    f.description.value = p?.description ?? ""; f.active.checked = p ? p.active : true;
    $("#pDlg").showModal();
  }
  $("#pForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target.elements;
    const row = { name: f.name.value.trim(), price: Math.round(Number(f.price.value)), stock: Math.round(Number(f.stock.value)),
      description: f.description.value.trim() || null, active: f.active.checked };
    if (!(row.price >= 0) || !(row.stock >= 0)) return toast("Harga dan stok tidak boleh negatif.");
    const { error } = editP.id ? await sb.from("packages").update(row).eq("id", editP.id)
                               : await sb.from("packages").insert({ ...row, vendor_id: editP.vendor_id });
    if (error) return fail(error);
    $("#pDlg").close(); toast("Paket tersimpan."); loadCatalog();
  });

  // ---------- Pengguna (super admin) ----------
  async function loadUsers() {
    const { data, error } = await sb.from("profiles").select("id, username, email, role, created_at").order("created_at");
    if (error) return fail(error);
    $("#userTable").innerHTML = `<tr><th>Username</th><th>Email</th><th>Peran</th></tr>` + data.map((u) => `<tr><td>${esc(u.username)}</td><td>${esc(u.email)}</td>
      <td>${u.id === me.id ? `<em>${esc(u.role)} (akun Anda)</em>` :
      `<select data-role="${u.id}">${["user", "admin", "super_admin"].map((r) => `<option ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}</select>`}</td></tr>`).join("");
  }
  $("#roleForm").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target.elements;
    const { error } = await sb.rpc("set_role_by_email", { p_email: f.email.value, p_role: f.role.value });
    if (error) return fail(error);
    toast("Peran diperbarui."); e.target.reset(); loadUsers();
  });
  document.addEventListener("change", async (e) => {
    const id = e.target.dataset.role; if (!id) return;
    const { error } = await sb.rpc("set_user_role", { p_user: id, p_role: e.target.value });
    if (error) fail(error); else toast("Peran diperbarui.");
    loadUsers();
  });

  // ---------- Klik umum ----------
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
    if (d.close !== undefined) b.closest("dialog").close();
    if (d.tab) {
      document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
      $("#cat").hidden = d.tab !== "cat"; $("#usr").hidden = d.tab !== "usr";
      if (d.tab === "usr") loadUsers();
    }
    if (b.id === "newV") openVendor(null);
    if (d.ev) openVendor(vendors.find((v) => v.id === Number(d.ev)));
    if (d.np) openPack(Number(d.np), null);
    if (d.ep) { const p = packs.find((x) => x.id === Number(d.ep)); openPack(p.vendor_id, p); }
    if (d.dv && confirm("Hapus vendor ini beserta semua paketnya?")) {
      const { error } = await sb.from("vendors").delete().eq("id", Number(d.dv)); if (!error) toast("Vendor dihapus."); else fail(error); loadCatalog();
    }
    if (d.dp && confirm("Hapus paket ini?")) {
      const { error } = await sb.from("packages").delete().eq("id", Number(d.dp)); if (!error) toast("Paket dihapus."); else fail(error); loadCatalog();
    }
    if (b.id === "out") { await sb.auth.signOut(); localStorage.removeItem("pl_session"); location.href = "index.html"; }
  });

  loadCatalog();
})();
