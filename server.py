#!/usr/bin/env python3
"""Local video extraction HTTP API server.
Usage: python3 server.py [--port 8765] [--host 0.0.0.0]
Endpoints:
  GET /api/extract?url=<encoded_url>       -> full JSON with all formats
  GET /api/extract-simple?url=<encoded_url> -> simplified (best URL only)
  GET /api/health                          -> health check
  GET /                                    -> simple web UI
"""

import json
import os
import subprocess
import sys
import threading
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import time
from datetime import datetime, timedelta
import glob

# ===== YT-DLP AUTO-UPDATE =====
_ytdlp_version = "?"

def _get_ytdlp_version():
    try:
        r = subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True, timeout=5)
        if r.returncode == 0:
            return r.stdout.strip()
    except Exception:
        pass
    return "?"

def _update_ytdlp():
    """pip install --upgrade yt-dlp, returns (old_ver, new_ver, output)."""
    global _ytdlp_version
    old = _get_ytdlp_version()
    try:
        r = subprocess.run(
            ["pip", "install", "--no-cache-dir", "--upgrade", "yt-dlp"],
            capture_output=True, text=True, timeout=120
        )
        new = _get_ytdlp_version()
        _ytdlp_version = new
        _log(f"[update] yt-dlp {old} → {new}")
        return old, new, r.stdout + r.stderr
    except Exception as e:
        _log(f"[update] FAILED: {e}")
        return old, old, str(e)

def _auto_update_loop():
    """Background thread: update yt-dlp every 24 hours."""
    while True:
        time.sleep(86400)  # 24h
        try:
            _update_ytdlp()
        except Exception:
            pass

# ===== LOGGING =====
LOG_DIR = os.environ.get("LOG_DIR", "/app/logs")
os.makedirs(LOG_DIR, exist_ok=True)

def _log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        with open(os.path.join(LOG_DIR, f"server-{today}.log"), "a") as f:
            f.write(line + "\n")
    except Exception:
        pass

def _cleanup_logs():
    """Delete log files older than 3 days."""
    cutoff = datetime.now() - timedelta(days=3)
    for f in glob.glob(os.path.join(LOG_DIR, "server-*.log")):
        try:
            fname = os.path.basename(f)
            date_str = fname.replace("server-", "").replace(".log", "")
            file_date = datetime.strptime(date_str, "%Y-%m-%d")
            if file_date < cutoff:
                os.remove(f)
                _log(f"[cleanup] Deleted old log: {fname}")
        except Exception:
            pass

def _read_logs():
    """Return today's log lines as a list."""
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(LOG_DIR, f"server-{today}.log")
    try:
        with open(log_file, "r") as f:
            return f.read().strip().split("\n")
    except Exception:
        return ["No logs yet"]

# Init yt-dlp version (after _log is defined)
_ytdlp_version = _get_ytdlp_version()
_log(f"[init] yt-dlp version: {_ytdlp_version}")

# Simple in-memory cache for extract results (TTL: 300 seconds)
_cache = {}
_CACHE_TTL = 300

def _cached_extract(url, simple=False):
    now = time.time()
    key = url + ("_simple" if simple else "")
    if key in _cache and (now - _cache[key]["ts"]) < _CACHE_TTL:
        return _cache[key]["data"]
    result = extract_simple(url) if simple else extract(url)
    _cache[key] = {"data": result, "ts": now}
    return result

# Add extractor to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extractor import extract, extract_simple, get_direct_url

# Optional proxy for yt-dlp (for GFW-blocked platforms)
YTDLP_PROXY = os.environ.get("YTDLP_PROXY", "")
if not YTDLP_PROXY:
    YTDLP_PROXY = os.environ.get("http_proxy", "")

LOG_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Downloader Logs</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:20px}
h1{color:#58a6ff;margin-bottom:10px;font-size:1.2em}
.toolbar{display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap}
.toolbar button{padding:6px 12px;background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;cursor:pointer;font-family:monospace;font-size:12px}
.toolbar button:hover{background:#30363d}
.toolbar .count{color:#8b949e;font-size:12px;margin-left:auto}
.logs{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px;max-height:75vh;overflow-y:auto;white-space:pre-wrap;font-size:12px;line-height:1.6}
.ok{color:#7ee787}.fail{color:#f85149}.info{color:#58a6ff}.warn{color:#d2991d}
</style>
</head>
<body>
<h1>📋 Downloader Logs</h1>
<div class="toolbar">
<button onclick="location.reload()">🔄 Refresh</button>
<button onclick="showLines(50)">50</button>
<button onclick="showLines(100)">100</button>
<button onclick="showLines(200)">200</button>
<button onclick="showLines(9999)">All</button>
<span class="count" id="lineCount"></span>
</div>
<div class="logs" id="logs">Loading...</div>
<script>
var allLines=[];
function color(l){
if(l.includes('FAILED')||l.includes('ERROR'))return'<span class=fail>'+l+'</span>';
if(l.includes('OK size'))return'<span class=ok>'+l+'</span>';
if(l.includes('START')||l.includes('CMD:'))return'<span class=info>'+l+'</span>';
return l}
function showLines(n){
var L=n>=allLines.length?allLines:allLines.slice(-n);
document.getElementById('logs').innerHTML=L.map(color).join('\\n');
document.getElementById('lineCount').textContent=L.length+' / '+allLines.length+' lines'}
fetch('/api/logs-raw').then(r=>r.json()).then(d=>{allLines=d.lines||[];showLines(50)});
setInterval(()=>fetch('/api/logs-raw').then(r=>r.json()).then(d=>{allLines=d.lines||[];showLines(50)}),10000);
</script>
</body>"""

HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Local Video Downloader</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0d1117; color: #c9d1d9; min-height: 100vh;
  display: flex; justify-content: center; align-items: center;
}
.container {
  max-width: 640px; width: 90%; padding: 40px 20px; text-align: center;
}
h1 { font-size: 1.8em; margin-bottom: 8px; color: #58a6ff; }
.sub { color: #8b949e; margin-bottom: 32px; font-size: 0.95em; }
.input-group { display: flex; gap: 8px; margin-bottom: 24px; }
input[type="url"] {
  flex: 1; padding: 12px 16px; border: 1px solid #30363d;
  border-radius: 8px; background: #161b22; color: #c9d1d9;
  font-size: 0.95em; outline: none;
}
input[type="url"]:focus { border-color: #58a6ff; }
button {
  padding: 12px 24px; background: #238636; color: #fff; border: none;
  border-radius: 8px; font-size: 0.95em; cursor: pointer; white-space: nowrap;
}
button:hover { background: #2ea043; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.result {
  background: #161b22; border: 1px solid #30363d; border-radius: 8px;
  padding: 20px; text-align: left; display: none;
}
.result img { max-width: 100%; border-radius: 4px; margin: 12px 0; }
.result h2 { font-size: 1.1em; margin-bottom: 8px; }
.result .meta { color: #8b949e; font-size: 0.85em; margin-bottom: 12px; }
.result .format-list { margin-top: 12px; }
.result .format-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: #0d1117; border-radius: 4px; margin-bottom: 6px;
}
.result .format-item .res { color: #58a6ff; font-weight: 600; }
.result .format-item .ext { color: #8b949e; font-size: 0.85em; }
.result .format-item .size { color: #7ee787; font-size: 0.85em; }
.result a { color: #58a6ff; text-decoration: none; font-size: 0.85em; }
.result a:hover { text-decoration: underline; }
.error { color: #f85149; padding: 12px; background: #2d1215; border-radius: 4px; }
.spinner {
  display: none; width: 24px; height: 24px; border: 3px solid #30363d;
  border-top-color: #58a6ff; border-radius: 50%; animation: spin 0.8s linear infinite;
  margin: 20px auto;
}
.platforms { color: #484f58; font-size: 0.8em; margin-top: 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="container">
  <h1>📥 Local Video Downloader</h1>
  <p class="sub">Parse video URLs locally — no external service needed</p>
  <div class="input-group">
    <input type="url" id="urlInput" placeholder="Paste video URL (YouTube, TikTok, Instagram, X, Douyin...)" />
    <button id="extractBtn" onclick="doExtract()">Extract</button>
  </div>
  <div class="spinner" id="spinner"></div>
  <div class="result" id="result"></div>
  <p class="platforms">Supports 1000+ platforms via yt-dlp engine</p>
</div>
<script>
async function doExtract() {
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return;

  const btn = document.getElementById('extractBtn');
  const spinner = document.getElementById('spinner');
  const resultDiv = document.getElementById('result');

  btn.disabled = true;
  spinner.style.display = 'block';
  resultDiv.style.display = 'none';

  try {
    const api = '/api/extract?url=' + encodeURIComponent(url);
    const resp = await fetch(api);
    const data = await resp.json();
    const origUrl = encodeURIComponent(url);  // for proxy download links

    if (!data.ok) {
      resultDiv.innerHTML = '<div class="error">' + (data.error || 'Unknown error') + '</div>';
    } else {
      let html = '<h2>' + (data.title || 'Unknown Title') + '</h2>';
      html += '<div class="meta">' + (data.platform || '') + ' · ' + (data.uploader || '') + ' · ' + formatDuration(data.duration) + '</div>';
      if (data.thumbnail) {
        html += '<img src="' + data.thumbnail + '" alt="thumbnail" />';
      }
      html += '<div class="format-list"><strong>Available Formats:</strong>';
      const formats = data.formats || [];
      formats.slice(0, 20).forEach(f => {
        html += '<div class="format-item">';
        html += '<span class="res">' + (f.resolution || f.format_note || 'unknown') + '</span>';
        html += '<span class="ext">' + (f.ext || '') + '</span>';
        html += '<span class="size">' + formatSize(f.filesize) + '</span>';
        html += '<a href="/api/proxy-download?url=' + origUrl + '&format=' + f.format_id + '" target="_blank">Download</a>';
        html += '</div>';
      });
      if (formats.length > 20) {
        html += '<p style="color:#8b949e;font-size:0.85em">+ ' + (formats.length - 20) + ' more formats</p>';
      }
      html += '</div>';

      // Best quality via proxy download
      html += '<div style="margin-top:16px"><a href="/api/proxy-download?url=' + origUrl + '&format=best" target="_blank" style="font-size:1em;padding:8px 16px;background:#238636;border-radius:4px;display:inline-block">⬇ Download Best Quality</a></div>';
      resultDiv.innerHTML = html;
    }
  } catch (e) {
    resultDiv.innerHTML = '<div class="error">Network error: ' + e.message + '</div>';
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
    resultDiv.style.display = 'block';
  }
}

function formatDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function formatSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / 1048576;
  return mb >= 1 ? mb.toFixed(1) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
}

// Enter key submit
document.getElementById('urlInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doExtract();
});
</script>
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html_str, status=200):
        body = html_str.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/health":
            self._send_json({"ok": True, "service": "local-video-downloader", "ytdlp_version": _ytdlp_version})
            return

        if parsed.path == "/api/extract":
            qs = urllib.parse.parse_qs(parsed.query)
            url = qs.get("url", [""])[0]
            if not url:
                self._send_json({"ok": False, "error": "Missing ?url= parameter"}, 400)
                return
            _log(f"[extract] url={url[:120]}")
            result = _cached_extract(url)
            if result.get("ok"):
                _log(f"[extract] OK formats={len(result.get('formats',[]))} title={(result.get('title','') or '')[:50]}")
            else:
                _log(f"[extract] FAILED: {result.get('error','')[:200]}")
            self._send_json(result)
            return

        if parsed.path == "/api/extract-simple":
            qs = urllib.parse.parse_qs(parsed.query)
            url = qs.get("url", [""])[0]
            if not url:
                self._send_json({"ok": False, "error": "Missing ?url= parameter"}, 400)
                return
            _log(f"[extract-simple] url={url[:120]}")
            result = _cached_extract(url, simple=True)
            if result.get("ok"):
                _log(f"[extract-simple] OK title={(result.get('title','') or '')[:50]}")
            else:
                _log(f"[extract-simple] FAILED: {result.get('error','')[:200]}")
            self._send_json(result)
            return

        if parsed.path == "/api/download":
            # Fast one-shot download: extract + stream best quality in single yt-dlp call
            qs = urllib.parse.parse_qs(parsed.query)
            url = qs.get("url", [""])[0]
            if not url:
                self._send_json({"ok": False, "error": "Missing ?url= parameter"}, 400)
                return
            self._stream_video(url, "best")
            return

        if parsed.path == "/" or parsed.path == "":
            self._send_html(HTML)
            return

        if parsed.path == "/logs":
            self._send_html(LOG_HTML)
            return

        if parsed.path == "/api/logs-raw":
            self._send_json({"ok": True, "lines": _read_logs()})
            return

        if parsed.path == "/api/proxy-download":
            self._handle_proxy_download(parsed)
            return

        if parsed.path == "/api/update":
            _log("[update] Manual trigger via API")
            old, new, output = _update_ytdlp()
            self._send_json({
                "ok": old != new,
                "old_version": old,
                "new_version": new,
                "output": output[-2000:]
            })
            return

        self._send_json({"ok": False, "error": "Not found"}, 404)

    def _get_video_id(self, url):
        """Get video ID from yt-dlp — fast, URL-parse only (no network call)."""
        try:
            result = subprocess.run(
                ["yt-dlp", "--print", "id", "--no-warnings", "--no-playlist",
                 "--socket-timeout", "5", url],
                capture_output=True, timeout=10, text=True,
                env={**os.environ, "LANG": "C.UTF-8", "LC_ALL": "C.UTF-8"}
            )
            if result.returncode == 0 and result.stdout.strip():
                vid = result.stdout.strip().split("\n")[0].strip()
                # Sanitize: only allow alphanumeric, dash, underscore
                vid = "".join(c if c.isalnum() or c in "-_" else "_" for c in vid).strip("_")
                if vid:
                    return vid
        except Exception:
            pass
        return "video"

    def _stream_video(self, url, format_id):
        """Stream video to client using yt-dlp stdout pipe — single call, no separate extract."""
        _log(f"[download] START url={url[:120]} format={format_id}")
        t0 = time.time()
        
        vid = self._get_video_id(url)
        ext = "mp4"

        cmd = [
            "yt-dlp", url,
            "-f", format_id,
            "-o", "-",
            "--no-warnings", "--no-playlist",
            "--socket-timeout", "30",
            "--no-progress",
        ]
        _log(f"[download] CMD: yt-dlp -f {format_id} --no-progress {url[:100]}")

        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Access-Control-Allow-Origin", "*")
            disp = f'attachment; filename="{vid}.{ext}"'
            self.send_header("Content-Disposition", disp)
            self.end_headers()

            total_bytes = 0
            chunk_size = 64 * 1024
            while True:
                chunk = proc.stdout.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    proc.kill()
                    _log(f"[download] CLIENT-DISCONNECT after {total_bytes} bytes ({time.time()-t0:.1f}s)")
                    return

            proc.wait(timeout=10)
            elapsed = time.time() - t0
            
            if proc.returncode != 0:
                err = proc.stderr.read().decode("utf-8", errors="replace")
                _log(f"[download] FAILED rc={proc.returncode} size={total_bytes} time={elapsed:.1f}s")
                _log(f"[download] STDERR: {err[:500]}")
            else:
                _log(f"[download] OK size={total_bytes} time={elapsed:.1f}s id={vid}")
                
        except Exception as e:
            _log(f"[download] ERROR: {e}")
            try:
                self._send_json({"ok": False, "error": f"Download failed: {e}"}, 502)
            except Exception:
                pass

    def _handle_proxy_download(self, parsed):
        """Proxy download endpoint — delegates to streaming method."""
        qs = urllib.parse.parse_qs(parsed.query)
        url = qs.get("url", [""])[0]
        format_id = qs.get("format", ["best"])[0]
        if not url:
            self._send_json({"ok": False, "error": "Missing ?url= parameter"}, 400)
            return
        self._stream_video(url, format_id)


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Local Video Downloader API Server")
    parser.add_argument("--port", type=int, default=8765, help="Listen port (default: 8765)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Listen host (default: 0.0.0.0)")
    args = parser.parse_args()

    server = HTTPServer((args.host, args.port), Handler)
    _log(f"🚀 Server starting on {args.host}:{args.port}")
    _log(f"📁 Logs: {LOG_DIR}/server-YYYY-MM-DD.log (rotate 3 days)")
    _cleanup_logs()
    
    # Start background auto-update thread (every 24h)
    t = threading.Thread(target=_auto_update_loop, daemon=True)
    t.start()
    
    print(f"🚀 Local Video Downloader running at http://{args.host}:{args.port}")
    print(f"   yt-dlp: {_ytdlp_version} (auto-update every 24h)")
    print(f"   API: http://{args.host}:{args.port}/api/extract?url=<video_url>")
    print(f"   UI:  http://{args.host}:{args.port}/")
    print(f"   Logs: {LOG_DIR}/server-YYYY-MM-DD.log")
    print()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
