-- PostgreSQL init script untuk Docker container
-- Dijalankan otomatis saat postgres container pertama kali start
-- Buat database + extension jika diperlukan

-- Buat database finex (sudah dibuat via POSTGRES_DB env, tapi just in case)
SELECT 'CREATE DATABASE finex'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'finex')\gexec

-- Connect ke database finex
\c finex

-- Enable extension (jika perlu)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Display info
\echo 'PostgreSQL initialized for FINEX Forex Trading Platform'
