// PORTLINK BATAM — JavaScript dasar untuk interaksi halaman.
// Data vendor di bawah adalah DATA SIMULASI, bukan perusahaan sungguhan.

const vendors = [
  {
    id: 1, name: "Nusa Container Transport", category: "Trucking", categoryLabel: "TRUCKING & KONTAINER",
    area: "Batu Ampar", location: "Batu Ampar, Batam", price: "Dari Rp850 rb", unit: "/ perjalanan",
    description: "Contoh layanan angkutan kontainer untuk kebutuhan industri dan distribusi.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
    rating: "4.8", tag: "Armada kontainer"
  },
  {
    id: 2, name: "Selat Cargo Solutions", category: "Forwarding", categoryLabel: "FREIGHT FORWARDING",
    area: "Sekupang", location: "Sekupang, Batam", price: "Minta penawaran", unit: "",
    description: "Contoh profil jasa koordinasi pengiriman kargo dan dukungan dokumen.",
    image: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&w=900&q=80",
    rating: "4.9", tag: "Kargo & dokumen"
  },
  {
    id: 3, name: "Kabil Storage Hub", category: "Gudang", categoryLabel: "GUDANG & PENYIMPANAN",
    area: "Kabil", location: "Kabil, Batam", price: "Dari Rp35 rb", unit: "/ m² / hari",
    description: "Contoh layanan penyimpanan barang dan pengelolaan stok sementara.",
    image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=900&q=80",
    rating: "4.7", tag: "Penyimpanan"
  },
  {
    id: 4, name: "Batam Lift & Handling", category: "Alat berat", categoryLabel: "ALAT BERAT & HANDLING",
    area: "Muka Kuning", location: "Muka Kuning, Batam", price: "Minta penawaran", unit: "",
    description: "Contoh katalog penyewaan alat bantu pemindahan barang untuk proyek.",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    rating: "4.8", tag: "Peralatan proyek"
  },
  {
    id: 5, name: "Marina Port Support", category: "Marine", categoryLabel: "MARINE & PORT SUPPORT",
    area: "Batu Ampar", location: "Batu Ampar, Batam", price: "Minta penawaran", unit: "",
    description: "Contoh profil layanan pendukung kebutuhan operasional maritim.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    rating: "4.6", tag: "Dukungan maritim"
  },
  {
    id: 6, name: "Muka Kuning Distribution", category: "Trucking", categoryLabel: "TRUCKING & DISTRIBUSI",
    area: "Muka Kuning", location: "Muka Kuning, Batam", price: "Dari Rp600 rb", unit: "/ perjalanan",
    description: "Contoh layanan distribusi barang antarlokasi industri di Batam.",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80",
    rating: "4.7", tag: "Distribusi industri"
  }
];

const vendorGrid = document.getElementById("vendorGrid");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const serviceSelect = document.getElementById("serviceSelect");
const areaSelect = document.getElementById("areaSelect");
const sortSelect = document.getElementById("sortSelect");
const searchForm = document.getElementById("searchForm");
const quoteModal = document.getElementById("quoteModal");
const quoteForm = document.getElementById("quoteForm");
const successMessage = document.getElementById("successMessage");
const toast = document.getElementById("toast");

let activeSearch = "";
let showingAll = false;

// Membuat satu kartu vendor dari data.
function createVendorCard(vendor) {
  return `
    <article class="vendor-card">
      <div class="vendor-image">
        <img src="${vendor.image}" alt="Ilustrasi layanan ${vendor.categoryLabel.toLowerCase()}" loading="lazy">
        <span class="vendor-type">${vendor.categoryLabel}</span>
      </div>
      <div class="vendor-body">
        <div class="vendor-meta"><span>⌖ ${vendor.location}</span><span class="vendor-rating">★ ${vendor.rating}</span></div>
        <h3 class="vendor-name">${vendor.name}</h3>
        <p class="vendor-desc">${vendor.description}</p>
        <div class="vendor-foot">
          <div class="vendor-price"><small>Harga indikatif demo</small><strong>${vendor.price}</strong> <small>${vendor.unit}</small></div>
          <button class="vendor-action" data-vendor="${vendor.id}">Detail / RFQ ↗</button>
        </div>
      </div>
    </article>`;
}

// Memfilter vendor berdasarkan kategori, area, dan kata pencarian.
function getFilteredVendors() {
  let filtered = vendors.filter((vendor) => {
    const categoryMatches = serviceSelect.value === "all" || vendor.category === serviceSelect.value;
    const areaMatches = areaSelect.value === "all" || vendor.area === areaSelect.value;
    const searchText = `${vendor.name} ${vendor.category} ${vendor.description} ${vendor.area}`.toLowerCase();
    const textMatches = searchText.includes(activeSearch.toLowerCase());
    return categoryMatches && areaMatches && textMatches;
  });

  if (sortSelect.value === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }
  return filtered;
}

// Menampilkan hasil ke halaman.
function renderVendors() {
  const filtered = getFilteredVendors();
  const visibleVendors = showingAll ? filtered : filtered.slice(0, 6);

  vendorGrid.innerHTML = visibleVendors.map(createVendorCard).join("");
  resultCount.textContent = `Menampilkan ${visibleVendors.length} dari ${filtered.length} vendor demo`;
  emptyState.classList.toggle("hidden", filtered.length !== 0);
  document.getElementById("showAllBtn").classList.toggle("hidden", filtered.length <= 6 || showingAll);

  // Tombol detail membuka form permintaan dengan kategori terpilih.
  vendorGrid.querySelectorAll("[data-vendor]").forEach((button) => {
    button.addEventListener("click", () => {
      const vendor = vendors.find((item) => item.id === Number(button.dataset.vendor));
      (window.openDetail || openQuoteModal)(vendor);
    });
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function openQuoteModal(vendor = null) {
  quoteForm.classList.remove("hidden");
  successMessage.classList.add("hidden");
  quoteForm.reset();
  if (vendor) {
    const serviceMap = {
      "Trucking": "Trucking & Kontainer",
      "Forwarding": "Freight Forwarding",
      "Gudang": "Gudang & Penyimpanan",
      "Alat berat": "Alat Berat & Handling",
      "Marine": "Marine & Port Support"
    };
    quoteForm.elements.service.value = serviceMap[vendor.category] || "";
    quoteForm.elements.origin.value = vendor.area;
    quoteForm.elements.details.value = `Saya ingin mengetahui detail layanan dari ${vendor.name}. (Vendor contoh untuk demo PBL)`;
  }
  if (typeof quoteModal.showModal === "function") {
    quoteModal.showModal();
  } else {
    showToast("Browser Anda belum mendukung dialog. Coba browser versi terbaru.");
  }
}

// Form pencarian utama.
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  activeSearch = "";
  showingAll = false;
  renderVendors();
  document.getElementById("vendor").scrollIntoView({ behavior: "smooth" });
});

// Filter langsung memperbarui kartu.
serviceSelect.addEventListener("change", () => { showingAll = false; renderVendors(); });
areaSelect.addEventListener("change", () => { showingAll = false; renderVendors(); });
sortSelect.addEventListener("change", renderVendors);

// Klik kategori layanan akan mengisi filter lalu menuju katalog.
document.querySelectorAll("[data-category]").forEach((card) => {
  card.addEventListener("click", () => {
    serviceSelect.value = card.dataset.category;
    showingAll = false;
    renderVendors();
    document.getElementById("vendor").scrollIntoView({ behavior: "smooth" });
  });
});

document.getElementById("showAllBtn").addEventListener("click", () => {
  showingAll = true;
  renderVendors();
});

document.getElementById("resetFilters").addEventListener("click", () => {
  serviceSelect.value = "all";
  areaSelect.value = "all";
  sortSelect.value = "recommended";
  activeSearch = "";
  showingAll = false;
  renderVendors();
});

document.getElementById("navQuote").addEventListener("click", () => openQuoteModal());
document.getElementById("ctaQuote").addEventListener("click", () => openQuoteModal());
document.getElementById("closeModal").addEventListener("click", () => quoteModal.close());
document.getElementById("finishModal").addEventListener("click", () => quoteModal.close());

// Klik area gelap di luar kotak modal akan menutup dialog.
quoteModal.addEventListener("click", (event) => {
  if (event.target === quoteModal) quoteModal.close();
});

// Simulasi pengiriman formulir: tidak ada server atau email yang dihubungi.
quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(quoteForm);
  const company = formData.get("company");
  const service = formData.get("service");
  const origin = formData.get("origin");
  const destination = formData.get("destination");
  const requestNumber = "PL-" + Math.floor(1000 + Math.random() * 9000);

  quoteForm.classList.add("hidden");
  successMessage.classList.remove("hidden");
  document.getElementById("successText").textContent =
    `Nomor demo ${requestNumber} dibuat untuk ${company}. Kebutuhan ${service} dari ${origin} ke ${destination} telah ditampilkan sebagai simulasi. Tidak ada data yang dikirim ke vendor.`;
});

// Menu hamburger untuk layar kecil.
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "×" : "☰";
});
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

// Tampilan awal.
renderVendors();
