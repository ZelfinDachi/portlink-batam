// PORTLINK — katalog dari Supabase. Dimuat SETELAH script.js dan app.js.
// Vendor dan paket yang diedit admin otomatis tampil di sini, tanpa mengubah file di GitHub.
(() => {
  if (!window.sb || typeof vendors === "undefined" || !window.PL_PKG) return;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const short = (n) => n >= 1e6
    ? "Rp" + (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt"
    : "Rp" + Math.round(n / 1000).toLocaleString("id-ID") + " rb";
  const PLACEHOLDER = "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&w=900&q=80";
  const demo = vendors.slice(); // cadangan bila database tidak terjangkau

  async function load() {
    const [v, p] = await Promise.all([
      sb.from("vendors").select("*").eq("active", true).order("id"),
      sb.from("packages").select("*").eq("active", true).order("id")
    ]);
    if (v.error || p.error) {
      console.error(v.error || p.error);
      if (!window.PL_LIVE) { vendors.length = 0; vendors.push(...demo); renderVendors(); }
      showToast("Katalog online belum bisa dimuat. Menampilkan data contoh.");
      return;
    }

    const pk = window.PL_PKG;
    Object.keys(pk).forEach((k) => delete pk[k]);
    vendors.length = 0;
    v.data.forEach((r) => {
      const mine = p.data.filter((x) => x.vendor_id === r.id);
      // Semua teks dari database di-escape karena akan dimasukkan ke HTML.
      pk[r.id] = mine.map((x) => [esc(x.name), Number(x.price), x.id, x.stock]);
      const min = mine.length ? Math.min(...mine.map((x) => Number(x.price))) : null;
      vendors.push({
        id: r.id, name: esc(r.name), rawName: r.name, category: r.category,
        categoryLabel: esc(r.category_label || String(r.category).toUpperCase()),
        area: esc(r.area || "Batam"), location: esc(r.location || r.area || "Batam"),
        price: min === null ? "Minta penawaran" : "Dari " + short(min), unit: min === null ? "" : "/ paket",
        description: esc(r.description || ""), image: esc(r.image_url || PLACEHOLDER),
        rating: Number(r.rating).toFixed(1), tag: esc(r.tag || r.category), whatsapp: r.whatsapp || ""
      });
    });
    window.PL_LIVE = true;

    // Samakan keranjang dengan katalog terbaru: paket yang dihapus atau nonaktif dibuang, posisi paket diperbarui.
    if (window.PL_CART) {
      PL_CART.set(PL_CART.get().flatMap((l) => {
        const pi = (pk[l.vid] || []).findIndex((x) => x[2] === l.pid);
        return l.pid && pi >= 0 ? [{ ...l, pi }] : [];
      }));
    }
    renderVendors();
  }

  window.PL_reload = load;
  load();
  // Saat tab dibuka lagi, ambil katalog terbaru (kecuali sedang membuka dialog atau keranjang).
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !document.querySelector("dialog[open], .drawer.open")) load();
  });
})();
