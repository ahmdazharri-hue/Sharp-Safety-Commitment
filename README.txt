SAFETY COMMITMENT TWIBBON GENERATOR — P2K3 SEID
Versi 3 | GitHub Pages | HTML, CSS, JavaScript murni

ISI PAKET
- index.html           Halaman generator dan formulir.
- style.css            Tampilan responsif desktop dan smartphone.
- script.js            Pemrosesan foto, teks, tanda tangan, preview, dan PNG.
- twibbon-overlay.png  Artwork original 2048 x 2048 dengan aperture foto transparan.
- README.txt           Petunjuk penggunaan dan deployment.

CARA MENJALANKAN LOKAL
1. Ekstrak semua file ke satu folder.
2. Buka index.html melalui browser modern (Chrome, Edge, Firefox, atau Safari).
3. Untuk pengujian yang paling konsisten, jalankan folder melalui server lokal sederhana.

DEPLOY KE GITHUB PAGES
1. Buka repository: ahmdazharri-hue/Sharp-Safety-Commitment
2. Pastikan branch adalah main dan publishing source adalah /(root).
3. Unggah/replace kelima file dari paket ini ke root repository.
4. Commit perubahan, lalu tunggu GitHub Pages selesai melakukan deployment.
5. Buka URL GitHub Pages repository.

CARA MENGGUNAKAN
1. Pilih foto pribadi.
2. Isi nama lengkap.
3. Isi Komitmen 1 (kiri) dan Komitmen 2 (kanan), masing-masing maksimal 90 karakter.
4. Tanda tangan pada area input menggunakan mouse, stylus, atau jari.
5. Klik "Unduh Twibbon PNG".

CATATAN TEKNIS
- Artwork dan hasil unduhan menggunakan ukuran asli 2048 x 2048 piksel.
- Foto dipotong dengan clipping path lingkaran dan ditempatkan di belakang artwork.
- twibbon-overlay.png dibuat dari PNG original; area kosong di dalam lingkaran menjadi transparan, sementara elemen artwork tetap di lapisan depan.
- Komitmen dirender pada ruang kosong di antara garis putus-putus pertama dan kedua; tidak ada bidang putih tambahan.
- Nama dan tanda tangan dirender di dalam kotak putih SIGNATURE yang sudah ada.
- Seluruh pemrosesan berlangsung di browser. Tidak ada backend, database, atau pengiriman foto ke server.
- Preview ditampilkan pada skala 50%, tetapi menggunakan render dan koordinat artwork 2048 x 2048 yang sama dengan file unduhan.

Jika ingin mengganti desain, pertahankan nama file twibbon-overlay.png dan ukuran 2048 x 2048.
