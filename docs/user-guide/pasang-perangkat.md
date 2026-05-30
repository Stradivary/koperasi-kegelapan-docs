---
sidebar_position: 4
title: Pasang Perangkat
---

import PlaceholderImg from '@site/src/components/PlaceholderImg';

# Pasang Perangkat

Panduan untuk mendaftarkan dan mengkonfigurasi perangkat sebagai terminal operasional (Gate, Terminal, Scout, atau Kiosk).

## Konsep Perangkat

Setiap perangkat fisik (smartphone/tablet) bisa didaftarkan dengan **role** tertentu:

| Role         | Fungsi                   | Lokasi Tipikal      |
| ------------ | ------------------------ | ------------------- |
| **Gate**     | Check-in masuk area      | Pintu masuk parkir  |
| **Terminal** | Checkout & hitung durasi | Pintu keluar parkir |
| **Scout**    | Cek saldo & riwayat      | Meja informasi      |
| **Station**  | Admin full-access        | Kantor admin        |

---

## Langkah-langkah

### 1. Login ke Tenant

Pastikan Anda sudah login ke tenant yang ingin dipasangi perangkat.

<div className="guide-step">
<div className="guide-step__text">

**Prasyarat:**

- Sudah login sebagai admin tenant
- Perangkat memiliki NFC reader (untuk operasi kartu)
- Browser mendukung Web NFC API

**Cek kompatibilitas:**

- Chrome Android 89+ ✅
- Samsung Internet ✅
- iOS Safari ❌ (Web NFC belum didukung)

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Dashboard admin — siap setup perangkat" />
</div>
</div>

---

### 2. Buka Pengaturan Perangkat

Navigasi ke menu **Pengaturan** → **Perangkat**.

<div className="guide-step">
<div className="guide-step__text">

**Cara akses:**

- Tap tab **Pengaturan** di bottom navigation
- Pilih section **Perangkat**
- Tap **"Daftarkan Perangkat Ini"**

**Informasi yang ditampilkan:**

- Device ID (auto-generated)
- Browser & OS yang digunakan
- Status NFC (tersedia/tidak)

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Halaman Pengaturan — section Perangkat" />
</div>
</div>

---

### 3. Pilih Role Perangkat

Tentukan fungsi perangkat ini dalam operasional.

<div className="guide-step">
<div className="guide-step__text">

**Pilihan role:**

- **Gate** — Hanya bisa melakukan check-in
- **Terminal** — Hanya bisa melakukan checkout
- **Scout** — Hanya bisa cek saldo (read-only)
- **Station** — Akses penuh (admin)

**Catatan:**

- Role menentukan mode yang tersedia di perangkat
- Perangkat dengan role spesifik tidak bisa switch ke mode lain
- Station bisa mengakses semua mode

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Pilih role perangkat" />
</div>
</div>

---

### 4. Konfirmasi & Aktivasi

Setelah memilih role, perangkat akan terdaftar dan langsung aktif.

<div className="guide-step">
<div className="guide-step__text">

**Apa yang terjadi:**

- Device ID disimpan di IndexedDB lokal
- Role di-lock untuk perangkat ini
- Perangkat otomatis masuk ke mode yang sesuai
- Data device di-sync ke server saat online

**Setelah aktivasi:**

- Perangkat langsung siap digunakan
- Restart app akan otomatis masuk ke mode yang terdaftar
- Untuk mengubah role, perlu reset dari menu admin

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Perangkat berhasil didaftarkan" />
</div>
</div>

---

### 5. Mode Kiosk (Opsional)

Untuk perangkat yang akan digunakan publik (tanpa supervisi), aktifkan mode kiosk.

<div className="guide-step">
<div className="guide-step__text">

**Mode Kiosk:**

- Menyembunyikan navigasi admin
- Hanya menampilkan UI operasional
- Long-press logo (500ms) untuk akses mode picker
- Cocok untuk perangkat yang dipasang permanen

**Cara aktifkan:**

- Setelah daftar perangkat, toggle **"Mode Kiosk"**
- Atau pilih role Gate/Terminal/Scout (otomatis kiosk)

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Tampilan Mode Kiosk — UI minimal" />
</div>
</div>

---

## Manajemen Perangkat

### Melihat Daftar Perangkat

Di menu **Pengaturan** → **Perangkat**, admin bisa melihat semua perangkat yang terdaftar:

- Nama/ID perangkat
- Role yang ditetapkan
- Status online/offline
- Terakhir aktif

### Reset Perangkat

Untuk mengubah role atau melepas perangkat:

1. Buka **Pengaturan** → **Perangkat**
2. Tap perangkat yang ingin di-reset
3. Pilih **"Reset Perangkat"**
4. Konfirmasi — perangkat kembali ke mode Station

---

## Troubleshooting

| Masalah                          | Solusi                                 |
| -------------------------------- | -------------------------------------- |
| NFC tidak terdeteksi             | Pastikan NFC aktif di Settings Android |
| Web NFC not supported            | Gunakan Chrome Android 89+             |
| Perangkat tidak bisa di-lock     | Pastikan login sebagai admin           |
| Mode tidak berubah setelah setup | Refresh halaman / restart app          |
