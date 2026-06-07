---
sidebar_position: 3
title: Login
---

# Login

Panduan untuk masuk ke aplikasi dan memilih tenant yang akan dikelola.

## Alur Login

```mermaid
flowchart TD
    A[Buka App] --> B{Punya Tenant Lokal?}
    B -->|Ya| C[Pilih Tenant]
    B -->|Tidak| D[Browse Server / Buat Baru]
    C --> E[Masukkan Username & Password]
    D --> F[Sync Tenant dari Server]
    F --> E
    E --> G[Masuk ke Dashboard]
```

---

## Langkah-langkah

### 1. Cari & Pilih Tenant

Buka aplikasi dari browser atau shortcut Home Screen. Cari tenant yang ingin Anda kelola.

<div className="guide-step">
<div className="guide-step__text">

**Yang akan Anda lihat:**

- Logo dan branding Koperasi Kegelapan
- Daftar tenant yang tersimpan di perangkat (jika ada)
- Tombol "Browse Server" untuk mencari tenant online
- Tombol "Buat Koperasi Baru" untuk registrasi

**Opsi yang tersedia:**

- **Tenant Lokal** - Tap untuk langsung memilih
- **Browse Server** - Cari tenant yang terdaftar di server
- **Buat Baru** - Registrasi tenant baru

</div>
<div className="guide-step__image">

![Cari & Pilih Tenant](../../assets/images/login_1.png)

</div>
</div>

---

### 2. Masukkan Username & Password

Setelah memilih tenant, masukkan kredensial untuk autentikasi.

<div className="guide-step">
<div className="guide-step__text">

**Autentikasi:**

- Masukkan **username** dan **password** yang dibuat saat registrasi
- Kredensial diverifikasi secara lokal (offline-capable)
- Setelah berhasil, Anda masuk ke dashboard

**Keamanan:**

- 5x salah password → akun terkunci sementara (5 menit)
- Password tidak pernah dikirim ke server dalam plaintext
- Verifikasi menggunakan hash lokal

</div>
<div className="guide-step__image">

![Masukkan Username & Password](../../assets/images/login_2.png)

</div>
</div>

---

### 3. Dashboard Admin

Setelah login berhasil, Anda masuk ke Station mode (dashboard admin).

<div className="guide-step">
<div className="guide-step__text">

**Fitur yang tersedia:**

- **Kartu** - Kelola kartu NFC (issue, top-up, block)
- **Anggota** - Manajemen data member
- **Scout** - Cek saldo & riwayat kartu
- **Transaksi** - Lihat riwayat transaksi
- **Pengaturan** - Konfigurasi tenant & perangkat

</div>
<div className="guide-step__image">

![Dashboard Admin - Station mode](../../assets/images/register_4.png)

</div>
</div>

---

## Session & Logout

- Session tersimpan di perangkat - tidak perlu login ulang setiap buka app
- Untuk logout: buka menu (hamburger icon) → tap **Logout**
- Logout menghapus session tapi data tenant tetap tersimpan lokal

---

## Troubleshooting

| Masalah                          | Solusi                                                                |
| -------------------------------- | --------------------------------------------------------------------- |
| Tenant tidak muncul di daftar    | Gunakan "Browse Server" untuk sync ulang                              |
| Password salah terus             | Pastikan menggunakan password yang benar, tunggu 5 menit jika terkunci |
| Tidak bisa browse server         | Periksa koneksi internet                                              |
| App tidak bisa dibuka            | Clear cache browser, pastikan HTTPS                                   |
