// PORTLINK — bagian bersama untuk halaman menu dan admin: format, status pesanan, notifikasi.
(() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const fmt = (d) => new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const STATUS = {
    menunggu_konfirmasi: ["Menunggu konfirmasi admin", "#b9770e"], disetujui: ["Disetujui, silakan bayar", "#1e7377"],
    ditolak: ["Ditolak", "#b4412c"], menunggu_verifikasi: ["Menunggu verifikasi pembayaran", "#6b5bb5"],
    dibayar: ["Dibayar", "#2e7d4f"], diproses: ["Diproses", "#2e7d4f"], selesai: ["Selesai", "#4b5d63"], dibatalkan: ["Dibatalkan", "#7a7a7a"]
  };
  const badge = (s) => { const [t, c] = STATUS[s] || [s, "#555"]; return `<span class="pl-badge" style="background:${c}">${esc(t)}</span>`; };

  const st = document.createElement("style");
  st.textContent = `.pl-badge{display:inline-block;padding:3px 9px;border-radius:99px;color:#fff;font-size:11px;font-weight:700}
.pl-bell b{min-width:20px;height:20px;margin-left:6px;padding:0 5px;border-radius:10px;background:#e6a45b;color:#15232b;font-size:11px;display:inline-grid;place-items:center}
.pl-panel{position:fixed;top:70px;right:14px;z-index:70;width:min(340px,calc(100% - 28px));max-height:60vh;overflow:auto;background:#fff;color:#15232b;border:1px solid #dfe3dc;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.25);display:none;text-align:left}
.pl-panel.show{display:block}.pl-panel h4{margin:0;padding:12px 14px;border-bottom:1px solid #eee;font-size:13px}
.pl-n{padding:11px 14px;border-bottom:1px solid #f0f0ec;font-size:12px;cursor:pointer}.pl-n.new{background:#fdf6e8}
.pl-n small{display:block;margin-top:2px;color:#6a7a7f}.pl-empty{padding:18px 14px;color:#6a7a7f;font-size:12px}
.pl-ord{display:grid;gap:6px;margin:12px 0;padding:14px;border:1px solid #dfe3dc;border-radius:12px;background:#fff;font-size:13px}
.pl-ordh{display:flex;justify-content:space-between;align-items:center;gap:8px}.pl-ord small{color:#6a7a7f}`;
  document.head.appendChild(st);

  // Lonceng notifikasi: membaca tabel notifications (RLS membatasi ke milik sendiri).
  function mountBell(host, { btnClass = "", onPick } = {}) {
    host.insertAdjacentHTML("beforeend", `<button type="button" class="pl-bell ${btnClass}">Notifikasi <b>0</b></button><div class="pl-panel"></div>`);
    const btn = host.querySelector(".pl-bell"), panel = host.querySelector(".pl-panel"), cnt = btn.querySelector("b");
    let items = [];
    function render() {
      panel.innerHTML = "<h4>Notifikasi</h4>" + (items.length
        ? items.map((x) => `<div class="pl-n ${x.read ? "" : "new"}" data-o="${x.order_id ?? ""}"><strong>${esc(x.title)}</strong><small>${esc(x.body || "")}</small><small>${fmt(x.created_at)}</small></div>`).join("")
        : '<div class="pl-empty">Belum ada notifikasi.</div>');
    }
    async function load() {
      const { data } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(15);
      items = data || [];
      const n = items.filter((x) => !x.read).length;
      cnt.textContent = n; cnt.style.display = n ? "" : "none";
      if (!panel.classList.contains("show")) render();
    }
    btn.addEventListener("click", async () => {
      panel.classList.toggle("show");
      if (panel.classList.contains("show") && items.some((x) => !x.read)) { render(); await sb.rpc("mark_notifications_read"); cnt.style.display = "none"; }
    });
    panel.addEventListener("click", (e) => { const n = e.target.closest(".pl-n"); if (n) { panel.classList.remove("show"); onPick && onPick(n.dataset.o); } });
    document.addEventListener("click", (e) => { if (!host.contains(e.target)) panel.classList.remove("show"); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
    setInterval(load, 30000);
    load();
    return { reload: load };
  }

  window.PLC = { esc, rp, fmt, STATUS, badge, mountBell };
})();
