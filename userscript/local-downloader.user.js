// ==UserScript==
// @name        All-in-One Video Downloader – HD (Local API)
// @description Local video downloader using self-hosted yt-dlp API instead of tool77.com
// @namespace   AllInOneDownloader_Local
// @version     2.0.0
// @author      Local (modified from Daniel)
// @include     https://www.ted.com/*
// @include     https://*.youtube.com/*
// @include     https://x.com/*
// @include     https://twitter.com/*
// @include     https://www.threads.com/*
// @include     https://www.instagram.com/*
// @include     https://www.tiktok.com/*
// @include     https://www.douyin.com/*
// @include     https://www.xiaohongshu.com/*
// @include     https://www.facebook.com/*
// @include     https://www.snapchat.com/*
// @include     https://www.pinterest.com/*
// @include     https://www.bilibili.com/*
// @include     https://*.googlevideo.com/*
// @include     https://*.tiktokcdn.com/*
// @include     https://*.douyinvod.com/*
// @include     https://*.fbcdn.net/*
// @include     https://video.twimg.com/*
// @include     https://*.zjcdn.com/*
// @include     https://*.snssdk.com/*
// @include     https://*.tiktokv.com/*
// @include     https://*.douyinstatic.com/*
// @include     https://*.xhscdn.com/*
// @include     https://*.amemv.com/*
// @include     https://*.tikwm.com/*
// @include     https://*.tiktokcdn-eu.com/*
// @include     https://*.tiktokcdn-us.com/*
// @include     https://*.douyinpic.com/*
// @include     https://*.douyinmusicpromotion.com/*
// @include     https://*.cdninstagram.com/*
// @include     https://*.licdn.com/*
// @include     https://*.sc-cdn.net/*
// @include     https://*.pinimg.com/*
// @connect     localhost
// @connect     127.0.0.1
// @connect     100.80.1.68
// @connect     100.80.1.3
// @connect     100.80.4.1
// @connect     100.80.5.1
// @noframes
// @license     MIT
// @run-at      document-start
// @grant       GM_openInTab
// @grant       GM.openInTab
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_download
// @grant       unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // ====================== CONFIGURATION ======================
    // Change this to your local video downloader API server
    const API_BASE = GM_getValue("local_dl_api", "http://100.80.1.3:8765");

    // ====================== COMMON UTILS ======================
    const CommonUtils = {
        getSupportedLang: function() {
            const lang = navigator.language || navigator.userLanguage;
            const supported = { en: "en", es: "es", fr: "fr", pt: "pt", ru: "ru", ja: "ja", de: "de", ko: "ko", it: "it", id: "id", tr: "tr", pl: "pl", uk: "uk", nl: "nl", vi: "vi", th: "th", ar: "ar", fa: "fa", hi: "hi", ms: "ms", "zh-CN": "zh-CN", "zh-TW": "zh-TW" };
            const code = lang.split("-")[0];
            if (code === "zh") return lang === "zh-CN" ? "zh-CN" : "zh-TW";
            return supported[code] || "en";
        },
        openInTab: function(url, options) {
            options = options || { active: true, insert: true, setParent: true };
            if (typeof GM_openInTab === "function") GM_openInTab(url, options);
            else GM.openInTab(url, options);
        },
        genrateDownloadSvg: function(color, width, height) {
            color = color || "#FFF"; width = width || 25; height = height || 25;
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 1024 1024");
            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M684.5 512H573.1V389.8c0-11.2-9.1-20.4-20.4-20.4h-81.5c-11.3 0-20.4 9.1-20.4 20.4v122.4l-112.4 0.6c-4 0-7.1 2.3-8.5 5.5 0 0.1-0.1 0.1-0.1 0.2-0.3 0.6-0.3 1.3-0.4 2-0.1 0.6-0.3 1.2-0.2 1.8 0 0.1-0.1 0.3-0.1 0.4 0 0.4 0.2 0.7 0.3 1.1 0.2 0.8 0.3 1.6 0.7 2.4 0.2 0.4 0.4 0.7 0.6 1 0.3 0.6 0.6 1.2 1 1.7l168.2 188c0.4 0.4 0.8 0.6 1.2 1 0.2 0.2 0.3 0.5 0.6 0.7 0.2 0.2 0.5 0.2 0.8 0.4 0.7 0.4 1.4 0.7 2.1 1 0.2 0.1 0.5 0.2 0.7 0.2 2.9 0.9 6 0.6 8.3-1.3 0.5-0.4 0.8-1.1 1.2-1.6 0.3-0.2 0.6-0.4 0.9-0.7l175.2-187.8c0.5-0.6 0.8-1.3 1.2-1.9 0.2-0.3 0.4-0.5 0.5-0.9 0.4-0.8 0.6-1.6 0.7-2.3 0.1-0.4 0.3-0.6 0.3-1v-1c0.6-5.4-3.6-9.7-9.1-9.7zM471.3 349.1h81.5c11.3 0 20.4-9.1 20.4-20.4v-20.4c0-11.2-9.1-20.4-20.4-20.4h-81.5c-11.3 0-20.4 9.1-20.4 20.4v20.4c0 11.3 9.1 20.4 20.4 20.4zM512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 814.6c-202.4 0-366.5-164.1-366.5-366.6 0-202.4 164.1-366.5 366.5-366.5S878.5 309.6 878.5 512 714.4 878.6 512 878.6z");
            path.setAttribute("fill", color);
            svg.appendChild(path);
            return svg;
        },
        formatBytes: function(bytes, decimals) {
            decimals = decimals || 2;
            const size = Number(bytes);
            if (!Number.isFinite(size) || size < 0) return "0 KB";
            const kb = 1024, mb = kb * 1024, gb = mb * 1024;
            if (size >= gb) return (size / gb).toFixed(decimals) + " GB";
            if (size >= mb) return (size / mb).toFixed(decimals) + " MB";
            return (size / kb).toFixed(decimals) + " KB";
        },

        // ===== LOCAL API CALL (uses GM_xmlhttpRequest to bypass mixed-content blocking) =====
        _gmRequest: function(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    timeout: 30000,
                    onload: function(resp) {
                        try {
                            resolve(JSON.parse(resp.responseText));
                        } catch (e) {
                            reject(new Error("Invalid JSON response"));
                        }
                    },
                    onerror: function(err) { reject(new Error("Network error: " + (err.status || "unknown"))); },
                    ontimeout: function() { reject(new Error("Request timed out")); },
                    onabort: function() { reject(new Error("Request aborted")); }
                });
            });
        },

        apiExtract: function(url) {
            const apiUrl = API_BASE + "/api/extract?url=" + encodeURIComponent(url);
            return this._gmRequest(apiUrl);
        },

        apiExtractSimple: function(url) {
            const apiUrl = API_BASE + "/api/extract-simple?url=" + encodeURIComponent(url);
            return this._gmRequest(apiUrl);
        },

        showFormatSelector: async function(url) {
            const data = await this.apiExtract(url);
            if (!data.ok) {
                alert("Failed to extract video: " + (data.error || "Unknown error"));
                return;
            }
            this._renderFormatUI(data, url);
        },

        _renderFormatUI: function(data, sourceUrl) {
            this._removeFormatUI();
            const lang = this.getSupportedLang();
            const i18n = {
                "zh-CN": { title: "选择画质下载", best: "最佳画质", direct: "直接下载", close: "✕", audio: "仅音频", noFormats: "未找到可用格式" },
                "zh-TW": { title: "選擇畫質下載", best: "最佳畫質", direct: "直接下載", close: "✕", audio: "僅音頻", noFormats: "未找到可用格式" },
                "en": { title: "Select Quality", best: "Best Quality", direct: "Download", close: "✕", audio: "Audio Only", noFormats: "No formats available" }
            };
            const t = i18n[lang] || i18n["en"];

            const overlay = document.createElement("div");
            overlay.id = "localdl-overlay";
            overlay.innerHTML = `
<div id="localdl-modal" style="
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
  background:#1a1a2e;color:#eee;border-radius:12px;padding:20px;
  z-index:2147483647;min-width:380px;max-width:500px;max-height:80vh;
  overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.6);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
    <h3 style="margin:0;font-size:16px;color:#58a6ff;">${t.title}</h3>
    <button id="localdl-close" style="
      background:none;border:none;color:#888;font-size:20px;cursor:pointer;padding:4px 8px;
    ">${t.close}</button>
  </div>
  <p style="margin:0 0 12px;font-size:13px;color:#888;word-break:break-all;">${data.title || "Video"}</p>
  <div id="localdl-formats"></div>
</div>`;

            document.body.appendChild(overlay);

            // Close button
            document.getElementById("localdl-close").onclick = () => this._removeFormatUI();

            // Format list
            const formatsDiv = document.getElementById("localdl-formats");
            const formats = data.formats || [];

            if (formats.length === 0) {
                formatsDiv.innerHTML = `<p style="color:#f85149;">${t.noFormats}</p>`;
                return;
            }

            // Show best direct download as primary
            if (data.best_url) {
                const bestBtn = document.createElement("button");
                bestBtn.style.cssText = "width:100%;padding:12px;margin-bottom:12px;background:#238636;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;";
                bestBtn.textContent = "⬇ " + t.best + (data.best_format ? " (" + (data.best_format.resolution || "HD") + ")" : "");
                bestBtn.onclick = () => { window.open(API_BASE + "/api/proxy-download?url=" + encodeURIComponent(sourceUrl) + "&format=best", "_blank"); this._removeFormatUI(); };
                formatsDiv.appendChild(bestBtn);
            }

            // List individual formats
            formats.forEach(f => {
                if (!f.url) return;
                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin:4px 0;background:#16213e;border-radius:6px;cursor:pointer;";
                row.onmouseenter = () => row.style.background = "#0f3460";
                row.onmouseleave = () => row.style.background = "#16213e";

                const isAudio = f.vcodec === "none";
                const label = isAudio ? t.audio : (f.resolution || f.format_note || f.ext);

                row.innerHTML = `
<span>
  <span style="color:#58a6ff;font-weight:600;">${label}</span>
  <span style="color:#888;margin-left:8px;font-size:12px;">${f.ext}</span>
</span>
<span style="color:#7ee787;font-size:12px;">${f.filesize ? CommonUtils.formatBytes(f.filesize) : ""}</span>`;

                row.onclick = () => { window.open(API_BASE + "/api/proxy-download?url=" + encodeURIComponent(sourceUrl) + "&format=" + f.format_id, "_blank"); this._removeFormatUI(); };
                formatsDiv.appendChild(row);
            });
        },

        _removeFormatUI: function() {
            const el = document.getElementById("localdl-overlay");
            if (el) el.remove();
        },

        localDownloaderEvent: async function(url) {
            this.showFormatSelector(url);
        },

        findParentByClassContains: function(el, classPart, maxLevel) {
            maxLevel = maxLevel || 5;
            let level = 0, cur = el;
            while (cur && level < maxLevel) {
                if (cur.className && typeof cur.className === "string" && cur.className.includes(classPart)) return cur;
                cur = cur.parentElement;
                level++;
            }
            return null;
        },
        onLocationChange: function(callback) {
            if (typeof callback !== "function") return;
            if (!this._locationChangeListeners) this._locationChangeListeners = new Set();
            this._locationChangeListeners.add(callback);
            if (window.__tm_history_patch_v1__) return;
            window.__tm_history_patch_v1__ = true;
            const utils = this;
            let lastHref = location.href, scheduled = false;
            const notify = () => {
                if (scheduled) return;
                scheduled = true;
                requestAnimationFrame(() => {
                    scheduled = false;
                    const href = location.href;
                    if (href === lastHref) return;
                    lastHref = href;
                    utils._locationChangeListeners.forEach(cb => { try { cb(href); } catch (e) {} });
                });
            };
            const patch = type => {
                const raw = history[type];
                if (raw.__tm_patched__) return;
                function wrappedState() { const ret = raw.apply(this, arguments); notify(); return ret; }
                wrappedState.__tm_patched__ = true;
                wrappedState.__original__ = raw;
                history[type] = wrappedState;
            };
            patch("pushState"); patch("replaceState");
            window.addEventListener("popstate", notify);
            window.addEventListener("hashchange", notify);
        }
    };

    // ====================== DOWNLOAD HUD ======================
    const DownloadHud = (function() {
        const instances = new Map();

        function createStyleText(id, zIndex, buttonSize) {
            return `
#${id} { position:fixed;z-index:${zIndex}!important;overflow:hidden;background:rgba(0,0,0,0.3);width:${buttonSize}px;height:${buttonSize}px;border-radius:50%;display:none;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto!important;font-size:16px; }
#${id}::before { content:"";position:absolute;inset:0;border-radius:inherit;padding:2px;background:linear-gradient(90deg,red,orange,yellow,green,cyan,blue,violet,red);background-size:200% 200%;opacity:0;transition:opacity .25s;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude; }
#${id}.localdl-hover { opacity:1; }
#${id}.localdl-hover::before { opacity:1;animation:localdl-rainbow 3s linear infinite; }
#${id} svg { fill:currentColor;pointer-events:none; }
@keyframes localdl-rainbow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }`;
        }

        function isPointInRect(x, y, rect) { return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; }
        function isVisibleElement(element, minSize) {
            const rect = element.getBoundingClientRect();
            if (rect.width <= minSize || rect.height <= minSize) return false;
            const s = window.getComputedStyle(element);
            if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
            return true;
        }

        function createHoverButton(options) {
            options = options || {};
            const id = options.id || "localdl-hud", zIndex = options.zIndex || 2147483647,
                buttonSize = options.buttonSize || 40, buttonPosition = options.buttonPosition || "top-center",
                edgeOffset = options.buttonEdgeOffset || 15, iconSize = options.iconSize || 25,
                iconColor = options.iconColor || "#fff", minSize = options.minTargetSize || 50,
                targetSelector = options.targetSelector || "video",
                extraTargetSelector = options.extraTargetSelector || "",
                getAnchorRect = options.getAnchorRect || null,
                onClick = options.onClick || null;

            if (instances.has(id)) return instances.get(id).api;

            const state = { activeTarget: null, mouseX: -500, mouseY: -500, destroyed: false, disabled: false, buttonPosition, edgeOffset };
            const style = GM_addStyle(createStyleText(id, zIndex, buttonSize));
            const button = document.createElement("div");
            button.id = id;
            button.appendChild(CommonUtils.genrateDownloadSvg(iconColor, iconSize, iconSize));
            (document.body || document.documentElement).appendChild(button);

            const updatePos = () => {
                if (state.destroyed || !state.activeTarget || button.style.display === "none") return;
                let rect = getAnchorRect ? getAnchorRect(state.activeTarget) : null;
                if (!rect) rect = state.activeTarget.getBoundingClientRect();
                if (!rect) return;
                const eo = isFinite(Number(state.edgeOffset)) ? Number(state.edgeOffset) : 15;
                let top = rect.top + eo, left = rect.left + rect.width / 2 - buttonSize / 2;
                switch (state.buttonPosition) {
                    case "bottom-center": top = rect.bottom - buttonSize - eo; left = rect.left + rect.width / 2 - buttonSize / 2; break;
                    case "left-center": top = rect.top + rect.height / 2 - buttonSize / 2; left = rect.left + eo; break;
                    case "right-center": top = rect.top + rect.height / 2 - buttonSize / 2; left = rect.right - buttonSize - eo; break;
                    case "right-top-quarter": top = rect.top + rect.height * 0.25 - buttonSize / 2; left = rect.right - buttonSize - eo; break;
                    case "right-three-quarter": top = rect.top + rect.height * 0.75 - buttonSize / 2; left = rect.right - buttonSize - eo; break;
                    case "left-top-quarter": top = rect.top + rect.height * 0.25 - buttonSize / 2; left = rect.left + eo; break;
                    case "left-three-quarter": top = rect.top + rect.height * 0.75 - buttonSize / 2; left = rect.left + eo; break;
                    case "top-left-quarter": top = rect.top + eo; left = rect.left + rect.width * 0.25 - buttonSize / 2; break;
                    case "top-three-quarter": top = rect.top + eo; left = rect.left + rect.width * 0.75 - buttonSize / 2; break;
                    case "bottom-left-quarter": top = rect.bottom - buttonSize - eo; left = rect.left + rect.width * 0.25 - buttonSize / 2; break;
                    case "bottom-three-quarter": top = rect.bottom - buttonSize - eo; left = rect.left + rect.width * 0.75 - buttonSize / 2; break;
                }
                left = Math.max(5, Math.min(left, window.innerWidth - buttonSize - 5));
                top = Math.max(5, Math.min(top, window.innerHeight - buttonSize - 5));
                button.style.top = top + "px";
                button.style.left = left + "px";
            };

            const pickTarget = () => {
                const targets = document.querySelectorAll(targetSelector);
                for (const el of targets) {
                    const rect = el.getBoundingClientRect();
                    if (!isPointInRect(state.mouseX, state.mouseY, rect)) continue;
                    if (!isVisibleElement(el, minSize)) continue;
                    if (targetSelector === "video" && el.readyState < 3) continue;
                    return el;
                }
                if (extraTargetSelector) {
                    for (const el of document.querySelectorAll(extraTargetSelector)) {
                        if (isPointInRect(state.mouseX, state.mouseY, el.getBoundingClientRect())) return el;
                    }
                }
                return null;
            };

            const checkHover = () => {
                if (state.destroyed || state.disabled) { button.style.display = "none"; state.activeTarget = null; return; }
                if (state.mouseX < 0 || state.mouseY < 0) return;
                const btnRect = button.getBoundingClientRect();
                if (button.style.display === "flex" && isPointInRect(state.mouseX, state.mouseY, btnRect)) {
                    button.classList.add("localdl-hover"); return;
                }
                button.classList.remove("localdl-hover");
                const found = pickTarget();
                if (found) { state.activeTarget = found; button.style.display = "flex"; updatePos(); }
                else { button.style.display = "none"; state.activeTarget = null; }
            };

            const onMouseMove = e => { if (!state.destroyed) { state.mouseX = e.clientX; state.mouseY = e.clientY; checkHover(); } };
            const onMouseDown = e => {
                if (state.destroyed || state.disabled || button.style.display !== "flex") return;
                if (!isPointInRect(e.clientX, e.clientY, button.getBoundingClientRect())) return;
                e.preventDefault(); e.stopPropagation();
                if (onClick) Promise.resolve(onClick(state.activeTarget)).catch(() => {});
            };
            const onScroll = () => { if (!state.destroyed && !state.disabled && state.activeTarget && button.style.display === "flex") updatePos(); };

            window.addEventListener("mousemove", onMouseMove, true);
            window.addEventListener("mousedown", onMouseDown, true);
            window.addEventListener("scroll", onScroll, { passive: true, capture: true });
            const timer = setInterval(() => { if (!state.destroyed && state.mouseX >= 0 && state.mouseY >= 0) checkHover(); }, 300);

            const api = {
                destroy() { if (state.destroyed) return; state.destroyed = true; clearInterval(timer); window.removeEventListener("mousemove", onMouseMove, true); window.removeEventListener("mousedown", onMouseDown, true); window.removeEventListener("scroll", onScroll, true); button.remove(); style.remove(); instances.delete(id); },
                disable() { state.disabled = true; button.style.display = "none"; state.activeTarget = null; },
                enable() { state.disabled = false; checkHover(); },
                setButtonPosition(pos, offset) {
                    const valid = new Set(["top-center","bottom-center","left-center","right-center","top-left-quarter","top-three-quarter","bottom-left-quarter","bottom-three-quarter","right-top-quarter","right-three-quarter","left-top-quarter","left-three-quarter"]);
                    if (valid.has(pos)) state.buttonPosition = pos;
                    if (offset != null && isFinite(Number(offset))) state.edgeOffset = Number(offset);
                    if (state.activeTarget && button.style.display === "flex") updatePos();
                },
                getCurrentTargetElement() { return state.activeTarget; },
                hideButton() { button.style.display = "none"; },
                showButtonForTarget(target) { if (!target || state.disabled) return; state.activeTarget = target; button.style.display = "flex"; updatePos(); }
            };
            instances.set(id, { api });
            return api;
        }

        return {
            createHoverButton,
            mountVideoHoverDownload(spec) {
                spec = spec || {};
                const getDownloadUrl = spec.getDownloadUrl;
                if (typeof getDownloadUrl !== "function") return null;
                const invokeDownload = spec.invokeDownload || CommonUtils.localDownloaderEvent.bind(CommonUtils);
                return createHoverButton(Object.assign({}, spec, {
                    onClick: async target => {
                        if (!target) return;
                        try {
                            const url = await Promise.resolve(getDownloadUrl(target));
                            if (url && !String(url).includes("undefined")) invokeDownload(url);
                        } catch (e) {}
                    }
                }));
            }
        };
    })();

    // ====================== PLATFORM DOWNLOADERS ======================
    const YouTubeDownloader = {
        downloadVideo() { CommonUtils.localDownloaderEvent(window.location.href); },
        genrate() {
            return new Promise(resolve => {
                const id = "localdl-yt-btn", box = document.createElement("div");
                box.className = "ytp-button"; box.id = id;
                box.style.cssText = "position:relative;display:inline-block;width:48px;height:100%;";
                const inner = document.createElement("div");
                inner.style.cssText = "position:absolute;width:100%;height:100%;";
                const btn = document.createElement("button");
                btn.style.cssText = "background-color:transparent;width:100%;height:100%;outline:none;flex:1 1 0%;display:flex;align-items:center;justify-content:center;border:none;padding:0;cursor:pointer;";
                box.appendChild(inner); inner.appendChild(btn);
                btn.appendChild(CommonUtils.genrateDownloadSvg("#FFF"));
                box.addEventListener("click", () => this.downloadVideo());
                const insert = () => {
                    const player = document.querySelector("#player-container-outer .html5-video-player");
                    if (player) {
                        const rc = player.querySelector(".ytp-right-controls");
                        if (rc) rc.prepend(box);
                    }
                };
                const intv = setInterval(() => {
                    if (!document.querySelector("#" + id)) insert();
                    else { resolve(); clearInterval(intv); }
                }, 777);
            });
        },
        genrateShorts() {
            const hud = DownloadHud.mountVideoHoverDownload({
                buttonSize: 48, iconSize: 25, buttonEdgeOffset: 15,
                getDownloadUrl: () => window.location.href
            });
            setInterval(() => {
                if (window.location.href.indexOf("/shorts/") !== -1) hud.enable();
                else hud.disable();
            }, 800);
        },
        run() { this.genrate(); this.genrateShorts(); },
        start() { if (/youtube\.com/.test(window.location.host)) this.run(); }
    };

    const TiktokDownloader = {
        extractLastDashNumber(str) { if (!str) return null; const m = str.match(/-(\d+)$/); return m ? m[1] : null; },
        getPlayUrl(target) {
            const container = CommonUtils.findParentByClassContains(target, "xgplayer-container", 5);
            if (container && container.getAttribute("id")) {
                const playId = this.extractLastDashNumber(container.getAttribute("id"));
                if (playId) return "https://www.tiktok.com/@_/video/" + playId;
            }
            return window.location.href.split("?")[0];
        },
        run() {
            const hud = DownloadHud.mountVideoHoverDownload({ getDownloadUrl: target => this.getPlayUrl(target) });
            const updatePos = () => {
                const p = window.location.pathname;
                if (/^\/@[^/]+$/.test(p)) hud.setButtonPosition("bottom-center");
                else if (/\/@[^/]+\/video\/.+$/.test(p)) hud.setButtonPosition(document.querySelector("[aria-label='Close']") ? "right-three-quarter" : "top-center");
                else hud.setButtonPosition("top-center");
            };
            CommonUtils.onLocationChange(updatePos);
            updatePos();
        },
        start() { if (/tiktok\.com/.test(window.location.host)) this.run(); }
    };

    const ThreadsDownloader = {
        downloadVideo(url) { CommonUtils.localDownloaderEvent(url); },
        run() {
            setInterval(() => {
                document.querySelectorAll("*[data-pressable-container='true']:not([detectvs='true'])").forEach(el => {
                    if (!el.querySelector("video")) return;
                    el.setAttribute("detectvs", "true");
                    const buttons = el.querySelectorAll("*[role='button']");
                    let btns = Array.from(buttons).filter(b => /\d/.test(b.textContent || ""));
                    if (btns.length === 0) btns = Array.from(buttons);
                    if (btns.length <= 1) return;
                    const lastBtn = btns[btns.length - 1];
                    const shareBtn = lastBtn.parentElement;
                    const dlBtn = shareBtn.cloneNode(false);
                    dlBtn.appendChild(CommonUtils.genrateDownloadSvg("#505050", 20, 20));
                    dlBtn.style.cursor = "pointer";
                    shareBtn.insertAdjacentElement("afterend", dlBtn);
                    dlBtn.addEventListener("click", e => {
                        e.stopPropagation(); e.preventDefault();
                        const links = el.querySelectorAll("a[role='link']");
                        let link = "";
                        for (let i = 0; i < links.length; i++) {
                            if (links[i].getAttribute("href").indexOf("/post/") !== -1)
                                link = "https://www.threads.com" + links[i].getAttribute("href");
                        }
                        this.downloadVideo(link || window.location.href);
                    });
                });
            }, 777);
        },
        start() { if (/threads\.com/.test(window.location.host)) this.run(); }
    };

    const TwitterDownloader = {
        svg: '<g class="download"><path d="M11.99 16l-5.7-5.7L7.7 8.88l3.29 3.3V2.59h2v9.59l3.3-3.3 1.41 1.42-5.71 5.7zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/></g>',
        showSensitive: true,
        isTweetdeck: () => window.location.host.includes("tweetdeck"),
        extractStatusId: url => url ? (url.match(/\/status\/(\d+)/) || [null, null])[1] : null,
        downloadVideo(statusIds) { CommonUtils.localDownloaderEvent("https://x.com/_/status/" + statusIds); },
        addButtonTo(article) {
            if (article.dataset.detected) return;
            article.dataset.detected = "true";
            const statusIds = Array.from(article.querySelectorAll('a[href*="/status/"]')).map(el => this.extractStatusId(el.href)).filter(id => id);
            if (statusIds.length === 0) return;
            const sel = ['div[role="progressbar"]','button[data-testid="playButton"]','div[data-testid="videoComponent"]','a[href="/settings/content_you_see"]',"div.media-image-container","div.media-preview-container",'div[aria-labelledby]>div:first-child>div[role="button"][tabindex="0"]'];
            if (article.querySelector(sel.join(","))) {
                const btnGroup = article.querySelector('div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions');
                if (btnGroup) {
                    const btnShare = Array.from(btnGroup.querySelectorAll(":scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a")).pop().parentNode;
                    const btnDl = btnShare.cloneNode(true);
                    btnDl.classList.add("localdl-tw-down"); btnDl.style.marginLeft = "10px"; btnDl.style.cursor = "pointer";
                    btnDl.querySelector("button")?.removeAttribute("disabled");
                    const svgC = this.isTweetdeck() ? btnDl.firstElementChild : btnDl.querySelector("svg");
                    if (svgC) {
                        if (this.isTweetdeck()) { svgC.innerHTML = '<svg viewBox="0 0 20 20" width="15" height="15">' + this.svg + '</svg>'; svgC.removeAttribute("rel"); btnDl.classList.replace("pull-left", "pull-right"); }
                        else svgC.innerHTML = this.svg;
                    }
                    btnGroup.insertBefore(btnDl, btnShare.nextSibling);
                    btnDl.onclick = () => this.downloadVideo(statusIds);
                }
            }
        },
        addButtonToMedia(listitems) {
            listitems.forEach(li => {
                if (li.dataset.detected) return;
                li.dataset.detected = "true";
                const statusId = this.extractStatusId(li.querySelector('a[href*="/status/"]')?.href);
                if (!statusId) return;
                const btn = document.createElement("div");
                btn.classList.add("localdl-tw-down", "localdl-tw-media");
                btn.style.cursor = "pointer";
                btn.innerHTML = '<div><div><svg viewBox="0 0 20 20" width="15" height="15">' + this.svg + '</svg></div></div>';
                li.style.position = li.style.position || "relative";
                li.appendChild(btn);
                btn.onclick = () => this.downloadVideo(statusId);
            });
        },
        detect(node) {
            const article = node.tagName === "ARTICLE" ? node : (node.tagName === "DIV" && (node.querySelector("article") || node.closest("article")));
            if (article) this.addButtonTo(article);
            const listitems = node.tagName === "LI" && node.getAttribute("role") === "listitem" ? [node] : (node.tagName === "DIV" && node.querySelectorAll('li[role="listitem"]'));
            if (listitems) this.addButtonToMedia(listitems);
        },
        injectStyles() {
            if (document.getElementById("localdl-tw-style")) return;
            const s = document.createElement("style");
            s.id = "localdl-tw-style";
            s.textContent = `.localdl-tw-down{margin-left:12px;order:99}.localdl-tw-down:hover>div>div>div>div{color:rgba(29,161,242,1)}.localdl-tw-down:hover>div>div>div>div>div{background-color:rgba(29,161,242,0.1)}.localdl-tw-down:active>div>div>div>div>div{background-color:rgba(29,161,242,0.2)}.localdl-tw-down:hover svg{color:rgba(29,161,242,1)}.localdl-tw-down:hover div:first-child:not(:last-child){background-color:rgba(29,161,242,0.1)}.localdl-tw-down:active div:first-child:not(:last-child){background-color:rgba(29,161,242,0.2)}.localdl-tw-down.localdl-tw-media{position:absolute;right:0}.localdl-tw-down.localdl-tw-media>div{display:flex;border-radius:99px;margin:2px}.localdl-tw-down.localdl-tw-media>div>div{display:flex;margin:6px;color:#fff}.localdl-tw-down.localdl-tw-media:hover>div{background-color:rgba(255,255,255,0.6)}.localdl-tw-down.localdl-tw-media:hover>div>div{color:rgba(29,161,242,1)}.localdl-tw-down.localdl-tw-media:not(:hover)>div>div{filter:drop-shadow(0 0 1px #000)}`;
            document.head.appendChild(s);
        },
        run() {
            this.injectStyles();
            new MutationObserver(mutations => mutations.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) this.detect(n); })))
                .observe(document.body, { childList: true, subtree: true });
        },
        start() { if (/(twitter|x)\.com/.test(window.location.host)) this.run(); }
    };

    const InstagramDownloader = {
        getPlayUrl(target) {
            const clean = url => String(url).split("?")[0];
            const article = target?.closest?.("article");
            if (article) {
                const href = article.querySelector(['a[href*="/p/"]','a[href*="/reels/"]','a[href*="/reel/"]'].join(", "))?.getAttribute("href");
                if (href) return clean(window.location.origin + href);
            }
            return clean(window.location.href);
        },
        run() { DownloadHud.mountVideoHoverDownload({ getDownloadUrl: target => this.getPlayUrl(target) }); },
        start() { if (/instagram\.com/.test(window.location.host)) this.run(); }
    };

    const DouyinDownloader = {
        downloadVideo() { CommonUtils.localDownloaderEvent(window.location.href); },
        genrate() {
            document.querySelectorAll(".xg-inner-controls:not([downloaderx='true'])").forEach(ctrl => {
                ctrl.setAttribute("downloaderx", "true");
                const rg = ctrl.querySelector(".xg-right-grid");
                if (rg) {
                    const fs = rg.querySelector(".xgplayer-fullscreen");
                    if (fs) {
                        const dl = fs.cloneNode(false);
                        dl.style.cssText = "display:flex;align-items:center;justify-content:center;margin:0 7px;";
                        dl.appendChild(CommonUtils.genrateDownloadSvg("#FFF", 20, 20));
                        rg.before(dl);
                        dl.addEventListener("click", () => this.downloadVideo());
                    }
                }
            });
        },
        start() { if (/douyin\.com/.test(window.location.host)) setInterval(() => this.genrate(), 777); }
    };

    const XiaoHongShuDownloader = {
        downloadVideo() { CommonUtils.localDownloaderEvent(window.location.href); },
        genrate() {
            if (!/www\.xiaohongshu\.com\/explore\//.test(window.location.href)) return;
            const nc = document.querySelector("#noteContainer");
            if (!nc || nc.querySelector("*[x-add='true']")) return;
            const mc = nc.querySelector(".media-container");
            if (!mc) return;
            const rid = Math.floor(1e5 + Math.random() * 9e5);
            GM_addStyle('.sc-dl-' + rid + '{cursor:pointer;display:flex;justify-content:center;align-items:center;width:40px;height:40px;z-index:99999;position:absolute;right:55px;top:10px;border-radius:50%}.sc-dl-' + rid + '::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:2px;background:linear-gradient(90deg,red,orange,yellow,green,cyan,blue,violet,red);background-size:200% 200%;opacity:0;transition:opacity .25s;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}.sc-dl-' + rid + ':hover::before{opacity:1;animation:localdl-rb2 3s linear infinite}@keyframes localdl-rb2{0%{background-position:0% 50%}100%{background-position:200% 50%}}');
            const el = document.createElement("div");
            el.setAttribute("x-add", "true"); el.classList.add("sc-dl-" + rid);
            el.appendChild(CommonUtils.genrateDownloadSvg("#FFF"));
            el.addEventListener("click", () => this.downloadVideo());
            mc.appendChild(el);
        },
        start() { if (/xiaohongshu\.com/.test(window.location.host)) setInterval(() => this.genrate(), 777); }
    };

    const FacebookDownloader = {
        getPlayUrl(target) {
            const clean = url => String(url).split("&")[0];
            const extractId = url => String(url).match(/(?:v=|\/videos\/|\/reel\/|\/reels\/)(\d+)/)?.[1];
            const id = extractId(window.location.href);
            return id ? "https://www.facebook.com/reel/" + id : clean(window.location.href);
        },
        run() {
            const hud = DownloadHud.mountVideoHoverDownload({ buttonEdgeOffset: 10, getDownloadUrl: target => this.getPlayUrl(target) });
            setInterval(() => {
                if (/\.facebook\.com\/(reel|reels|videos)\/.*?/.test(window.location.href)) hud.enable();
                else hud.disable();
            }, 700);
        },
        start() { if (/facebook\.com/.test(window.location.host)) this.run(); }
    };

    const PinterestDownloader = {
        getPlayUrl(target) {
            const a = target.closest('a[href*="/pin/"]');
            return a ? a.href : window.location.href;
        },
        run() { DownloadHud.mountVideoHoverDownload({ getDownloadUrl: target => this.getPlayUrl(target) }); },
        start() { if (/pinterest\.com/.test(window.location.host)) this.run(); }
    };

    const SnapchatDownloader = {
        getPlayUrl: async target => window.location.href,
        run() {
            const hud = DownloadHud.mountVideoHoverDownload({ getDownloadUrl: target => this.getPlayUrl(target) });
            const patterns = [
                /^https:\/\/www\.snapchat\.com\/@[^/]+\/[^/?]+(?:\?.*)?$/i,
                /^https:\/\/www\.snapchat\.com\/(?:@[^/]+\/)?spotlight\/[^/?]+(?:\?.*)?$/i,
                /^https:\/\/www\.snapchat\.com\/spotlight\/[^/]+(?:\?.*)?$/i,
                /^https:\/\/www\.snapchat\.com\/p\/[^/]+\/[^/?]+(?:\?.*)?$/i
            ];
            const check = () => patterns.some(r => r.test(window.location.href));
            const update = () => check() ? hud.enable() : hud.disable();
            CommonUtils.onLocationChange(update);
            update();
        },
        start() { if (/snapchat\.com/.test(window.location.host)) this.run(); }
    };

    const TedDownloader = {
        createDownloadButtonClass() { return "sc-dl-" + Math.floor(1e5 + Math.random() * 9e5); },
        injectStyle(cls) {
            GM_addStyle('.' + cls + '{cursor:pointer;display:flex;justify-content:center;align-items:center;width:40px;height:40px;z-index:999999;position:relative;border-radius:50%}.' + cls + '::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:2px;background:linear-gradient(90deg,red,orange,yellow,green,cyan,blue,violet,red);background-size:200% 200%;opacity:0;transition:opacity .25s;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}.' + cls + ':hover::before{opacity:1;animation:localdl-rb3 3s linear infinite}@keyframes localdl-rb3{0%{background-position:0% 50%}100%{background-position:200% 50%}}');
        },
        createDownloadButton(cls) {
            const el = document.createElement("div");
            el.setAttribute("x-add", "true"); el.classList.add(cls);
            el.appendChild(CommonUtils.genrateDownloadSvg("#000"));
            el.addEventListener("click", () => CommonUtils.localDownloaderEvent(window.location.href));
            return el;
        },
        isTalkPage() { return /www\.ted\.com\/talks\//.test(window.location.href); },
        injectDownloader(cls) {
            if (!this.isTalkPage() || document.querySelector("." + cls)) return;
            const tr = document.querySelector("#transcript-control");
            const ac = tr?.parentNode?.querySelector(".items-center");
            if (ac) ac.appendChild(this.createDownloadButton(cls));
        },
        setupObserver(cls) {
            let rafId = null;
            const schedule = () => {
                if (rafId !== null) return;
                rafId = requestAnimationFrame(() => { rafId = null; this.injectDownloader(cls); });
            };
            new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
            CommonUtils.onLocationChange(schedule);
            schedule();
        },
        generateHtml() {
            const cls = this.createDownloadButtonClass();
            this.injectStyle(cls); this.setupObserver(cls);
        },
        start() { if (/ted\.com/.test(window.location.host)) this.generateHtml(); }
    };

    // Bilibili downloader (extra, not in original)
    const BilibiliDownloader = {
        downloadVideo() { CommonUtils.localDownloaderEvent(window.location.href); },
        genrate() {
            const ctrls = document.querySelectorAll(".bpx-player-ctrl-btn:not([localdl='true'])");
            ctrls.forEach(ctrl => {
                ctrl.setAttribute("localdl", "true");
                const fs = document.querySelector(".bpx-player-ctrl-full");
                if (fs) {
                    const dl = fs.cloneNode(false);
                    dl.classList.add("bpx-player-ctrl-btn");
                    dl.title = "Download";
                    dl.innerHTML = '';
                    dl.appendChild(CommonUtils.genrateDownloadSvg("#fff", 20, 20));
                    dl.style.cssText = "display:flex;align-items:center;justify-content:center;";
                    fs.before(dl);
                    dl.addEventListener("click", () => this.downloadVideo());
                }
            });
        },
        start() { if (/bilibili\.com/.test(window.location.host)) setInterval(() => this.genrate(), 777); }
    };

    // ====================== START ALL ======================
    [
        YouTubeDownloader, TiktokDownloader, ThreadsDownloader, TwitterDownloader,
        InstagramDownloader, DouyinDownloader, XiaoHongShuDownloader,
        TedDownloader, FacebookDownloader, PinterestDownloader, SnapchatDownloader,
        BilibiliDownloader
    ].forEach(m => m.start());

    console.log("[LocalDL] Video downloader ready. API:", API_BASE);
})();
