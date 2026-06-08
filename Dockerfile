FROM python:3.11-slim

LABEL org.opencontainers.image.title="Local Video Downloader"
LABEL org.opencontainers.image.description="Self-hosted video URL extraction API powered by yt-dlp"

# Install yt-dlp and dependencies
RUN pip install --no-cache-dir yt-dlp

# Create app directory
WORKDIR /app

# Copy application
COPY server.py extractor.py ./

# Create logs directory
RUN mkdir -p /app/logs
VOLUME ["/app/logs"]

# Expose API port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/api/health')"

# Run server
CMD ["python3", "server.py", "--port", "8765", "--host", "0.0.0.0"]
