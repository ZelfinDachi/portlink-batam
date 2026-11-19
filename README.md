# PORTLINK Batam

Prototype marketplace jasa logistik pelabuhan dan industri Batam, dibuat untuk proyek PBL Web Fundamental. Front-end memakai HTML, CSS, dan JavaScript tanpa framework. Akun, katalog, pesanan, dan bukti pembayaran disimpan di [Supabase](https://supabase.com). Situs dipublikasikan lewat GitHub Pages.

> Ini prototype untuk belajar dan demo. Data vendor, rating, dan harga adalah data fiktif. Pembayaran hanya simulasi: tidak ada uang yang diproses dan belum ada payment gateway.

## Alur pemesanan

1. Pelanggan memasukkan paket ke keranjang lalu mengisi data pemesan (perusahaan, kontak, WhatsApp, asal, tujuan, tanggal, catatan). Pesanan berstatus **menunggu konfirmasi**.
2. Admin dan super admin mendapat notifikasi, memeriksa data lengkap pelanggan di tab **Pesanan**, lalu **ACC** atau **Tolak** (alasan terlihat oleh pelanggan, stok dikembalikan).
3. Setelah disetujui, pelanggan memilih metode pembayaran (bank atau e-wallet, simulasi) di **Pesanan saya** dan **mengunggah bukti pembayaran**.
4. Admin membuka bukti pembayaran, lalu memilih **Pembayaran valid** atau **tidak valid** (pelanggan bisa membayar ulang).
5. Admin mengubah status menjadi **diproses** lalu **selesai**. Pelanggan mendapat notifikasi di setiap langkah.

Status: `menunggu_konfirmasi` → `disetujui` → `menunggu_verifikasi` → `dibayar` → `diproses` → `selesai`, serta `ditolak` dan `dibatalkan`. Pelanggan dapat membatalkan pesanan selama belum dibayar.

## Fitur

**Pelanggan**
- Daftar akun (username, email, password minimal 8 karakter), login, lupa dan reset password lewat email
- Katalog dari database dengan filter kategori, filter area, pop up ringkas, detail paket, harga, dan stok
- Tombol WhatsApp ke vendor (jika nomornya diisi admin)
- Keranjang per akun, form pemesanan, riwayat pesanan dan pembayaran, notifikasi di dalam situs
- Unggah bukti pembayaran: JPG, PNG, WebP, atau PDF, maksimal 10 MB

**Admin**
- Kelola vendor dan paket (nama, jenis katalog, harga, stok, deskripsi, gambar, rating, nomor WhatsApp, aktif atau tidak). Perubahan langsung tampil di menu
- Tab Pesanan: data pelanggan lengkap, ACC atau tolak, melihat bukti pembayaran, verifikasi pembayaran, ubah status

**Super admin**
- Semua kemampuan admin, ditambah menentukan siapa yang menjadi admin atau super admin
- Menghapus akun admin atau user (tidak bisa menghapus akun sendiri atau akun super admin, dan ditolak bila pengguna masih punya pesanan aktif; riwayat pesanan tetap tersimpan)

**Keamanan dan sesi**
- Keluar otomatis bila tidak aktif (15 menit pelanggan, 10 menit admin) dengan peringatan hitung mundur 60 detik, dan batas maksimal 8 jam per sesi login. Angkanya bisa diubah di `session-timer.js`

## Peran pengguna

| Peran | Bisa apa |
|---|---|
| `user` | Belanja, melihat pesanan dan notifikasi sendiri, membayar pesanan yang disetujui |
| `admin` | Ditambah mengelola katalog dan memproses pesanan |
| `super_admin` | Ditambah mengatur peran pengguna |

Pembatasan peran dijaga oleh aturan keamanan (Row Level Security) dan fungsi database, bukan hanya oleh tampilan halaman.

## Struktur file

```text
portlink-batam/
├── index.html           # Halaman login dan daftar
├── login.css            # Gaya halaman login
├── login.js             # Daftar, masuk, lupa dan reset password (Supabase Auth)
├── menu.html            # Halaman utama setelah login
├── style.css, app.css   # Gaya halaman menu
├── script.js            # Filter, kartu vendor, form penawaran
├── app.js               # Keranjang dan detail layanan
├── catalog.js           # Memuat vendor dan paket dari Supabase
├── pl-common.js         # Bagian bersama: format, status pesanan, notifikasi
├── orders.js            # Form pemesanan, riwayat, pembayaran, unggah bukti
├── session-timer.js     # Manajemen waktu sesi
├── auth-guard.js        # Penjaga halaman menu dan tombol Keluar
├── admin.html, admin.js # Halaman admin: katalog dan pengguna
├── admin-orders.js      # Halaman admin: tab Pesanan
├── supabase-config.js   # URL dan kunci publik Supabase
├── database/
│   ├── supabase-schema.sql   # 1. Tabel dasar, RLS, data awal
│   ├── supabase-roles.sql    # 2. Peran user, admin, super_admin
│   ├── supabase-orders.sql   # 3. Alur pesanan, notifikasi, bukti pembayaran (Storage)
│   └── supabase-hapus-akun.sql # 4. Super admin menghapus akun admin atau user
└── README.md
```

## Menyiapkan Supabase

1. Buat proyek baru di supabase.com (region Singapore paling dekat).
2. Di **SQL Editor**, jalankan tiga file di folder `database/` **berurutan, satu per satu, utuh**: `supabase-schema.sql`, `supabase-roles.sql`, `supabase-orders.sql`, lalu `supabase-hapus-akun.sql`. Jangan menjalankan skema pertama dua kali. File ketiga dan keempat aman dijalankan ulang.
3. Salin Project URL dan kunci publik (Publishable atau anon key) dari **Project Settings → API Keys** ke `supabase-config.js`. Jangan pernah menaruh kunci secret atau `service_role` di repository.
4. Di **Authentication → URL Configuration**, isi Site URL dengan alamat GitHub Pages, dan tambahkan `https://namaakun.github.io/nama-repo/**` ke Redirect URLs.
5. Daftar akun lewat situs, lalu jadikan akun itu super admin lewat SQL Editor:
   ```sql
   update public.profiles set role = 'super_admin' where email = lower('EMAIL_ANDA');
   ```
6. Setelah menjalankan `supabase-orders.sql`, cek **Storage**: harus ada bucket **payment-proofs** berstatus privat dengan batas ukuran file 10 MB.

Catatan: batas ukuran file global Storage pada proyek juga berlaku. Bila perlu file lebih besar dari 10 MB, ubah angka `10485760` di SQL dan `10 * 1024 * 1024` di `orders.js`, dan cek batas global di pengaturan Storage.

## Pengaturan Supabase yang perlu diperhatikan

- **Minimum password length:** set ke 8 di pengaturan Email Authentication, karena aturan 8 karakter di browser bisa dilewati.
- **Confirm email:** boleh dimatikan saat uji coba. Sebelum dibagikan ke publik, nyalakan lagi dan pasang SMTP sendiri.
- **Email reset password:** layanan email bawaan Supabase sangat terbatas. Untuk pengguna sungguhan perlu SMTP khusus (misalnya Brevo atau Resend).
- **Timeout sesi di server** (inactivity timeout dan time-box) tersedia di paket berbayar. `session-timer.js` adalah pengamannya di sisi browser.
- **Proyek gratis dijeda otomatis** bila lama tidak dipakai. Pastikan proyek aktif sebelum presentasi.

## Menjalankan di komputer

1. Buka folder di Visual Studio Code.
2. Jalankan `index.html` dengan ekstensi Live Server.
3. Tambahkan alamat Live Server (misalnya `http://127.0.0.1:5500/**`) ke Redirect URLs di Supabase, dan hapus setelah selesai.

## Publikasi gratis dengan GitHub Pages

1. Buat repository publik di GitHub.
2. Unggah semua file situs ke folder paling luar. Folder `database/` boleh ikut diunggah sebagai dokumentasi.
3. Buka **Settings → Pages**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu Save.
4. Perbarui file kapan saja dengan **Add file → Upload files** memakai nama file yang sama. Nama harus persis sama dengan yang dipanggil di HTML, termasuk huruf besar dan kecil.

## Keamanan

- Hanya kunci publik yang ada di repository. Aturan RLS membatasi apa yang bisa dibaca dan diubah oleh kunci itu.
- Password disimpan sebagai hash oleh Supabase Auth, bukan oleh kode situs, dan tidak pernah ada di tabel aplikasi.
- Peran dan penghapusan akun hanya bisa dilakukan lewat fungsi database yang dibatasi untuk super admin. Sesi akun yang baru dihapus bisa tetap aktif sampai tokennya kedaluwarsa (bawaan sekitar 1 jam), tetapi datanya sudah tidak bisa diakses.
- Persetujuan pesanan, verifikasi pembayaran, dan perubahan status hanya bisa dilakukan admin lewat fungsi database. Harga dan stok dihitung di server.
- Bukti pembayaran disimpan di bucket privat. Pelanggan hanya bisa mengunggah ke folder miliknya, dan hanya pemilik serta admin yang bisa membacanya. Admin membukanya lewat tautan sementara 5 menit.
- Teks dari database di-escape sebelum ditampilkan sebagai HTML.
- Pengecekan di halaman (`auth-guard.js`, `session-timer.js`) mengatur tampilan. Perlindungan data yang sebenarnya ada di database.

## Batasan versi ini

- Pembayaran simulasi: admin memverifikasi sendiri dari bukti yang diunggah, tanpa integrasi bank atau payment gateway.
- Notifikasi hanya di dalam situs (diperbarui tiap 30 detik atau saat tab dibuka). Belum ada notifikasi email atau WhatsApp otomatis.
- Form Permintaan Penawaran masih simulasi dan belum tersimpan di database.
- Filter area memakai daftar tetap di `menu.html`.
- `app.js` dan `menu.html` masih memuat kotak login lokal lama yang tidak terpakai. Aman dibiarkan, tetapi sebaiknya dibersihkan.
- Bukti pembayaran yang sudah diganti tidak dihapus otomatis dari Storage.
- Foto dan font dimuat dari Unsplash dan Google Fonts, jadi perlu internet. Periksa lisensi aset sebelum penggunaan komersial.
- GitHub Pages tidak untuk menjalankan toko atau transaksi komersial sungguhan. Untuk itu diperlukan hosting yang sesuai, payment gateway resmi, kebijakan privasi, dan validasi vendor.

## Ide pengembangan lanjutan

1. CAPTCHA di form daftar dan login (Cloudflare Turnstile atau hCaptcha)
2. Menyimpan Permintaan Penawaran ke database
3. Notifikasi email atau WhatsApp otomatis
4. Akun vendor, supaya vendor mengelola katalog dan pesanannya sendiri
5. Payment gateway resmi dan konfirmasi pembayaran otomatis
6. Kebijakan privasi dan halaman syarat layanan
