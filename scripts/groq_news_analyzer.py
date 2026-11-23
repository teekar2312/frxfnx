# FINEX Forex Trading Platform — Python 3.14 Groq AI News Analyzer
#
# Modul ini menganalisis berita ekonomi (3 Angka Emas: Previous / Forecast / Actual)
# dan memberikan rekomendasi trading untuk 4 pair: XAU/USD, EUR/USD, GBP/USD, USD/JPY.
#
# Jalankan di Windows 11 + VS Code + Python 3.14:
#   python scripts/groq_news_analyzer.py
#
# Paket: pip install groq requests python-dotenv
# Set env: GROQ_API_KEY dan TIINGO_API_KEY (di .env atau env sistem)

from __future__ import annotations

import os
import json
import time
from dataclasses import dataclass
from typing import Optional

try:
    from groq import Groq
except ImportError:
    Groc = None  # noqa
    Groq = None

try:
    import requests
except ImportError:
    requests = None  # type: ignore

# Kamus reaksi kilat untuk USD (sesuai user request)
RULES = """
Kamus Reaksi Kilat untuk Scalper (Fokus USD):

1. NFP & Retail Sales:
   - Actual > Forecast -> USD Naik -> XAU/USD & EUR/USD anjlok, USD/JPY naik
   - Actual < Forecast -> USD Turun -> XAU/USD & EUR/USD naik, USD/JPY turun

2. CPI & PPI (Inflasi):
   - Actual > Forecast (Inflasi panas) -> Fed naik rate -> USD Naik -> XAU & EUR anjlok
   - Actual < Forecast (Inflasi dingin) -> Fed potensial turun -> USD Turun -> XAU & EUR naik

3. Unemployment Rate (KEBALIKAN NFP!):
   - Actual > Forecast (Pengangguran bertambah) -> USD Turun -> XAU & EUR naik
   - Actual < Forecast (Pengangguran berkurang) -> USD Naik -> XAU & EUR anjlok

4. GDP & PMI:
   - Actual > Forecast -> Pertumbuhan kuat -> USD Naik
   - Actual < Forecast -> Pertumbuhan lambat -> USD Turun

Anatomi 3 Fase Pergerakan Berita:
- Fase 1 (0-2 menit): Algoritma & panik. DILARANG MASUK — zona fakeout.
- Fase 2 (2-15 menit): Institutional move. ZONA ENTRY UTAMA.
- Fase 3 (15+ menit): Stabilisasi / retracement.

Strategi paling aman: The 15-Minute Breakout
- Tunggu 15 menit setelah rilis untuk candle M15 pertama terbentuk.
- Tandai High & Low. Pasang Sell Stop di bawah Low (XAU/EUR/GBP) atau Buy Stop di atas High (JPY).
- SL: maksimal 40 pips XAU, 15 pips majors. RR min 1:1.5.
- Target pips pair-specific: XAU 25, EUR 12, GBP 18, JPY 17.

Risk Management:
- Risk per trade: 0.25-0.5% untuk scalper (never use 500:1 max leverage; cap 5:1)
- Daily stop 2-3%, weekly stop 5%, drawdown ladder: -5% halve size, -10% minimum size
- Stop wajib server-side, broker-side (FINEX Indonesia ECN account)
- Hindari pending order pre-release (slippage risk)
- Tidak trade Sabtu/Minggu
"""


@dataclass
class NewsEvent:
    title: str
    country: str
    forecast: Optional[float]
    previous: Optional[float]
    actual: Optional[float]

def analyze_event_groq(ev: NewsEvent, api_key: str, model: str = "llama-3.3-70b-versatile") -> dict:
    """Panggil Groq untuk menganalisis 1 event."""
    if Groq is None:
        # fallback: gunakan raw requests
        if requests is None:
            return {"summary": "(groq & requests unavailable)", "model": None}
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": f"Anda AI Trading Assistant untuk FINEX Indonesia. {RULES}"},
                {"role": "user", "content": f"""Analisa event berikut dengan 3 Angka Emas:
Title: {ev.title}
Country: {ev.country}
Previous: {ev.previous}
Forecast: {ev.forecast}
Actual: {ev.actual}

Beri: (1) Arah USD, (2) Arah XAU/USD, EUR/USD, GBP/USD, USD/JPY, (3) Strategi terbaik dengan SL/TP pips, (4) Estimasi lots untuk equity $10,000 risk 0.5%. Jawab ringkas."""},
            ],
            "temperature": 0.3,
            "max_tokens": 600,
        }
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        data = r.json()
        return {
            "summary": data["choices"][0]["message"]["content"],
            "model": data.get("model"),
            "tokens": data.get("usage", {}).get("total_tokens", 0),
        }
    # use official SDK
    client = Groq(api_key=api_key)
    chat = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": f"Anda AI Trading Assistant untuk FINEX Indonesia. {RULES}"},
            {"role": "user", "content": f"""Analisa event berikut dengan 3 Angka Emas:
Title: {ev.title}
Country: {ev.country}
Previous: {ev.previous}
Forecast: {ev.forecast}
Actual: {ev.actual}

Beri: (1) Arah USD, (2) Arah XAU/USD, EUR/USD, GBP/USD, USD/JPY, (3) Strategi terbaik dengan SL/TP pips, (4) Estimasi lots untuk equity $10,000 risk 0.5%. Jawab ringkas."""},
        ],
        temperature=0.3,
        max_tokens=600,
    )
    return {
        "summary": chat.choices[0].message.content,
        "model": chat.model,
        "tokens": chat.usage.total_tokens if chat.usage else 0,
    }


def main():
    print("=" * 60)
    print("FINEX Groq AI News Analyzer (3 Angka Emas)")
    print("=" * 60)
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        print("[ERROR] Set GROQ_API_KEY env var: 'gsk_...'")
        return
    # Sample events
    events = [
        NewsEvent("CPI m/m (US)", "US", 2.4, 2.4, 2.7),    # inflasi panas
        NewsEvent("Non-Farm Payroll", "US", 227, 200, 250), # strong NFP
        NewsEvent("Unemployment Rate", "US", 4.1, 4.1, 4.3),# unemployment up -> USD down
        NewsEvent("GDP q/q", "US", 3.0, 2.8, 2.6),          # GDP miss
    ]
    for ev in events:
        print(f"\n--- {ev.title} ({ev.country}) ---")
        print(f"Prev={ev.previous} Fcst={ev.forecast} Actual={ev.actual}")
        t0 = time.time()
        result = analyze_event_groq(ev, api_key)
        print(f"({result.get('latency_ms', 0)}ms, model={result.get('model')}, tokens={result.get('tokens')})")
        print(result["summary"])


if __name__ == "__main__":
    main()
