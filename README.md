# FINEX Forex Trading Platform v2.0

Aplikasi trading forex full-stack untuk broker **FINEX Indonesia** dengan integrasi **MetaTrader 5**, **Groq AI** (cloud), **Local AI** (Ollama/LM Studio/vLLM/llama.cpp), dan **Tiingo News API**.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Python](https://img.shields.io/badge/Python-3.14-yellow)

## Fitur Utama

- **13 tab interaktif**: Dashboard, Trading, News Calendar, Strategi, Analytics, Journal, Backtest, AI Assistant, Risk Manager, Alerts, Copy Trade, Logs, Settings
- **20 fitur profesional**: Pending Orders, Backtest, Currency Strength Meter, Alerts, Trailing Stop, Multi-Account, Auto-Disable Pre-News, Correlation Matrix, Trade Timer, News Overlay, Session Markers, P&L Report, Hot Keys, Indikator Teknikal, Risk of Ruin, Drawing Tools, Copy Trading, API Key Vault, Trade Journal, Spread Monitor
- **Tema gelap/terang** + 3 mode density (compact/dense/minimal)
- **MT5 auto-launch** + koneksi real via Python bridge (Windows 11)
- **Anti-weekend** — Trading diblokir Sabtu & Minggu + countdown ke sesi berikutnya
- **Real-time via Socket.IO** (mini-service port 3004): price ticks, posisi, news, log, alerts

## Strategi yang Diimplementasikan

- **3 Angka Emas** analyzer (Previous / Forecast / Actual + deviasi)
- **Kamus Reaksi Kilat** untuk USD (NFP/CPI/PPI/Unemployment/GDP/PMI)
- **3 Fase Pergerakan Berita**: Fase 1 (0-2 min, NO ENTRY), Fase 2 (2-15 min, ZONA ENTRY), Fase 3 (15+ min, HOLD)
- **Strategi A: Fade the Spike** + **Strategi B: 15-Minute Breakout**
- **7 Pilar Risk Management**: fixed-fractional sizing, stops server-side, R:R min 1.5, leverage cap 5:1, aggregate exposure, daily/weekly stop, drawdown ladder, event & gap risk

## Pengaturan Model AI

### Groq AI (cloud)
- **10 preset model** terbaru (Nov 2025): Llama 3.3 70B, Llama 3.1 8B/70B, Mixtral 8x7B, Gemma 2 9B, Whisper, Llama Guard
- Badge context window (128K/33K/8K)
- Tombol **Fetch Models** untuk list real-time dari API Groq
- Tombol **Test Connection** untuk verifikasi
- Custom Model ID untuk model baru di luar list

### Local AI (5 tipe)
- **Ollama** (default, simple)
- **LM Studio** (GUI app, OpenAI-compatible)
- **vLLM** (high-throughput server)
- **llama.cpp** (lightweight C++ binary)
- **Custom** (endpoint manual)

Setiap tipe auto-update endpoint. Tersedia 10 suggested models dengan tombol Pull (Ollama).

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4 + shadcn/ui |
| State | Zustand (UI/theme/density persist) + Socket.IO client |
| Realtime | Socket.IO mini-service (port 3004) |
| Database | Prisma + SQLite (12 model: Trade, PendingOrder, AlertRule, BacktestRun, JournalEntry, Hotkey, DrawingObject, Mt5AccountConfig, ApiKeyVault, PnlReport, AutoTradeRule, CopyTradeSubscription) |
| AI | Groq SDK + Ollama (Local AI) |
| News | Tiingo News API |
| Backend MT5 | Python 3.14 + MetaTrader5 lib (Windows only) |
| IDE | VS Code |
| OS | Windows 11 |

## Quick Start (Windows 11 + VS Code)

```powershell
# Clone repo
git clone https://github.com/teekar2312/frxfnx.git finex-forex
cd finex-forex

# Setup env
copy scripts\.env.example .env
# Edit .env: isi MT5_LOGIN, MT5_PASSWORD, GROQ_API_KEY, TIINGO_API_KEY

# Install JS dependencies
bun install

# Setup database Prisma (SQLite)
bun run db:push

# Jalankan mini-service MT5 Bridge (port 3004)
cd mini-services\mt5-bridge
bun run dev

# Di terminal lain, jalankan Next.js (port 3000)
cd ..
bun run dev

# Buka di browser: http://localhost:3000

# (Opsional) Untuk koneksi real MT5
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r scripts\requirements.txt
python scripts\mt5_bridge.py
```

## Hot Keys

| Key | Action |
|---|---|
| F1 | BUY market (active symbol, default lots) |
| F2 | SELL market |
| F3 | Partial Close 50% (last position) |
| F4 | Reverse last position |
| F7 | Flatten all positions |
| F8 | Close all positions |
| F9 | Open Settings |
| ESC | Cancel pending orders |

## Struktur Project

```
finex-forex/
├── mini-services/
│   └── mt5-bridge/          # Socket.IO mini-service (port 3004)
│       ├── index.ts          # All backend logic (margin, SL/TP, alerts, backtest, dll)
│       └── package.json
├── prisma/
│   └── schema.prisma         # 12 model database
├── scripts/
│   ├── mt5_bridge.py         # Python 3.14 MT5 bridge untuk Windows 11
│   ├── groq_news_analyzer.py # Groq AI news analyzer
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Template env
│   └── README.md             # Setup guide Windows 11
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/chat/       # AI chat endpoint (Groq + Local)
│   │   │   ├── ai/models/     # Fetch + test + pull models
│   │   │   └── news/tiingo/   # Tiingo news fetch
│   │   ├── page.tsx           # Main page dengan 13 tab
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ai/                # ModelSelectorGroq, ModelSelectorLocal
│   │   ├── alerts/            # AlertsCenter
│   │   ├── analytics/         # AnalyticsView
│   │   ├── account/           # MultiAccountSwitch
│   │   ├── backtest/          # BacktestView
│   │   ├── copytrade/         # CopyTradeView
│   │   ├── dashboard/         # DashboardView
│   │   ├── drawing/           # DrawingToolbar, SessionMarkers, NewsOverlay
│   │   ├── indicators/       # CurrencyStrengthMeter, CorrelationMatrix, IndicatorsPanel
│   │   ├── journal/          # JournalView
│   │   ├── mt5/              # Mt5StatusBadge
│   │   ├── news/             # NewsCalendarView
│   │   ├── risk/             # RiskManagerView, RiskOfRuinCalculator
│   │   ├── settings/         # SettingsView (7 tabs)
│   │   ├── strategy/         # StrategyView
│   │   ├── trading/          # TradingView, OrderTicket, PositionsTable, PendingOrders, TradeTimer
│   │   └── ui/               # shadcn/ui components
│   ├── lib/
│   │   ├── indicators/       # RSI, Stoch, BB, ATR, SMA, EMA, S/R, CurrencyStrength, Correlation
│   │   ├── mt5/              # socket.ts, schedule.ts
│   │   ├── news/             # analyzer.ts (3 Angka Emas)
│   │   ├── risk/             # sizing.ts, ruin.ts
│   │   ├── journal/          # analytics.ts
│   │   ├── vault/            # API key vault
│   │   ├── hotkeys.ts
│   │   └── types/trade.ts
│   ├── store/
│   │   ├── ui.ts             # Theme, density, settings persist
│   │   ├── market.ts         # MT5, prices, positions, news, logs
│   │   └── extended.ts       # Pending orders, alerts, accounts, drawings, journal
│   └── types/index.ts
├── .env.example
└── README.md
```

## Verifikasi Bug Fixes (Audit Mendalam)

13 bug kritis ditemukan dan diperbaiki:

1. ✅ Margin calculation (× price, bukan units)
2. ✅ SL/TP auto-trigger untuk posisi non-trailing
3. ✅ Pending order orphan (rollback ke cancelled jika fill gagal)
4. ✅ Expiration tidak overwrite 'filled' di tick sama
5. ✅ Partial close record trade history
6. ✅ Stochastic %D null→0 skew fix
7. ✅ RSI avgLoss=0 consistency
8. ✅ Country code USD vs US mismatch
9. ✅ Backtest maxDD inisialisasi peak
10. ✅ pre_news_flatten re-trigger spam (disable + re-enable 30 menit)
11. ✅ pending:filled handler no-op
12. ✅ Race condition alertEvents (functional update)
13. ✅ AppSettings type consistency + useVault hook API

Optimistic UI updates: Alerts, Drawings, Multi-account, Auto-Trade, Journal.

## Catatan Penting

- **API Keys**: Disimpan lokal di browser (Zustand persist + localStorage). Untuk production, gunakan tombol Keychain (Windows Credential Manager via Python backend dengan keytar).
- **MT5 Production**: Untuk koneksi real ke akun FINEX, gunakan `scripts/mt5_bridge.py` di Windows 11 dengan akun live atau demo.
- **Demo Mode**: Saat ini aplikasi menggunakan mock prices (random walk) & mock news untuk demo. Saat di-deploy dengan MT5 real + Python bridge, harga akan real-time dari MT5.
- **Disclaimer**: Selalu uji di akun demo sebelum live trading. Forex trading berisiko tinggi.

## License

MIT — bebas digunakan untuk personal dan komersial.

---

Dibuat untuk **FINEX Indonesia Forex Trading Platform**.
