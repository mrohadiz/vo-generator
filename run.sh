#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

if [ ! -f ".venv/bin/python" ]; then
    echo "❌ Virtual environment .venv belum ditemukan."
    echo "Jalankan: python3 -m venv .venv && .venv/bin/pip install pocket-tts soundfile flask"
    exit 1
fi

# Hot reload aktif secara bawaan: ubah kode lalu server restart sendiri, template langsung berlaku.
# ./run.sh --no-reload  (atau RELOAD=0) untuk sesi generate panjang agar tidak restart di tengah jalan.
for arg in "$@"; do
    [ "$arg" = "--no-reload" ] && export RELOAD=0
done
export RELOAD="${RELOAD:-1}"

PORT="${PORT:-5000}"
echo "🎙️ Menjalankan Studio Narasi di http://127.0.0.1:$PORT (hot reload: $([ "$RELOAD" = "0" ] && echo mati || echo aktif))"
exec .venv/bin/python app.py
