#!/usr/bin/env python3
"""Local video URL extractor using yt-dlp as the parsing engine.
Supports: YouTube, TikTok, Douyin, Instagram, Facebook, X/Twitter,
          Threads, XiaoHongShu, TED, Pinterest, Snapchat, and 1000+ more.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

YT_DLP_BIN = "yt-dlp"


def extract(url: str, timeout: int = 60, proxy: str = None) -> dict:
    """Extract video metadata, formats, and direct download URLs from a platform URL.

    Returns:
        {
            "ok": true/false,
            "title": "...",
            "duration": 123,
            "thumbnail": "...",
            "uploader": "...",
            "platform": "youtube",
            "formats": [
                {
                    "format_id": "137+140",
                    "ext": "mp4",
                    "resolution": "1920x1080",
                    "fps": 30,
                    "filesize": 12345678,
                    "url": "https://...",
                    "format_note": "1080p"
                },
                ...
            ],
            "best_url": "https://..." (best direct download URL),
            "error": "..." (if not ok)
        }
    """
    # Build yt-dlp command: dump JSON with all formats
    cmd = [
        YT_DLP_BIN,
        url,
        "--dump-json",
        "--no-warnings",
        "--no-playlist",
        "--ignore-errors",
        "--socket-timeout", "30",
    ]
    if proxy:
        cmd.extend(["--proxy", proxy])

    # Build environment with any proxy settings
    env = os.environ.copy()
    if proxy and not any(cmd_arg.startswith("--proxy") for cmd_arg in cmd):
        env["http_proxy"] = proxy
        env["https_proxy"] = proxy

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )

        if result.returncode != 0 or not result.stdout.strip():
            error_msg = result.stderr.strip() or "No data extracted"
            return {
                "ok": False,
                "error": error_msg[-500:],  # truncate long errors
            }

        raw = json.loads(result.stdout.strip())

        # Parse formats into a clean list
        formats_raw = raw.get("formats") or []
        formats_clean = []
        seen_ids = set()

        for fmt in formats_raw:
            fid = fmt.get("format_id", "")
            if fid in seen_ids:
                continue
            seen_ids.add(fid)

            # Only include video formats (skip audio-only unless no video)
            vcodec = fmt.get("vcodec", "none")
            acodec = fmt.get("acodec", "none")

            # Skip extremely small/thumbnail "formats"
            filesize = fmt.get("filesize") or fmt.get("filesize_approx") or 0
            if filesize and filesize < 1024:
                continue

            resolution = fmt.get("resolution") or ""
            height = fmt.get("height") or 0

            formats_clean.append({
                "format_id": fid,
                "ext": fmt.get("ext", "unknown"),
                "resolution": resolution,
                "height": height,
                "fps": fmt.get("fps"),
                "filesize": filesize,
                "url": fmt.get("url", ""),
                "format_note": fmt.get("format_note", ""),
                "vcodec": vcodec,
                "acodec": acodec,
                "tbr": fmt.get("tbr"),
            })

        # Build clean response
        response = {
            "ok": True,
            "id": raw.get("id", ""),
            "title": raw.get("title", ""),
            "description": (raw.get("description") or "")[:500],
            "duration": raw.get("duration"),
            "thumbnail": raw.get("thumbnail", ""),
            "uploader": raw.get("uploader", "") or raw.get("channel", ""),
            "platform": raw.get("extractor_key", "unknown"),
            "webpage_url": raw.get("webpage_url", url),
            "view_count": raw.get("view_count"),
            "like_count": raw.get("like_count"),
            "formats": formats_clean,
        }

        # Find best direct URL (prefer mp4, highest quality combined format)
        best = _pick_best_format(formats_clean)
        response["best_url"] = best["url"] if best else ""
        response["best_format"] = best

        return response

    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "Extraction timed out (>60s)"}
    except json.JSONDecodeError as e:
        return {
            "ok": False,
            "error": f"Failed to parse yt-dlp output: {e}",
        }
    except Exception as e:
        return {"ok": False, "error": str(e)[:500]}


def _pick_best_format(formats: list) -> Optional[dict]:
    """Pick the best single format: prefer MP4 with video+audio, highest resolution."""
    # Priority: combined (video+audio) > video-only > audio-only
    combined = [f for f in formats if f["vcodec"] != "none" and f["acodec"] != "none"]
    video_only = [f for f in formats if f["vcodec"] != "none" and f["acodec"] == "none"]
    audio_only = [f for f in formats if f["vcodec"] == "none" and f["acodec"] != "none"]

    # Prefer MP4 combined
    mp4_combined = [f for f in combined if f["ext"] == "mp4"]
    candidates = mp4_combined or combined or video_only or audio_only or formats

    # Sort by height desc, then filesize desc — take the absolute best (no cap)
    candidates.sort(key=lambda f: (f.get("height", 0) or 0, f.get("filesize", 0) or 0), reverse=True)
    return candidates[0] if candidates else None


def extract_simple(url: str) -> dict:
    """Simplified extraction: just the best download URL + metadata."""
    full = extract(url)
    if not full.get("ok"):
        return full

    return {
        "ok": True,
        "title": full["title"],
        "thumbnail": full.get("thumbnail", ""),
        "duration": full.get("duration"),
        "uploader": full.get("uploader", ""),
        "platform": full.get("platform", ""),
        "best_url": full.get("best_url", ""),
        "best_format": full.get("best_format", {}),
        "formats_count": len(full.get("formats", [])),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extractor.py <url>")
        sys.exit(1)

    url = sys.argv[1]
    result = extract(url)
    print(json.dumps(result, ensure_ascii=False, indent=2))
