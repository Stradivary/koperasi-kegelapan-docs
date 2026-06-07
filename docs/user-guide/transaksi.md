---
sidebar_position: 8
title: Transaksi
---

# Transaksi

Panduan untuk melihat, memahami, dan mengelola riwayat transaksi di sistem.

## Jenis Transaksi

| Tipe        | Deskripsi              | Efek Saldo    |
| ----------- | ---------------------- | ------------- |
| `ISSUE`     | Penerbitan kartu baru  | Saldo = 0     |
| `TOPUP`     | Pengisian saldo        | + Nominal     |
| `CHECK_IN`  | Masuk area (Gate)      | Tidak berubah |
| `CHECK_OUT` | Keluar area (Terminal) | - Tarif       |
| `BLOCK`     | Pemblokiran kartu      | Tidak berubah |
| `UNBLOCK`   | Pembukaan blokir       | Tidak berubah |

---

## Contoh Transaksi

### Top-up Berhasil

<div className="guide-step">
<div className="guide-step__text">

**Informasi yang dicatat:**

- Tipe: `TOPUP`
- Nominal yang diisi
- Saldo sebelum & sesudah
- Timestamp
- Perangkat yang memproses

</div>
<div className="guide-step__image">

![Transaksi Top-up berhasil](../../assets/images/topup_6_success.jpeg)

</div>
</div>

---

### Check-in Berhasil

<div className="guide-step">
<div className="guide-step__text">

**Informasi yang dicatat:**

- Tipe: `CHECK_IN`
- Waktu masuk
- Nama anggota
- UID kartu
- Perangkat Gate yang memproses

</div>
<div className="guide-step__image">

![Transaksi Check-in berhasil](../../assets/images/check_in_success.jpeg)

</div>
</div>

---

### Checkout Berhasil

<div className="guide-step">
<div className="guide-step__text">

**Informasi yang dicatat:**

- Tipe: `CHECK_OUT`
- Waktu masuk & keluar
- Durasi parkir
- Tarif yang dikenakan
- Saldo sebelum & sesudah

</div>
<div className="guide-step__image">

![Transaksi Checkout berhasil](../../assets/images/checkout_success.jpeg)

</div>
</div>

---

## Melihat Riwayat Transaksi

### Dari Menu Transaksi

<div className="guide-step">
<div className="guide-step__text">

**Akses:**

- Tap tab **Transaksi** di bottom navigation
- Daftar transaksi ditampilkan terbaru di atas

**Informasi per transaksi:**

- Tipe transaksi (icon & warna)
- Nama anggota / UID kartu
- Nominal (jika ada)
- Waktu transaksi
- Perangkat yang memproses

</div>
<div className="guide-step__image">

![Daftar riwayat transaksi](../../assets/images/transaction.png)

</div>
</div>

---

### Filter & Pencarian

<div className="guide-step">
<div className="guide-step__text">

**Filter yang tersedia:**

- **Tipe:** Semua / Top-up / Check-in / Checkout / Issue
- **Periode:** Hari ini / Minggu ini / Bulan ini / Custom
- **Anggota:** Filter per anggota tertentu
- **Perangkat:** Filter per device yang memproses

**Search:**

- Cari berdasarkan nama anggota
- Cari berdasarkan UID kartu

</div>
<div className="guide-step__image">

![Filter & pencarian transaksi](../../assets/images/transaction_search.png)

</div>
</div>

---

## Transaksi & Sinkronisasi

### Status Sync

<div className="guide-step">
<div className="guide-step__text">

**Indikator status:**

- 🟢 **Synced** - Sudah tersimpan di server
- 🟡 **Pending** - Menunggu koneksi untuk sync
- 🔴 **Conflict** - Ada konflik yang perlu resolusi

**Cara kerja sync:**

1. Transaksi dicatat lokal (IndexedDB + on-card)
2. Masuk ke Outbox queue
3. Saat online, dikirim ke server
4. Server memvalidasi & menyimpan
5. Status berubah ke "Synced"

**Offline-first:**

- Semua transaksi valid meski offline
- Kartu adalah source of truth
- Server hanya untuk backup & reporting

</div>
<div className="guide-step__image">

![Status sync transaksi](../../assets/images/transaction_sync.png)

</div>
</div>

---

### Manual Sync

<div className="guide-step">
<div className="guide-step__text">

**Trigger sync manual:**

- Buka **Pengaturan** → lihat status sync
- Tap **"Sync Sekarang"** untuk memaksa sync
- Berguna setelah lama offline

**Informasi sync:**

- Jumlah transaksi pending
- Terakhir sync berhasil
- Status koneksi ke server

</div>
</div>

---

## Ringkasan & Laporan

<div className="guide-step">
<div className="guide-step__text">

**Ringkasan yang tersedia:**

- Total transaksi hari ini
- Total top-up (pemasukan)
- Total checkout (pengeluaran)
- Jumlah anggota aktif hari ini

**Periode:**

- Harian / Mingguan / Bulanan
- Custom date range

**Export:**

- Data bisa di-export via server dashboard
- Format CSV untuk analisis lebih lanjut

</div>
</div>

---

## Cek Riwayat via Scout

Selain dari menu Transaksi, riwayat juga bisa dilihat per kartu lewat mode Scout:

<div className="guide-step">
<div className="guide-step__text">

**Cara:**

1. Buka mode **Scout**
2. Tempelkan kartu ke perangkat
3. Transaksi terakhir ditampilkan bersama info saldo

**Kegunaan:**

- Verifikasi cepat transaksi terakhir
- Anggota bisa cek sendiri tanpa akses admin

</div>
<div className="guide-step__image">

![Riwayat transaksi via Scout](../../assets/images/scout_12.jpeg)

</div>
</div>

---

## Troubleshooting

| Masalah                | Solusi                                                  |
| ---------------------- | ------------------------------------------------------- |
| Transaksi tidak muncul | Refresh halaman, cek filter aktif                       |
| Status "Pending" lama  | Periksa koneksi internet, trigger manual sync           |
| Conflict muncul        | Biasanya karena kartu di-tap di 2 device bersamaan      |
| Nominal tidak sesuai   | Cek konfigurasi tarif di Pengaturan                     |
| Transaksi hilang       | Data on-card adalah source of truth, tap kartu di Scout |
