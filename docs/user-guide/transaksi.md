---
sidebar_position: 8
title: Transaksi
---

import PlaceholderImg from '@site/src/components/PlaceholderImg';

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
<PlaceholderImg caption="Daftar riwayat transaksi" />
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
<PlaceholderImg caption="Filter transaksi" />
</div>
</div>

---

## Detail Transaksi

<div className="guide-step">
<div className="guide-step__text">

**Tap transaksi untuk melihat detail:**

- ID Transaksi (hash)
- Tipe & timestamp lengkap
- Anggota & kartu terkait
- Nominal & saldo sebelum/sesudah
- Device yang memproses
- Status sync (lokal / synced)

**Hash Chain:**

- Setiap transaksi memiliki hash yang terhubung ke transaksi sebelumnya
- Menjamin integritas data (tamper-evident)
- Ditampilkan sebagai "Chain ID" di detail

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Detail transaksi - hash chain" />
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
<PlaceholderImg caption="Status sync transaksi" />
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
<div className="guide-step__image">
<PlaceholderImg caption="Manual sync - status & trigger" />
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
<div className="guide-step__image">
<PlaceholderImg caption="Ringkasan transaksi harian" />
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
