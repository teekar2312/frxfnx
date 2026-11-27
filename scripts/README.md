# FINEX Forex Trading Platform — README (Lokal Deployment Windows 11)

Platform trading forex full-stack untuk broker **FINEX Indonesia** dengan integrasi
**MetaTrader 5**, **Groq AI** (cloud), **Local AI** (Ollama), dan **Tiingo News API**.

## 1. Prasyarat (Windows 11)

- **Windows 11** (64-bit) + VS Code
- **Python 3.14**: `winget install Python.Python.3.14` atau installer resmi https://python.org
- **Node.js 20+** dan **Bun** (`npm install -g bun`)
- **MetaTrader 5** dari broker FINEX Indonesia (terminal + akun live atau demo)
- **Ollama** (opsional, untuk Local AI): https://ollama.com — `ollama pull llama3.1:8b`
- **Groq API Key**: https://console.groq.com/keys
- **Tiingo API Key**: https://api.tiingo.com/

## 2. Setup Repository (VS Code)

```powershell
git clone https://github.com/teekar2312/frxfnx.git finex-forex
cd finex-forex

# Salin env (pilih salah satu)
copy .env.example .env                            # development
copy .env.production.example .env.production      # production

# Edit .env: isi MT5_LOGIN, MT5_PASSWORD, GROQ_API_KEY, TIINGO_API_KEY
notepad .env
# atau dengan VS Code:  code .env

# Install JS dependencies
bun install

# Setup database Prisma (SQLite)
bun run db:push
```

## 3. Jalankan Mini-service MT5 Bridge

Mini-service ini menyediakan WebSocket untuk harga realtime, posisi, dan news.
Di production, ganti logika simulasi dengan panggilan ke `scripts/mt5_bridge.py` via subprocess.

```powershell
# Di satu terminal (VS Code split):
cd mini-services\mt5-bridge
bun run dev
# → WebSocket di port 3004
```

## 4. Jalankan Frontend Next.js

```powershell
# Di terminal lain:
bun run dev
# → http://localhost:3000
```

Buka di browser: `http://localhost:3000`. Untuk preview eksternal lihat sidebar Preview Panel.

## 5. Jalankan Python MT5 Bridge (production mode)

Script ini auto-launch MT5 terminal, lalu connect dengan akun FINEX Indonesia:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r scripts\requirements.txt

# Pastikan .env sudah terisi
python scripts\mt5_bridge.py
```

Output: streaming tick untuk XAU/USD, EUR/USD, GBP/USD, USD/JPY setiap 5 detik.

## 6. Groq AI News Analyzer (standalone)

Analisa 3 Angka Emas (Previous / Forecast / Actual) via Groq:

```powershell
$env:GROQ_API_KEY = "gsk_..."
python scripts/groq_news_analyzer.py
```

## 7. Fitur Aplikasi Web

- **Dashboard**: equity, floating P&L, margin level, watchlist, news countdown, log realtime.
- **Trading**: chart SVG live, order ticket (BUY/SELL dengan SL/TP pips), tabel posisi (close/modify), one-click execution.
- **News Calendar**: tampilan 3 angka emas (Previous / Forecast / Actual) + deviasi + arah USD/XAU/EUR/GBP/JPY otomatis; tombol "Analisa" untuk simulasi rilis; tambah berita manual; fetch Tiingo.
- **Strategi**: 3 fase pergerakan berita (0-2 / 2-15 / 15+ menit), Strategy A (Fade the Spike), Strategy B (15-Minute Breakout), golden rules scalping, karakteristik 4 pair.
- **AI Assistant**: chat dengan Groq (cloud) atau Local AI (Ollama). Konteks akun MT5 + 5 berita teratas otomatis dilampirkan.
- **Risk Manager**: 7 pilar — fixed-fractional sizing, stops server-side, R:R min 1.5, leverage cap 5:1, aggregate exposure, daily/weekly stop, drawdown ladder, event & gap risk.
- **Settings**: MT5 path/login/password/server, broker FINEX Indonesia, jadwal trading (no Sabtu/Minggu), Groq API key + model, Local AI endpoint + model, Tiingo API key, default risk params.
- **Logs/Audit**: filter level/source, search, export ke TXT.

## 8. Tema & Density

- **Tema gelap / terang** — toggle di header (next-themes + Zustand persist).
- **Density**: Compact (seimbang) / Dense (maksimal data) / Minimal (lega).

## 9. Jadwal Trading & Anti-Akhir Pekan

Default: Senin-Jumat, 08:00-23:30 WIB. Trading diblok otomatis pada Sabtu & Minggu.
Sesuaikan di Settings > Jadwal Trading. Header menampilkan countdown ke sesi berikutnya.

## 10. Auto-launch MT5

Jika `mt5AutoLaunch: true` (default) dan MT5 belum running, aplikasi otomatis memanggil
`scripts/mt5_bridge.py` untuk spawn `terminal64.exe` dan login dengan kredensial dari Settings.

## 11. Catatan Keamanan

- API keys disimpan lokal di browser (Zustand persist + localStorage). Tidak dikirim ke server kami.
- Untuk keamanan produksi, simpan kredensial MT5 di OS Keychain / Windows Credential Manager.
- Stop loss wajib broker-side (server-side) — gunakan SL/TP pips saat open trade.
- Hindari pending order (Buy/Sell Stop) dekat dengan jam rilis berita — slippage risk.

## 12. Stack Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4 + shadcn/ui |
| State | Zustand (UI/theme/density) + TanStack-style local state via socket |
| Realtime | Socket.IO (mini-service port 3004) |
| Database | Prisma + SQLite |
| AI | Groq SDK / OpenAI-compatible / Ollama (local) |
| Backend MT5 | Python 3.14 + MetaTrader5 lib (Windows only) |
| News | Tiingo News API |
| IDE | VS Code |
| OS | Windows 11 |

## 13. Troubleshooting

- **MT5 module not found** — `pip install MetaTrader5` (hanya jalan di Windows).
- **Socket.IO tidak connect** — pastikan `bun run dev` di `mini-services/mt5-bridge`.
- **Groq 401** — cek API key di `.env` atau Settings.
- **Local AI unreachable** — `ollama serve` + `ollama pull llama3.1:8b`.
- **Halaman blank** — cek `/home/z/my-project/dev.log` (atau `dev.log` di root project).

---

Dibuat dengan ❤ oleh FINEX Forex Platform. Selalu uji di akun demo sebelum live trading.
