---
sidebar_position: 6
title: Manajemen Anggota
---

import PlaceholderImg from '@site/src/components/PlaceholderImg';

# Manajemen Anggota

Panduan untuk menambah, mengedit, dan mengelola data anggota koperasi.

## Overview

Setiap anggota (member) adalah entitas yang bisa memiliki satu atau lebih kartu NFC. Data anggota disimpan lokal dan di-sync ke server.

---

## Tambah Anggota Baru

### 1. Buka Menu Anggota

<div className="guide-step">
<div className="guide-step__text">

**Akses:**
- Tap tab **Anggota** di bottom navigation
- Tap tombol **"+ Tambah Anggota"**

**Daftar anggota menampilkan:**
- Nama anggota
- Jumlah kartu aktif
- Status (aktif/non-aktif)
- Tanggal bergabung

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Daftar Anggota — tombol Tambah" />
</div>
</div>

---

### 2. Isi Data Anggota

<div className="guide-step">
<div className="guide-step__text">

**Field yang tersedia:**
- **Nama Lengkap** (wajib) — Nama anggota
- **No. Anggota** (opsional) — ID internal koperasi
- **No. HP** (opsional) — Untuk notifikasi
- **Catatan** (opsional) — Informasi tambahan

**Validasi:**
- Nama minimal 2 karakter
- No. HP format Indonesia (+62 / 08xx)

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Form tambah anggota" />
</div>
</div>

---

### 3. Simpan

<div className="guide-step">
<div className="guide-step__text">

**Setelah simpan:**
- Anggota langsung muncul di daftar
- Bisa langsung di-assign kartu NFC
- Data di-sync ke server saat online

**ID Anggota:**
- Auto-generated (UUID)
- Digunakan untuk binding kartu

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Anggota berhasil ditambahkan" />
</div>
</div>

---

## Edit Anggota

<div className="guide-step">
<div className="guide-step__text">

**Cara edit:**
1. Tap anggota di daftar
2. Tap ikon **Edit** (pensil)
3. Ubah data yang diperlukan
4. Tap **Simpan**

**Yang bisa diedit:**
- Nama, No. HP, Catatan
- Status aktif/non-aktif

**Yang tidak bisa diedit:**
- ID Anggota (auto-generated)
- Riwayat kartu

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Edit data anggota" />
</div>
</div>

---

## Lihat Detail Anggota

<div className="guide-step">
<div className="guide-step__text">

**Informasi di halaman detail:**
- Data profil anggota
- Daftar kartu yang dimiliki (aktif & blocked)
- Riwayat transaksi terkait
- Total saldo di semua kartu

**Aksi yang tersedia:**
- Edit profil
- Issue kartu baru untuk anggota ini
- Block/unblock kartu
- Nonaktifkan anggota

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Detail anggota — kartu & riwayat" />
</div>
</div>

---

## Nonaktifkan Anggota

<div className="guide-step">
<div className="guide-step__text">

**Kapan menonaktifkan:**
- Anggota keluar dari koperasi
- Pelanggaran aturan
- Permintaan anggota sendiri

**Efek nonaktifkan:**
- Semua kartu anggota otomatis di-block
- Anggota tidak muncul di pencarian issue kartu
- Data tetap tersimpan (soft delete)
- Bisa diaktifkan kembali oleh admin

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Konfirmasi nonaktifkan anggota" />
</div>
</div>

---

## Pencarian & Filter

- **Search:** Ketik nama atau nomor anggota
- **Filter status:** Semua / Aktif / Non-aktif
- **Sort:** Nama (A-Z), Tanggal gabung, Jumlah kartu

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Anggota tidak muncul di search | Cek filter status, mungkin non-aktif |
| Tidak bisa hapus anggota | Sistem menggunakan soft-delete (nonaktifkan) |
| Data tidak sync | Periksa koneksi, cek status sync di Settings |
| Duplikat anggota | Edit salah satu, nonaktifkan yang lain |
