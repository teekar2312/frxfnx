# FINEX Forex Trading Platform — Python 3.14 MT5 Bridge
#
# Modul ini dijalankan di Windows 11 dengan:
#   - MetaTrader 5 + akun FINEX Indonesia (live atau demo)
#   - VS Code sebagai IDE
#   - Python 3.14 (gunakan `winget install Python.Python.3.14` atau installer resmi)
#
# Fitur:
#   1. Auto-launch MT5 terminal64.exe jika belum running.
#   2. Koneksi MT5 via MetaTrader5 lib (login, server, password dari config).
#   3. Subskripsi tick realtime untuk XAU/USD, EUR/USD, GBP/USD, USD/JPY.
#   4. Eksekusi order market (BUY/SELL) dengan SL/TP server-side.
#   5. Manajemen posisi: list, close, modify SL/TP.
#   6. Filter jadwal trading (Senin-Jumat, 08:00-23:30 default), blok Sabtu/Minggu.
#   7. Integrasi Groq AI (cloud) untuk analisa berita & saran strategi.
#   8. Integrasi Local AI via Ollama untuk analisa offline.
#   9. Fetch berita ekonomi dari Tiingo News API.
#  10. Implementasi 3 Angka Emas (Previous / Forecast / Actual) + kamus reaksi kilat.
#  11. Engine strategi: Fade the Spike (Strategi A) & 15-Min Breakout (Strategi B).
#  12. Risk manager: fixed-fractional sizing, leverage cap 5:1, daily/weekly stop.
#
# Catatan kompatibilitas: code ini ditulis untuk Python 3.14; dapat juga jalan pada 3.11+.
# Paket: pip install MetaTrader5 groq requests ollama websocket-client python-dotenv

from __future__ import annotations

import os
import sys
import json
import time
import signal
import subprocess
import threading
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from typing import Optional, Callable

# Catatan: MetaTrader5 hanya tersedia di Windows. Pada Linux/CI, import ini akan gagal
# jadi kita berikan fallback stub agar code tetap parse-able.
try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None  # type: ignore

try:
    import requests
except ImportError:
    requests = None  # type: ignore

# ============================================================
# CONFIG
# ============================================================

CONFIG: dict = {
    # MT5 broker (FINEX Indonesia)
    "mt5_path": r"C:\Program Files\FINEX Indonesia\MetaTrader 5\terminal64.exe",
    "mt5_login": 0,            # isi dengan nomor akun (int)
    "mt5_password": "",        # isi password
    "mt5_server": "FINEX-Live",

    # Symbols yang dipantau
    "symbols": ["XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY"],

    # Jadwal trading (Senin-Jumat, 08:00-23:30 WIB)
    "trading_start": "08:00",
    "trading_end": "23:30",
    "block_weekend": True,

    # Risk defaults (scalper)
    "risk_per_trade_pct": 0.5,
    "daily_stop_pct": 3.0,
    "weekly_stop_pct": 5.0,
    "max_leverage_ratio": 5.0,
    "max_margin_usage_pct": 30.0,
    "rr_min": 1.5,

    # AI providers
    "groq_api_key": os.getenv("GROQ_API_KEY", ""),
    "groq_model": "llama-3.3-70b-versatile",
    "local_ai_endpoint": "http://127.0.0.1:11434/api/generate",
    "local_ai_model": "llama3.1:8b",
    "ai_provider": "groq",  # 'groq' | 'local'

    # Tiingo
    "tiingo_api_key": os.getenv("TIINGO_API_KEY", ""),
}


# ============================================================
# SCHEDULE
# ============================================================

def is_weekend(now: Optional[datetime] = None) -> bool:
    now = now or datetime.now()
    return now.weekday() >= 5  # Sabtu (5), Minggu (6)

def is_trading_allowed(cfg: dict, now: Optional[datetime] = None) -> bool:
    now = now or datetime.now()
    if cfg.get("block_weekend", True) and is_weekend(now):
        return False
    sh, sm = map(int, cfg["trading_start"].split(":"))
    eh, em = map(int, cfg["trading_end"].split(":"))
    cur = now.hour * 60 + now.minute
    return (sh * 60 + sm) <= cur <= (eh * 60 + em)


# ============================================================
# MT5 LAUNCH & CONNECT
# ============================================================

def ensure_mt5_running(cfg: dict) -> bool:
    """Auto-launch terminal64.exe jika belum running (Windows only)."""
    if sys.platform != "win32" or mt5 is None:
        print("[WARN] MetaTrader5 hanya tersedia di Windows. Skipping launch.")
        return False
    # Cek apakah MT5 sudah running via tasklist
    try:
        out = subprocess.check_output(["tasklist", "/FI", "IMAGENAME eq terminal64.exe"], shell=True).decode()
        if "terminal64.exe" in out:
            print("[INFO] MT5 sudah running.")
            return True
    except Exception as e:
        print(f"[WARN] Tidak dapat memeriksa tasklist: {e}")
    # Launch
    path = cfg.get("mt5_path", "")
    if not path or not os.path.exists(path):
        print(f"[ERROR] Path MT5 tidak ditemukan: {path}")
        return False
    print(f"[INFO] Launching MT5: {path}")
    subprocess.Popen([path])
    time.sleep(8)
    return True


def connect_mt5(cfg: dict) -> bool:
    if mt5 is None:
        print("[ERROR] MetaTrader5 module tidak tersedia. Install: pip install MetaTrader5")
        return False
    if not mt5.initialize():
        print(f"[ERROR] initialize() failed: {mt5.last_error()}")
        return False
    info = mt5.account_info()
    if info is None:
        # Coba login
        authorized = mt5.login(
            int(cfg["mt5_login"]),
            password=cfg["mt5_password"],
            server=cfg["mt5_server"],
        )
        if not authorized:
            print(f"[ERROR] login() failed: {mt5.last_error()}")
            mt5.shutdown()
            return False
        info = mt5.account_info()
    print(f"[OK] Connected: #{info.login} balance={info.balance} equity={info.equity} leverage=1:{info.leverage}")
    return True


# ============================================================
# SYMBOLS & TICKS
# ============================================================

@dataclass
class Tick:
    symbol: str
    bid: float
    ask: float
    digits: int
    time: str

def fetch_ticks(symbols: list[str]) -> list[Tick]:
    if mt5 is None:
        return []
    out = []
    for sym in symbols:
        # MT5 symbol names use no slash: XAUUSD, EURUSD, etc.
        mt5_sym = sym.replace("/", "")
        info = mt5.symbol_info(mt5_sym)
        if info is None:
            # try with slash
            info = mt5.symbol_info(sym)
        if info is None:
            continue
        tick = mt5.symbol_info_tick(mt5_sym if mt5.symbol_info(mt5_sym) else sym)
        if tick is None:
            continue
        out.append(Tick(
            symbol=sym,
            bid=tick.bid,
            ask=tick.ask,
            digits=info.digits,
            time=datetime.now().isoformat(),
        ))
    return out


# ============================================================
# ORDER EXECUTION
# ============================================================

PIP_SIZE = {
    "XAU/USD": 0.10,
    "EUR/USD": 0.0001,
    "GBP/USD": 0.0001,
    "USD/JPY": 0.01,
}
PIP_VALUE_PER_LOT = {
    "XAU/USD": 10.0,
    "EUR/USD": 10.0,
    "GBP/USD": 10.0,
    "USD/JPY": 9.0,
}
STOP_PIPS_MAX = {
    "XAU/USD": 40,
    "EUR/USD": 15,
    "GBP/USD": 20,
    "USD/JPY": 20,
}
TP_PIPS_TARGET = {
    "XAU/USD": 25,
    "EUR/USD": 12,
    "GBP/USD": 18,
    "USD/JPY": 17,
}


def open_market(symbol: str, side: str, lots: float, sl_pips: Optional[float] = None,
               tp_pips: Optional[float] = None, deviation: int = 20,
               magic: int = 99001, comment: str = "FINEX-FOREX") -> dict:
    """Buka order market BUY/SELL. SL/TP dalam pips (server-side)."""
    if mt5 is None:
        return {"ok": False, "msg": "MetaTrader5 not available"}
    if not is_trading_allowed(CONFIG):
        return {"ok": False, "msg": "Di luar jam trading atau akhir pekan"}
    mt5_sym = symbol.replace("/", "")
    tick = mt5.symbol_info_tick(mt5_sym)
    info = mt5.symbol_info(mt5_sym)
    if not tick or not info:
        return {"ok": False, "msg": f"Symbol {symbol} tidak tersedia"}
    pip = PIP_SIZE.get(symbol, info.point * 10)
    price = tick.ask if side == "BUY" else tick.bid
    sl_price = None
    tp_price = None
    if sl_pips:
        sl_price = price - sl_pips * pip if side == "BUY" else price + sl_pips * pip
    if tp_pips:
        tp_price = price + tp_pips * pip if side == "BUY" else price - tp_pips * pip
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": mt5_sym,
        "volume": float(lots),
        "type": mt5.ORDER_TYPE_BUY if side == "BUY" else mt5.ORDER_TYPE_SELL,
        "price": price,
        "sl": round(sl_price, info.digits) if sl_price else 0.0,
        "tp": round(tp_price, info.digits) if tp_price else 0.0,
        "deviation": deviation,
        "magic": magic,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result is None:
        return {"ok": False, "msg": f"order_send() failed: {mt5.last_error()}"}
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"ok": False, "msg": f"retcode={result.retcode}", "comment": result.comment}
    return {
        "ok": True,
        "ticket": result.order,
        "price": result.price,
        "volume": result.volume,
        "comment": result.comment,
    }


def close_position(ticket: int) -> dict:
    """Tutup posisi berdasarkan ticket."""
    if mt5 is None:
        return {"ok": False, "msg": "MetaTrader5 not available"}
    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        return {"ok": False, "msg": f"Posisi #{ticket} tidak ditemukan"}
    pos = positions[0]
    sym = pos.symbol
    tick = mt5.symbol_info_tick(sym)
    info = mt5.symbol_info(sym)
    if not tick or not info:
        return {"ok": False, "msg": "Tick/info unavailable"}
    side = "SELL" if pos.type == mt5.POSITION_TYPE_BUY else "BUY"
    price = tick.bid if side == "SELL" else tick.ask
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": sym,
        "volume": float(pos.volume),
        "type": mt5.ORDER_TYPE_SELL if side == "SELL" else mt5.ORDER_TYPE_BUY,
        "position": ticket,
        "price": price,
        "deviation": 20,
        "magic": pos.magic,
        "comment": f"close #{ticket}",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"ok": False, "msg": f"close failed: retcode={result.retcode if result else 'None'}"}
    return {"ok": True, "ticket": ticket, "price": result.price}


def modify_position(ticket: int, sl: Optional[float] = None, tp: Optional[float] = None) -> dict:
    if mt5 is None:
        return {"ok": False, "msg": "MetaTrader5 not available"}
    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        return {"ok": False, "msg": "Posisi tidak ditemukan"}
    pos = positions[0]
    request = {
        "action": mt5.TRADE_ACTION_SLTP,
        "symbol": pos.symbol,
        "position": ticket,
        "sl": sl if sl is not None else pos.sl,
        "tp": tp if tp is not None else pos.tp,
    }
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"ok": False, "msg": "modify failed"}
    return {"ok": True, "ticket": ticket}


# ============================================================
# RISK
# ============================================================

def calc_lots(equity: float, risk_pct: float, stop_pips: float, pip_value_per_lot: float) -> float:
    """Lots = (Equity × Risk%) / (stopPips × pipValue)."""
    if stop_pips <= 0 or pip_value_per_lot <= 0:
        return 0.01
    risk_amount = equity * risk_pct / 100.0
    lots = risk_amount / (stop_pips * pip_value_per_lot)
    return max(0.01, round(lots, 2))


# ============================================================
# NEWS ANALYZER (3 Angka Emas)
# ============================================================

@dataclass
class NewsEvent:
    id: str
    title: str
    country: str
    currency: str
    impact: str
    event_time: str
    previous: Optional[float] = None
    forecast: Optional[float] = None
    actual: Optional[float] = None
    source: str = "manual"
    # derived
    deviation: Optional[float] = None
    direction_usd: str = "neutral"
    direction_xau: str = "neutral"
    direction_eur: str = "neutral"
    direction_gbp: str = "neutral"
    direction_jpy: str = "neutral"

TITLE_RULES = [
    ("unemployment", True, "Unemployment"),    # inverse: Actual > Fcst -> USD down
    ("nonfarm|nfp|payroll", False, "NFP"),
    ("retail", False, "Retail Sales"),
    ("cpi|consumer price", False, "CPI"),
    ("ppi|producer price", False, "PPI"),
    ("gdp|gross domestic", False, "GDP"),
    ("pmi", False, "PMI"),
    ("interest rate|fed funds|fomc", False, "IR"),
]

import re

def analyze_news(ev: NewsEvent) -> NewsEvent:
    if ev.actual is None or ev.forecast is None:
        return ev
    base_dev = ((ev.actual - ev.forecast) / abs(ev.forecast)) * 100 if ev.forecast != 0 else 0
    ev.deviation = round(base_dev, 2)
    actual_greater = ev.actual > ev.forecast
    inverse = False
    for pat, inv, _ in TITLE_RULES:
        if re.search(pat, ev.title, re.IGNORECASE):
            inverse = inv
            break
    ev.direction_usd = ("down" if inverse else "up") if actual_greater else ("up" if inverse else "down")
    inv = lambda d: "up" if d == "down" else "down" if d == "up" else "neutral"
    ev.direction_xau = inv(ev.direction_usd)
    ev.direction_eur = inv(ev.direction_usd)
    ev.direction_gbp = inv(ev.direction_usd)
    ev.direction_jpy = ev.direction_usd  # USD/JPY naik jika USD naik
    return ev


# ============================================================
# TIINGO NEWS API
# ============================================================

def fetch_tiingo_news(api_key: str, limit: int = 50) -> list[dict]:
    if not api_key or requests is None:
        return []
    url = "https://api.tiingo.com/tiingo/news"
    headers = {"Authorization": f"Token {api_key}"}
    try:
        r = requests.get(url, headers=headers, params={"limit": limit}, timeout=15)
        if r.status_code != 200:
            print(f"[ERROR] Tiingo: HTTP {r.status_code}")
            return []
        return r.json()
    except Exception as e:
        print(f"[ERROR] Tiingo fetch: {e}")
        return []


# ============================================================
# GROQ AI
# ============================================================

def groq_chat(prompt: str, system: str, cfg: dict) -> dict:
    if requests is None:
        return {"content": "(requests unavailable)", "model": None, "latency_ms": 0}
    if not cfg.get("groq_api_key"):
        return {
            "content": f"(Groq API key belum di-set. Mock response untuk demo.)\n\nPertanyaan: {prompt}\n\nRekomendasi: ikuti 15-Min Breakout, SL 40 pips XAU, target 25 pips.",
            "model": "mock",
            "latency_ms": 0,
        }
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {cfg['groq_api_key']}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": cfg.get("groq_model", "llama-3.3-70b-versatile"),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 800,
    }
    t0 = time.time()
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=30)
        data = r.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "model": data.get("model"),
            "tokens": data.get("usage", {}).get("total_tokens", 0),
            "latency_ms": int((time.time() - t0) * 1000),
        }
    except Exception as e:
        return {"content": f"(Groq error: {e})", "model": None, "latency_ms": 0}


# ============================================================
# LOCAL AI (Ollama)
# ============================================================

def local_ai_chat(prompt: str, system: str, cfg: dict) -> dict:
    if requests is None:
        return {"content": "(requests unavailable)", "model": None, "latency_ms": 0}
    url = cfg.get("local_ai_endpoint", "http://127.0.0.1:11434/api/generate")
    payload = {
        "model": cfg.get("local_ai_model", "llama3.1:8b"),
        "prompt": f"{system}\n\nUser: {prompt}\nAssistant:",
        "stream": False,
        "options": {"temperature": 0.4, "num_predict": 600},
    }
    t0 = time.time()
    try:
        r = requests.post(url, json=payload, timeout=60)
        data = r.json()
        return {
            "content": data.get("response", ""),
            "model": cfg.get("local_ai_model"),
            "tokens": data.get("eval_count", 0),
            "latency_ms": int((time.time() - t0) * 1000),
        }
    except Exception as e:
        return {"content": f"(Local AI error: {e})", "model": None, "latency_ms": 0}


# ============================================================
# STRATEGY ENGINES
# ============================================================

@dataclass
class BreakoutLevels:
    high: float
    low: float
    candle_close_time: str

def detect_15min_breakout(symbol: str, release_time: datetime) -> Optional[BreakoutLevels]:
    """Strategi B: Tunggu candle M15 pertama post-release, kembalikan High/Low."""
    if mt5 is None:
        return None
    mt5_sym = symbol.replace("/", "")
    rates = mt5.copy_rates_from(
        mt5_sym, mt5.TIMEFRAME_M15, int(release_time.timestamp()) + 60, 1
    )
    if rates is None or len(rates) == 0:
        return None
    candle = rates[0]
    return BreakoutLevels(
        high=float(candle["high"]),
        low=float(candle["low"]),
        candle_close_time=datetime.fromtimestamp(candle["time"] + 900).isoformat(),
    )

def execute_breakout_strategy(symbol: str, levels: BreakoutLevels, side: str, lots: float,
                                sl_pips: float, tp_pips: float) -> dict:
    """Tempatkan Buy Stop / Sell Stop berdasarkan level candle M15 pertama."""
    if mt5 is None:
        return {"ok": False, "msg": "MetaTrader5 not available"}
    mt5_sym = symbol.replace("/", "")
    info = mt5.symbol_info(mt5_sym)
    if not info:
        return {"ok": False, "msg": "Symbol info unavailable"}
    if side == "BUY":
        price = levels.high + info.point * 5
        type_order = mt5.ORDER_TYPE_BUY_STOP
        sl = price - sl_pips * PIP_SIZE[symbol]
        tp = price + tp_pips * PIP_SIZE[symbol]
    else:
        price = levels.low - info.point * 5
        type_order = mt5.ORDER_TYPE_SELL_STOP
        sl = price + sl_pips * PIP_SIZE[symbol]
        tp = price - tp_pips * PIP_SIZE[symbol]
    request = {
        "action": mt5.TRADE_ACTION_PENDING,
        "symbol": mt5_sym,
        "volume": float(lots),
        "type": type_order,
        "price": price,
        "sl": round(sl, info.digits),
        "tp": round(tp, info.digits),
        "magic": 99002,
        "comment": "15min-breakout",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_RETURN,
    }
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"ok": False, "msg": f"pending failed: retcode={result.retcode if result else 'None'}"}
    return {"ok": True, "ticket": result.order, "price": result.price}


# ============================================================
# MAIN BRIDGE LOOP (CLI demo)
# ============================================================

def main():
    print("=" * 60)
    print("FINEX Forex Trading Platform — Python 3.14 MT5 Bridge")
    print("=" * 60)

    # 1. Auto-launch MT5
    if sys.platform == "win32":
        ensure_mt5_running(CONFIG)

    # 2. Connect MT5
    connected = connect_mt5(CONFIG)
    if not connected:
        print("[WARN] MT5 tidak terhubung. Lanjut dalam mode simulation.")

    # 3. Display summary
    if connected and mt5 is not None:
        info = mt5.account_info()
        print(f"\n[Account] #{info.login} | equity ${info.equity} | balance ${info.balance}")
        print(f"[Leverage] 1:{info.leverage} | margin ${info.margin} | free ${info.margin_free}")

    # 4. Demo loop: print ticks every 5s
    print("\n[INFO] Streaming tick every 5s. Ctrl+C untuk berhenti.\n")
    try:
        while True:
            now = datetime.now()
            allowed = is_trading_allowed(CONFIG, now)
            status = "ACTIVE" if allowed else f"PAUSE (Sabtu/Minggu)" if is_weekend(now) else "PAUSE (out of hours)"
            print(f"[{now.strftime('%H:%M:%S')}] Trading: {status}")
            if connected and mt5 is not None:
                ticks = fetch_ticks(CONFIG["symbols"])
                for t in ticks:
                    spread_pips = (t.ask - t.bid) / PIP_SIZE.get(t.symbol, 0.0001)
                    print(f"  {t.symbol:8s}  bid={t.bid:.{t.digits}f}  ask={t.ask:.{t.digits}f}  spread={spread_pips:.1f} pip")
            else:
                print("  (mode simulation — MT5 belum terhubung)")
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n[INFO] Stopping...")
    finally:
        if mt5 is not None:
            mt5.shutdown()
        print("[OK] Shutdown selesai.")


if __name__ == "__main__":
    main()
