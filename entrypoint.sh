#!/bin/bash
set -e

echo "🔧 Updating yt-dlp to latest version..."
pip install --no-cache-dir --upgrade yt-dlp 2>&1 | tail -1

echo "yt-dlp version: $(yt-dlp --version)"
echo ""

exec python3 /app/server.py --port 8765 --host 0.0.0.0
