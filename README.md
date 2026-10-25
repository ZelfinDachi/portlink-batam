# PORTLINK Batam — PBL Web Fundamental

Prototype marketplace jasa logistik pelabuhan dan industri Batam. Dibuat dengan HTML, CSS, dan JavaScript tanpa framework.

## Fitur
- Layout responsif untuk desktop dan ponsel
- Kategori layanan logistik
- Filter vendor berdasarkan kategori dan area
- Pengurutan nama vendor
- Kartu vendor dari data JavaScript
- Form permintaan penawaran (simulasi front-end)
- Menu navigasi mobile
- Label yang menjelaskan bahwa data vendor/harga adalah simulasi

## Fitur tambahan (v2, semua simulasi)
- Daftar akun (username, email, password minimal 8 karakter + indikator kekuatan) dan login beranimasi bertema pelabuhan
- Pop up kecil saat kursor di kartu vendor, dan jendela detail dengan pilihan paket layanan
- Keranjang yang tersimpan di localStorage (per akun), bisa dibuka lagi kapan saja
- Checkout lalu pembayaran simulasi: transfer bank (BCA, Mandiri, BNI, BRI) dan e-wallet (GoPay, OVO, DANA, ShopeePay)
- File baru: `app.css` dan `app.js` (dimuat setelah `style.css` dan `script.js`)

## Struktur file
```text
portlink-batam/
├── index.html   # Struktur halaman
├── style.css    # Warna, layout, dan responsive design
├── script.js    # Data demo dan interaksi
└── README.md    # Panduan proyek
```

## Cara menjalankan
1. Unduh dan ekstrak ZIP.
2. Buka folder di Visual Studio Code.
3. Buka `index.html` di browser, atau gunakan ekstensi Live Server.
4. Pastikan internet tersedia jika ingin memuat foto dari Unsplash dan Google Fonts.

## Cara mengubah konten
- Nama merek dan teks halaman: edit `index.html`.
- Warna dan tampilan: edit variabel di bagian `:root` pada `style.css`.
- Vendor demo: edit array `vendors` di awal `script.js`.
- Kategori dan lokasi filter: sesuaikan pilihan di `index.html` dan data vendor di `script.js`.

## Publikasi gratis dengan GitHub Pages
1. Buat akun GitHub jika belum punya.
2. Buat repository baru, misalnya `portlink-batam`.
3. Unggah `index.html`, `style.css`, `script.js`, dan `README.md` ke root repository.
4. Buka **Settings → Pages**.
5. Di bagian Build and deployment, pilih **Deploy from a branch**, lalu branch `main` dan folder `/ (root)`.
6. Simpan dan tunggu proses publikasi. GitHub akan memberikan URL demo.

## Batasan versi ini
- Akun, keranjang, dan pesanan hanya disimpan di localStorage browser; tidak ada backend, database sungguhan, atau transaksi pembayaran nyata.
- Form hanya menghasilkan konfirmasi simulasi di browser.
- Vendor, rating, dan harga pada contoh adalah data fiktif/simulasi; jangan menyajikannya sebagai data bisnis nyata.
- Foto diambil dari URL Unsplash dan memerlukan koneksi internet. Pastikan lisensi dan ketentuan aset diperiksa sebelum penggunaan komersial.
- Untuk penggunaan sungguhan diperlukan backend, validasi vendor, kebijakan privasi, keamanan data, dan alur komunikasi transaksi.

## Ide pengembangan lanjutan
1. Tambahkan pencarian teks.
2. Simpan permintaan demo di `localStorage` untuk latihan (bukan data sensitif).
3. Tambahkan halaman detail vendor.
4. Tambahkan backend gratis-tier atau database setelah memahami dasar JavaScript.
