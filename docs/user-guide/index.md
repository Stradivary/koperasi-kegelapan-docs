---
sidebar_position: 1
title: Panduan Pengguna
---

# Panduan Pengguna - Koperasi Kegelapan NFC Wallet

Selamat datang di panduan pengguna **Koperasi Kegelapan NFC Wallet**. Dokumen ini akan membantu Anda memahami cara menggunakan aplikasi dari awal hingga operasional sehari-hari.

## Daftar Panduan

| #   | Panduan                                     | Deskripsi                                            |
| --- | ------------------------------------------- | ---------------------------------------------------- |
| 1   | [Register Tenant](./register-tenant.md)     | Membuat organisasi/koperasi baru di sistem           |
| 2   | [Login](./login.md)                         | Masuk ke aplikasi dan memilih tenant                 |
| 3   | [Pasang Perangkat](./pasang-perangkat.md)   | Setup perangkat sebagai terminal/kiosk               |
| 4   | [Operasi Kartu](./operasi-kartu.md)         | Issue, top-up, dan kelola kartu NFC                  |
| 5   | [Manajemen Anggota](./manajemen-anggota.md) | Tambah dan kelola data anggota                       |
| 6   | [Mode Kiosk](./mode-kiosk.md)               | Gunakan perangkat sebagai Gate, Terminal, atau Scout |
| 7   | [Transaksi](./transaksi.md)                 | Proses check-in, checkout, dan riwayat               |

## Alur Umum

```mermaid
flowchart LR
    A[Register Tenant] --> B[Login]
    B --> C[Pasang Perangkat]
    C --> D[Issue Kartu]
    D --> E[Operasi Harian]
    E --> F[Gate / Terminal / Scout]
```

## Catatan

- Aplikasi ini dirancang **mobile-first** - semua operasi bisa dilakukan dari smartphone.
- Sistem bekerja **offline-first** - tidak perlu koneksi internet untuk operasi kartu.
- Sinkronisasi ke server dilakukan otomatis saat koneksi tersedia.
