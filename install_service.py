#!/usr/bin/env python3
"""
Install the local video downloader as a systemd user service.
Usage: python3 install_service.py [--port 8765]
"""

import os
import sys
import argparse
from pathlib import Path

SERVICE_TEMPLATE = """[Unit]
Description=Local Video Downloader API (yt-dlp based)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart={python} {server_path} --port {port} --host 0.0.0.0
WorkingDirectory={workdir}
Restart=on-failure
RestartSec=10
Environment=PYTHONUNBUFFERED=1
# Add proxy for blocked platforms (GFW)
{proxy_env}

[Install]
WantedBy=default.target
"""


def install_service(port=8765, host="0.0.0.0", proxy=None):
    server_path = Path(__file__).parent / "server.py"
    if not server_path.exists():
        print(f"❌ server.py not found at {server_path}", file=sys.stderr)
        sys.exit(1)

    python = sys.executable
    workdir = str(Path(__file__).parent)

    # Build proxy environment lines
    proxy_env = ""
    if proxy:
        proxy_env = f'Environment="http_proxy={proxy}"\nEnvironment="https_proxy={proxy}"'
    else:
        # Default: use Tailscale proxy for GFW-blocked platforms
        proxy_env = '#Environment="http_proxy=http://100.80.1.3:8317"\n#Environment="https_proxy=http://100.80.1.3:8317"'

    service_content = SERVICE_TEMPLATE.format(
        python=python,
        server_path=server_path,
        port=port,
        workdir=workdir,
        proxy_env=proxy_env,
    )

    # Write to user systemd directory
    systemd_dir = Path.home() / ".config" / "systemd" / "user"
    systemd_dir.mkdir(parents=True, exist_ok=True)
    service_file = systemd_dir / "local-video-downloader.service"

    service_file.write_text(service_content)
    print(f"✅ Service file written: {service_file}")
    print()
    print("To enable and start:")
    print(f"  systemctl --user daemon-reload")
    print(f"  systemctl --user enable local-video-downloader")
    print(f"  systemctl --user start local-video-downloader")
    print(f"  systemctl --user status local-video-downloader")
    print()
    print(f"API will be available at: http://{host}:{port}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Install Local Video Downloader as systemd service")
    parser.add_argument("--port", type=int, default=8765, help="Listen port")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Listen host")
    parser.add_argument("--proxy", type=str, default=None, help="HTTP proxy for yt-dlp (e.g. http://100.80.1.3:8317)")
    args = parser.parse_args()
    install_service(args.port, args.host, args.proxy)
