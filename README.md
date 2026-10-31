# PORTLINK Batam

Prototype marketplace jasa logistik pelabuhan dan industri Batam, dibuat untuk proyek PBL Web Fundamental. Front-end memakai HTML, CSS, dan JavaScript tanpa framework. Akun, katalog, dan pesanan disimpan di [Supabase](https://supabase.com). Situs dipublikasikan lewat GitHub Pages.

> Ini prototype untuk belajar dan demo. Data vendor, rating, dan harga adalah data fiktif. Pembayaran hanya simulasi dan tidak ada uang yang diproses.

## Fitur

**Pengguna**
- Halaman login dan daftar akun (username, email, password minimal 8 karakter)
- Lupa password lewat email (membutuhkan SMTP, lihat bagian Pengaturan Supabase)
- Katalog vendor dengan filter kategori, filter area, dan pengurutan nama
- Pop up ringkas saat kursor di kartu vendor, dan jendela detail berisi paket, harga, dan stok
- Tombol WhatsApp ke vendor (jika nomornya diisi admin)
- Keranjang yang tersimpan per akun di browser
- Checkout dan pembayaran simulasi: transfer bank (BCA, Mandiri, BNI, BRI) dan e-wallet (GoPay, OVO, DANA, ShopeePay)
- Pesanan tersimpan di database, dengan harga dan stok dihitung di server

**Admin**
- Kelola vendor: nama, jenis katalog, area, deskripsi, gambar, rating, nomor WhatsApp, tampil atau tidak
- Kelola paket: nama, harga, jumlah stok, deskripsi, aktif atau tidak
- Perubahan langsung tampil di menu tanpa mengubah file di GitHub

**Super admin**
- Semua kemampuan admin
- Menentukan siapa yang menjadi admin atau super admin

## Peran pengguna

| Peran | Bisa apa |
|---|---|
| `user` | Belanja dan melihat pesanan sendiri |
| `admin` | Ditambah mengelola katalog |
| `super_admin` | Ditambah mengatur peran pengguna |

Pembatasan peran dijaga oleh aturan keamanan (Row Level Security) di database, bukan hanya oleh tampilan halaman.

## Struktur file

```text
portlink-batam/
├── index.html           # Halaman login dan daftar
├── login.css            # Gaya halaman login
├── login.js             # Daftar, masuk, lupa dan reset password (Supabase Auth)
├── menu.html            # Halaman utama setelah login (katalog, keranjang, checkout)
├── style.css            # Gaya halaman menu
├── app.css              # Gaya keranjang, detail, dan pembayaran
├── script.js            # Filter, kartu vendor, dan form penawaran
├── app.js               # Keranjang, detail layanan, dan checkout
├── catalog.js           # Memuat vendor dan paket dari Supabase
├── admin.html           # Halaman admin (katalog dan pengguna)
├── admin.js             # Logika halaman admin
├── auth-guard.js        # Penjaga halaman menu dan tombol Keluar
├── supabase-config.js   # URL dan kunci publik Supabase
└── README.md
```

File SQL (`supabase-schema.sql` dan `supabase-roles.sql`) dijalankan di Supabase, bukan di situs. Simpan di folder `database/` kalau ingin ikut didokumentasikan di repository.

## Cara menyiapkan Supabase

1. Buat proyek baru di supabase.com (region Singapore paling dekat).
2. Buka **SQL Editor**, lalu jalankan `supabase-schema.sql`, kemudian `supabase-roles.sql`. Jalankan satu per satu, dan jangan menjalankan skema pertama dua kali.
3. Salin Project URL dan kunci publik (Publishable atau anon key) dari **Project Settings → API Keys**, lalu isi ke `supabase-config.js`. Jangan pernah menaruh kunci secret atau `service_role` di repository.
4. Di **Authentication → URL Configuration**, isi Site URL dengan alamat GitHub Pages, dan tambahkan `https://namaakun.github.io/nama-repo/**` ke Redirect URLs.
5. Daftar akun lewat situs, lalu jadikan akun itu super admin lewat SQL Editor:
   ```sql
   update public.profiles set role = 'super_admin' where email = lower('EMAIL_ANDA');
   ```

## Pengaturan Supabase yang perlu diperhatikan

- **Minimum password length:** set ke 8 di pengaturan Email Authentication, karena aturan 8 karakter di browser bisa dilewati.
- **Confirm email:** boleh dimatikan saat uji coba. Sebelum dibagikan ke publik, nyalakan lagi dan pasang SMTP sendiri.
- **Email reset password:** layanan email bawaan Supabase sangat terbatas, jadi untuk pengguna sungguhan perlu SMTP khusus (misalnya Brevo atau Resend).
- **Proyek gratis dijeda otomatis** jika lama tidak dipakai. Buka dashboard dan pastikan proyek aktif sebelum presentasi.

## Menjalankan di komputer

1. Buka folder di Visual Studio Code.
2. Jalankan `index.html` dengan ekstensi Live Server.
3. Tambahkan alamat Live Server (misalnya `http://127.0.0.1:5500/**`) ke Redirect URLs di Supabase, dan hapus setelah selesai.

## Publikasi gratis dengan GitHub Pages

1. Buat repository publik di GitHub.
2. Unggah semua file situs ke folder paling luar (bukan di dalam subfolder), lalu **Commit changes**.
3. Buka **Settings → Pages**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu Save.
4. Tunggu 1–2 menit. Perbarui file kapan saja dengan **Add file → Upload files** memakai nama file yang sama.

Nama file harus persis sama dengan yang dipanggil di HTML, termasuk huruf besar dan kecil.

## Keamanan

- Hanya kunci publik yang boleh ada di repository. Aturan RLS membatasi apa yang bisa dibaca dan diubah oleh kunci itu.
- Peran hanya bisa diubah lewat fungsi database yang dibatasi untuk super admin.
- Harga dan stok pesanan dihitung di server lewat fungsi `place_order`, sehingga tidak bisa diubah dari browser.
- Teks dari database di-escape sebelum ditampilkan sebagai HTML.
- Pengecekan login di halaman (`auth-guard.js`) hanya mengatur tampilan. Perlindungan data yang sebenarnya ada di database.

## Batasan versi ini

- Pembayaran hanya simulasi. Tombol "Saya sudah bayar" tidak mengubah status pesanan, dan belum ada payment gateway.
- Pesanan masuk dengan status `menunggu_pembayaran`. Belum ada halaman Pesanan untuk admin maupun pembeli, jadi status diubah lewat Table Editor Supabase.
- Form Permintaan Penawaran masih simulasi dan belum tersimpan di database.
- Filter area memakai daftar tetap di `menu.html`.
- Perubahan katalog dari admin tampil saat halaman dimuat ulang atau tab dibuka kembali, belum real-time.
- Foto dan font dimuat dari Unsplash dan Google Fonts, jadi perlu internet. Periksa lisensi aset sebelum penggunaan komersial.
- GitHub Pages tidak untuk menjalankan toko atau transaksi komersial sungguhan. Untuk itu diperlukan hosting yang sesuai, payment gateway resmi, kebijakan privasi, dan validasi vendor.

## Ide pengembangan lanjutan

1. Tab Pesanan di admin dan halaman Pesanan saya untuk pembeli
2. Menyimpan Permintaan Penawaran ke database
3. Pencarian teks, favicon, dan halaman kebijakan privasi
4. Payment gateway resmi dan konfirmasi pembayaran otomatis
5. Akun vendor, supaya vendor bisa mengelola katalog dan pesanannya sendiri
