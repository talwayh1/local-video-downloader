#!/bin/bash
# Auto-update local-video-downloader: pull latest code, rebuild, restart
# Run this on the US node: /opt/local-video-downloader/update.sh

set -e

cd /opt/local-video-downloader
LOG="/opt/video-dl-logs/update.log"

echo "[$(date)] Checking for updates..." | tee -a "$LOG"

# Pull latest code
if [ -d .git ]; then
    git pull origin master 2>&1 | tee -a "$LOG"
else
    echo "[$(date)] No git repo, skipping code update" | tee -a "$LOG"
fi

# Rebuild and restart
echo "[$(date)] Rebuilding Docker..." | tee -a "$LOG"
sudo docker build -t local-video-downloader:latest . 2>&1 | tee -a "$LOG"

echo "[$(date)] Restarting container..." | tee -a "$LOG"
sudo docker rm -f local-video-downloader 2>/dev/null || true
sudo docker run -d --name local-video-downloader \
    --restart unless-stopped \
    -p 8765:8765 \
    -v /opt/video-dl-logs:/app/logs \
    local-video-downloader:latest

echo "[$(date)] ✅ Update complete" | tee -a "$LOG"
