---
sidebar_position: 2
title: Register Tenant
---

import PlaceholderImg from '@site/src/components/PlaceholderImg';

# Register Tenant

Langkah pertama untuk menggunakan Koperasi Kegelapan adalah mendaftarkan **Tenant** (organisasi/koperasi) Anda.

## Prasyarat

- Perangkat dengan browser modern (Chrome/Edge/Safari)
- Akses ke URL aplikasi

---

## Langkah-langkah

### 1. Buka Halaman Login

Akses aplikasi melalui browser. Anda akan melihat halaman login dengan opsi untuk membuat tenant baru.

<div className="guide-step">
<div className="guide-step__text">

**Yang perlu dilakukan:**

- Buka URL aplikasi di browser
- Pada halaman login, tap tombol **"Buat Koperasi Baru"**

**Tips:**

- Pastikan browser mendukung Web NFC (Chrome Android 89+)
- Tambahkan ke Home Screen untuk pengalaman terbaik

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Halaman Login - tombol Buat Koperasi Baru" />
</div>
</div>

---

### 2. Isi Data Tenant

Form registrasi akan muncul. Isi informasi dasar koperasi Anda.

<div className="guide-step">
<div className="guide-step__text">

**Field yang perlu diisi:**

- **Nama Koperasi** - Nama organisasi Anda (contoh: "Koperasi Maju Bersama")
- **Kode Tenant** - Kode unik pendek (auto-generated, bisa diedit)
- **PIN Admin** - PIN 6 digit untuk akses admin

**Validasi:**

- Nama minimal 3 karakter
- PIN harus 6 digit angka
- Kode tenant harus unik di sistem

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Form Registrasi Tenant" />
</div>
</div>

---

### 3. Konfirmasi & Simpan

Setelah mengisi data, sistem akan membuat tenant secara lokal.

<div className="guide-step">
<div className="guide-step__text">

**Apa yang terjadi:**

- Tenant dibuat di penyimpanan lokal (IndexedDB)
- Master key di-generate untuk enkripsi kartu
- Anda otomatis login sebagai admin tenant tersebut

**Penting:**

- Data tenant awalnya hanya ada di perangkat ini
- Sinkronisasi ke server terjadi otomatis saat online
- Anda bisa menggunakan sistem secara offline sepenuhnya

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Konfirmasi tenant berhasil dibuat" />
</div>
</div>

---

## Setelah Registrasi

Setelah tenant berhasil dibuat, Anda akan diarahkan ke **Dashboard Admin** (Station mode). Langkah selanjutnya:

1. [Login](./login.md) - Memahami cara login kembali
2. [Pasang Perangkat](./pasang-perangkat.md) - Setup perangkat tambahan
3. [Operasi Kartu](./operasi-kartu.md) - Mulai issue kartu NFC pertama

---

## Troubleshooting

| Masalah                   | Solusi                               |
| ------------------------- | ------------------------------------ |
| Kode tenant sudah dipakai | Ganti dengan kode lain yang unik     |
| Form tidak muncul         | Pastikan JavaScript aktif di browser |
| Data tidak tersimpan      | Periksa storage permission browser   |
