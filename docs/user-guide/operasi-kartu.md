---
sidebar_position: 5
title: Operasi Kartu
---

import PlaceholderImg from '@site/src/components/PlaceholderImg';

# Operasi Kartu

Panduan lengkap untuk mengelola kartu NFC: issue kartu baru, top-up saldo, cek saldo, dan block kartu.

## Jenis Kartu

Sistem menggunakan **NTAG215** NFC cards dengan spesifikasi:
- 504 bytes user memory
- Unique 7-byte UID
- Enkripsi AES-256-GCM on-card

---

## Issue Kartu Baru

### 1. Buka Menu Kartu

Dari dashboard admin, tap tab **Kartu**.

<div className="guide-step">
<div className="guide-step__text">

**Yang akan Anda lihat:**
- Daftar kartu yang sudah di-issue
- Tombol **"+ Issue Kartu"** di pojok kanan atas
- Filter & search kartu

**Tap "Issue Kartu"** untuk memulai proses penerbitan.

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Daftar Kartu — tombol Issue" />
</div>
</div>

---

### 2. Pilih Anggota

Pilih anggota yang akan menerima kartu.

<div className="guide-step">
<div className="guide-step__text">

**Opsi:**
- Pilih dari daftar anggota yang sudah terdaftar
- Atau buat anggota baru langsung dari sini
- Satu anggota bisa memiliki lebih dari satu kartu

**Search:**
- Ketik nama atau ID anggota
- Hasil muncul real-time

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Pilih anggota untuk kartu baru" />
</div>
</div>

---

### 3. Tap Kartu NFC

Tempelkan kartu NFC kosong ke perangkat.

<div className="guide-step">
<div className="guide-step__text">

**Proses:**
1. Layar menampilkan animasi "Tempelkan Kartu"
2. Dekatkan kartu NFC ke bagian belakang HP
3. Sistem membaca UID kartu
4. Data wallet di-encrypt dan ditulis ke kartu
5. Konfirmasi berhasil muncul

**Data yang ditulis:**
- Wallet state (saldo awal Rp 0)
- Tenant ID & member binding
- Cryptographic signature (HMAC)
- A/B buffer untuk write safety

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Animasi tap kartu NFC" />
</div>
</div>

---

### 4. Konfirmasi Issue

Kartu berhasil di-issue dan siap digunakan.

<div className="guide-step">
<div className="guide-step__text">

**Informasi yang ditampilkan:**
- UID kartu (7 byte hex)
- Nama anggota yang terikat
- Saldo awal (Rp 0)
- Status: ACTIVE

**Selanjutnya:**
- Top-up saldo sebelum digunakan
- Atau langsung gunakan untuk check-in (saldo 0 diizinkan untuk gate)

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Kartu berhasil di-issue" />
</div>
</div>

---

## Top-up Saldo

### 1. Pilih Kartu atau Tap Langsung

<div className="guide-step">
<div className="guide-step__text">

**Dua cara top-up:**
- **Dari daftar:** Tap kartu di list → pilih "Top-up"
- **Tap langsung:** Dari menu Kartu, tap "Top-up" → tempelkan kartu

**Batas top-up:**
- Minimum: Rp 10.000
- Maximum per transaksi: Rp 500.000
- Saldo maksimal kartu: Rp 16.000.000

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Pilih metode top-up" />
</div>
</div>

---

### 2. Input Nominal

<div className="guide-step">
<div className="guide-step__text">

**Masukkan nominal:**
- Ketik nominal manual, atau
- Pilih dari preset (Rp 50K, 100K, 200K, 500K)
- Sistem menampilkan saldo sebelum & sesudah

**Validasi:**
- Nominal harus kelipatan Rp 1.000
- Tidak boleh melebihi batas saldo kartu
- Konfirmasi sebelum write

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Input nominal top-up" />
</div>
</div>

---

### 3. Tap Kartu untuk Write

<div className="guide-step">
<div className="guide-step__text">

**Proses write:**
1. Tempelkan kartu ke NFC reader
2. Sistem membaca state saat ini
3. Verifikasi HMAC integrity
4. Update saldo + tulis ke buffer
5. Verifikasi write berhasil
6. Tampilkan saldo baru

**Keamanan:**
- Double-write (A/B buffer) untuk mencegah korupsi
- HMAC verification sebelum dan sesudah write
- Transaksi dicatat di hash-chain log on-card

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Proses write top-up ke kartu" />
</div>
</div>

---

## Cek Saldo (Scout)

<div className="guide-step">
<div className="guide-step__text">

**Cara cek saldo:**
1. Buka mode **Scout** (dari bottom nav atau mode kiosk)
2. Tempelkan kartu ke perangkat
3. Informasi kartu langsung ditampilkan:
   - Saldo saat ini
   - Nama pemilik
   - Status kartu
   - 5 transaksi terakhir

**Read-only** — tidak ada perubahan data di kartu.

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Tampilan Scout — info kartu" />
</div>
</div>

---

## Block / Unblock Kartu

<div className="guide-step">
<div className="guide-step__text">

**Block kartu:**
- Dari daftar kartu → tap kartu → **"Block"**
- Kartu yang di-block tidak bisa digunakan untuk transaksi
- Saldo tetap tersimpan di kartu

**Unblock:**
- Dari daftar kartu → tap kartu blocked → **"Unblock"**
- Kartu kembali aktif dan bisa digunakan

**Kapan block kartu:**
- Kartu hilang/dicuri
- Anggota non-aktif sementara
- Investigasi transaksi mencurigakan

</div>
<div className="guide-step__image">
<PlaceholderImg caption="Block & Unblock kartu" />
</div>
</div>

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Kartu tidak terbaca | Pastikan NFC aktif, coba posisi lain |
| Write gagal | Jangan angkat kartu saat proses write |
| HMAC verification failed | Kartu mungkin corrupt, hubungi admin |
| Saldo tidak update | Tap ulang untuk re-read, cek di Scout |
| Kartu sudah di-issue tenant lain | Satu kartu hanya bisa 1 tenant aktif |
