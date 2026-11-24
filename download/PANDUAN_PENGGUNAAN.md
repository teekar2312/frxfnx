# FINEX Forex Trading Platform — Panduan Penggunaan

Aplikasi trading forex full-stack untuk **broker FINEX Indonesia** dengan:
- **MetaTrader 5** integration (auto-launch + real-time ticks + order execution)
- **Groq AI** (cloud) + **Local AI** (Ollama) untuk analisa berita & saran strategi
- **Tiingo News API** untuk kalender ekonomi
- **3 Angka Emas** (Previous / Forecast / Actual) analyzer
- Strategi scalping berita: **Fade the Spike** & **15-Minute Breakout**
- **7 Pilar Risk Management** sesuai best-practice trader profesional
- Jadwal trading Senin-Jumat 08:00-23:30, blok otomatis Sabtu & Minggu
- Tema gelap/terang + 3 mode density (compact / dense / minimal)
- Backend Python 3.14 + MetaTrader5 lib (untuk Windows 11)

## Cara Menggunakan

### 1. Preview Online (recommended)

Buka preview URL via panel kanan: `https://preview-<bot-id>.space-z.ai/`
- Klik **"Open in New Tab"** pada Preview Panel untuk akses penuh.

### 2. Jalankan Lokal (Windows 11 + VS Code)

Lihat: `scripts/README.md` untuk setup lengkap.

Quick start:
```powershell
# Clone & install
git clone <repo> finex-forex
cd finex-forex
copy scripts\.env.example .env  # edit dengan kredensial Anda
bun install
bun run db:push

# Jalankan mini-service MT5 Bridge (port 3004)
cd mini-services\mt5-bridge
bun run dev

# Jalankan Next.js (port 3000)
cd ..
bun run dev

# (Opsional) Jalankan Python MT5 bridge untuk koneksi real
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r scripts\requirements.txt
python scripts\mt5_bridge.py
```

### 3. Halaman-halaman Aplikasi

| Tab | Fungsi |
|---|---|
| Dashboard | Ringkasan equity, P&L, watchlist, news countdown, log realtime |
| Trading | Chart SVG live + Order Ticket (BUY/SELL dengan SL/TP pips) + tabel posisi |
| News Calendar | 3 Angka Emas + deviasi + arah USD/XAU/EUR/GBP/JPY; fetch Tiingo; tambah manual |
| Strategi | 3 Fase pergerakan berita + Strategi A (Fade the Spike) + Strategi B (15-Min Breakout) + golden rules + karakteristik 4 pair |
| AI Assistant | Chat Groq/Local AI dengan konteks akun MT5; quick prompts |
| Risk Manager | 7 Pilar risk management dengan calculator lot |
| Logs & Audit | Filter level/source, search, export TXT |
| Settings | MT5 path/login, broker FINEX, jadwal trading, API keys (Groq/Tiingo), risk defaults |

### 4. Fitur Khusus

- **Auto-launch MT5**: Bila `mt5AutoLaunch: true` (default), app memanggil `scripts/mt5_bridge.py` untuk spawn `terminal64.exe` + login otomatis.
- **Anti-Akhir Pekan**: Trading diblokir Sabtu & Minggu secara default. Header menampilkan countdown ke sesi berikutnya.
- **Tema gelap/terang**: Toggle di header (icon Moon/Sun).
- **Density**: Compact (seimbang) / Dense (maksimal data) / Minimal (lega dibaca).
- **Server-side SL/TP**: Wajib menggunakan SL/TP berbasis pips untuk proteksi broker-side.

### 5. Strategi yang Tersedia

#### Strategi A: Fade the Spike
- Manfaatkan kelelahan momentum setelah spike awal.
- Tunggu RSI/Stochastic ekstrem + ekor panjang di M1/M5.
- Entry counter-trend, target 10-15 pips.

#### Strategi B: 15-Minute Breakout (recommended)
- Tunggu 15 menit pertama (Fase 1 & 2) hingga candle M15 pertama terbentuk.
- Tandai High/Low candle M15.
- Pasang **Sell Stop** di bawah Low untuk XAU/EUR/GBP, atau **Buy Stop** di atas High untuk JPY.
- SL ketat di sisi lawan: maksimal 40 pips XAU, 15 pips majors.
- Target pips pair-specific: XAU 25, EUR 12, GBP 18, JPY 17.

### 6. Risk Management

| Pilar | Setting Default |
|---|---|
| Risk per trade | 0.5% (scalper) |
| Daily stop | 3% |
| Weekly stop | 5% |
| Max leverage ratio | 5:1 |
| Max margin usage | 30% |
| Min R:R | 1:1.5 |
| Drawdown ladder | -5% → halve size, -10% → minimum size |

### 7. Stack Teknologi

- **Frontend**: Next.js 16 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- **State**: Zustand (UI/theme/density persist) + socket.io (realtime)
- **Database**: Prisma + SQLite
- **Realtime**: Socket.IO mini-service (port 3004)
- **AI**: Groq SDK + Ollama (Local AI)
- **News**: Tiingo News API
- **Backend MT5**: Python 3.14 + MetaTrader5 lib (Windows only)
- **IDE**: VS Code
- **OS**: Windows 11

### 8. Catatan Penting

- **API Keys**: Disimpan lokal di browser (Zustand persist + localStorage). Tidak dikirim ke server kami.
- **MT5 Production**: Untuk koneksi real ke akun FINEX, gunakan `scripts/mt5_bridge.py` di Windows 11 dengan akun live atau demo.
- **Demo Mode**: Saat ini aplikasi menggunakan mock prices (random walk) & mock news untuk demo. Saat di-deploy dengan MT5 real + Python bridge, harga akan real-time dari MT5.
- **Disclaimer**: Selalu uji di akun demo sebelum live trading. Forex trading berisiko tinggi.

---

Dibuat dengan ❤ untuk FINEX Indonesia Forex Trading Platform.
