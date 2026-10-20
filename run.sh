#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ ! -f ".venv/bin/python" ]; then
    echo "❌ Virtual environment .venv belum ditemukan."
    echo "Jalankan: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
    exit 1
fi

# Hot reload aktif secara bawaan: ubah kode lalu server restart sendiri.
# ./run.sh --no-reload  (atau RELOAD=0) untuk sesi generate panjang dan saat memakai antrian,
# karena restart menghapus job yang masih menunggu di memori.
RELOAD="${RELOAD:-1}"
BUILD=0
for arg in "$@"; do
    case "$arg" in
        --no-reload) RELOAD=0 ;;
        --build) BUILD=1 ;;
        --help|-h)
            echo "Pemakaian: ./run.sh [--no-reload] [--build]"
            echo "  --no-reload  matikan hot reload (wajib untuk antrian jangka panjang)"
            echo "  --build      paksa bangun ulang frontend React"
            exit 0
            ;;
    esac
done
export RELOAD

# --- Frontend React (FieldNote UI) -----------------------------------------
PNPM=""
if command -v pnpm >/dev/null 2>&1; then
    PNPM="pnpm"
elif command -v corepack >/dev/null 2>&1; then
    PNPM="corepack pnpm"
elif command -v npx >/dev/null 2>&1; then
    PNPM="npx --yes pnpm@10"
fi

if [ "$BUILD" = "1" ] || [ ! -f "static/app/index.html" ]; then
    if [ -z "$PNPM" ]; then
        echo "❌ Frontend belum dibangun dan pnpm tidak ditemukan."
        echo "   Pasang Node.js 20+ lalu jalankan: cd frontend && pnpm install && pnpm run build:vendor && pnpm run build"
        exit 1
    fi
    echo "🏗️  Membangun frontend (FieldNote UI)…"
    ( cd frontend && $PNPM install --silent && $PNPM run build:vendor && $PNPM run build )
    echo "✅ Frontend siap di static/app/"
fi

PORT="${PORT:-5055}"
echo "🎙️ Menjalankan Studio Narasi di http://127.0.0.1:$PORT (hot reload: $([ "$RELOAD" = "0" ] && echo mati || echo aktif))"
exec .venv/bin/python app.py
