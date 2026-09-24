# Distributed Cloud Mining Pipeline (Ubuntu 22.04 + Docker + Website)

Sistem distributed mining otomatis berbasis web dashboard yang berjalan di dalam container **Ubuntu 22.04 + Node.js 20 + Headless Google Chrome**, mendukung deploy ke **GitHub Pages**, serta eksekusi otomatis di **GitHub Actions tanpa perlu membuat Secret Key manual**.

---

## 🚀 Fitur Utama

- **Ubuntu 22.04 LTS**: Container Docker dan GitHub Actions runner menggunakan base resmi Ubuntu 22.04.
- **Website Dashboard (`website/`)**: Interface web mining modern dengan real-time hashrate, total shares, worker counters, dan telemetri langsung di browser/pages.
- **Zero Manual Secret Key**: Berjalan otomatis menggunakan fitur native **GitHub Actions `schedule` (cron)** dan default permissions OIDC (`id-token: write`). Anda **tidak perlu** membuat Personal Access Token (PAT) atau Secret Key manual di repository settings.
- **Matrix Architecture**: Menjalankan 20 node secara paralel menggunakan GitHub Actions Matrix (`node: [1..20]`) tanpa duplikasi ratusan baris kode YAML.
- **Auto Safe Timeout**: Setiap worker otomatis menyelesaikan pekerjaannya pada menit ke 355 (5 jam 55 menit) sebelum batas 6 jam GitHub Actions agar run berstatus sukses dan siap dipicu jadwal berikutnya.
- **GitHub Pages Support**: Halaman web miner otomatis dideploy ke GitHub Pages atau dijalankan melalui internal web server port 3000 di dalam Docker.

---

## 📁 Struktur Direktori

```text
├── .github/workflows/
│   └── pipeline.yml       # GitHub Actions workflow (Ubuntu 22.04, Matrix 20 nodes, auto schedule)
├── website/
│   ├── index.html         # Frontend web miner dashboard (GitHub Pages ready)
│   └── server.js          # Internal lightweight Node.js HTTP server (port 3000)
├── Dockerfile             # Ubuntu 22.04 + Node.js 20 + Google Chrome Stable
├── runner.js              # Headless browser orchestrator & telemetry logger
├── package.json           # Node.js project configuration
└── README.md              # Dokumentasi proyek
```

---

## ⚙️ Konfigurasi Environment Variable

| Variable | Default Value | Keterangan |
|---|---|---|
| `WALLET` | `XcufdyxZtL4JUjALZfTq6pCrxyTt2Hy2Zu` | Alamat wallet / worker target |
| `THREADS` | `4` | Jumlah thread worker mining per node |
| `ALGORITHM` | `cwm_minotaurx` | Algoritma mining |
| `TASK_HOST` | `minotaurx.sea.mine.zpool.ca` | Host stratum pool mining |
| `TASK_PORT` | `7019` | Port stratum pool mining |
| `PAYOUT_COIN` | `DASH` | Koin pembayaran |
| `PAGES_URL` | *(kosong)* | Opsional: URL GitHub Pages jika ingin mengakses pages remote alih-alih server lokal |

---

## 💻 Cara Menjalankan Secara Lokal

### 1. Menjalankan Website Saja (Lokal)
```bash
node website/server.js
```
Buka browser di `http://localhost:3000`.

### 2. Menjalankan via Docker
```bash
# Build image Docker Ubuntu 22.04
docker build -t cloud-miner:latest .

# Jalankan container
docker run --rm --cpus="4" cloud-miner:latest
```

---

## 🔄 Otomatisasi GitHub Actions (Tanpa Secret Key)

1. **Jadwal Otomatis (Cron)**: 
   Workflow diset berjalan otomatis setiap 6 jam (`cron: '0 */6 * * *'`). GitHub yang mengatur penjadwalannya tanpa perlu trigger token pihak ketiga.
2. **Manual Run (One-Click)**:
   Masuk ke tab **Actions** di GitHub -> pilih **Distributed Mining Pipeline** -> klik **Run workflow**.
