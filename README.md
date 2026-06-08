# Local Video Downloader

> 自部署视频下载 API — 基于 yt-dlp 的本地视频解析服务，无需依赖第三方在线服务。

[![Docker](https://img.shields.io/badge/Docker-ready-blue)](https://github.com/talwayh1/local-video-downloader/pkgs/container/local-video-downloader)

## 支持平台

YouTube · TikTok · 抖音 · Instagram · X/Twitter · Facebook · Threads · Bilibili · 小红书 · TED · Pinterest · Snapchat · 及 yt-dlp 支持的 1000+ 平台

## 快速部署

### Docker (推荐)

```bash
docker run -d --name video-dl -p 8765:8765 ghcr.io/talwayh1/local-video-downloader:latest
```

### Docker Compose

```bash
docker compose up -d
```

### 验证

```bash
curl http://localhost:8765/api/health
# {"ok": true, "service": "local-video-downloader"}
```

## API

### 提取视频信息

```bash
GET /api/extract?url=<encoded_video_url>
```

返回完整 JSON（含所有可用格式、分辨率、直链等）

### 提取摘要

```bash
GET /api/extract-simple?url=<encoded_video_url>
```

返回简化 JSON（最佳直链 + 元数据）

### 响应示例

```json
{
  "ok": true,
  "title": "Video Title",
  "duration": 120,
  "thumbnail": "https://...",
  "uploader": "creator",
  "platform": "youtube",
  "formats": [
    {
      "format_id": "137+140",
      "ext": "mp4",
      "resolution": "1920x1080",
      "filesize": 50000000,
      "url": "https://...direct-download-url..."
    }
  ],
  "best_url": "https://...best-quality-direct-url..."
}
```

## 浏览器集成

安装 [local-downloader.user.js](userscript/local-downloader.user.js) (Tampermonkey/Violentmonkey)，悬停视频自动出现下载按钮，点击弹出画质选择器。

可配置 API 地址：
```js
GM_setValue("local_dl_api", "http://your-server:8765");
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `YTDLP_PROXY` | yt-dlp 代理地址 (用于 GFW 地区) |

## 本地运行

```bash
pip install yt-dlp
python3 server.py --port 8765
```
