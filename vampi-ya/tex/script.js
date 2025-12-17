const I18N = {
    "en": {
        "version": "v2.2 / aikika",
        "sec_file": "Source File",
        "btn_load": "📂 Load File",
        "no_file": "No file loaded",
        "sec_dims": "Dimensions & Format",
        "lbl_w": "W", "lbl_h": "H",
        "sec_offsets": "Data Start Offsets (Dec/Hex)",
        "lbl_pixel": "Pixel Offset", "lbl_clut": "CLUT Offset",
        "sec_swizzle": "Swizzle Modes",
        "lbl_swp": "Pixel Swizzle", "lbl_swc": "CLUT Swizzle",
        "sec_color": "CLUT Format & Alpha",
        "lbl_swap": "Nibble Swap (Fix Noise)",
        "btn_save": "💾 Save PNG",
        "no_img": "No Image",
        "lbl_zoom": "Zoom",
        "btn_fit": "Fit",
        "bg_dark": "BG: Dark", "bg_light": "BG: Light",
        "status_ready": "Ready. Load a file.",
        "status_render_fail": "Render Failed"
    },
    "zh": {
        "version": "v2.2 / aikika",
        "sec_file": "来源文件",
        "btn_load": "📂 加载文件 (BIN/RAW)",
        "no_file": "未加载文件",
        "sec_dims": "尺寸与格式",
        "lbl_w": "宽", "lbl_h": "高",
        "sec_offsets": "数据起始偏移量 (10进制/16进制)",
        "lbl_pixel": "像素偏移", "lbl_clut": "CLUT偏移",
        "sec_swizzle": "重排模式 (Swizzle)",
        "lbl_swp": "像素重排", "lbl_swc": "CLUT重排",
        "sec_color": "CLUT颜色格式和ALPHA值调整",
        "lbl_swap": "高低位交换 (修复噪点)",
        "btn_save": "💾 保存图片",
        "no_img": "无预览",
        "lbl_zoom": "缩放",
        "btn_fit": "适应",
        "bg_dark": "背景: 深色", "bg_light": "背景: 浅色",
        "status_ready": "就绪。请加载文件。",
        "status_render_fail": "渲染失败 (检查偏移量)"
    }
};

const state = {
    fileData: null,
    wasmLoaded: false,
    zoom: 1.0,
    isDarkBg: true,
    debounceTimer: null,
    lang: navigator.language.startsWith('zh') ? 'zh' : 'en'
};

const t = (key) => I18N[state.lang][key] || key;

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();
    initWasm();
    bindEvents();
    initDragAndDrop();
    updateSwizzleUI(); 
});

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (I18N[state.lang][key]) {
            el.innerText = I18N[state.lang][key];
        }
    });
    updateBgBtn(); 
}


async function initWasm() {
    const go = new Go();
    const wasmUrl = "https://cdn.jsdelivr.net/gh/Ailyth99/ailyth99.github.io@main/vampi-ya/tex/main.wasm";
    
    const mask = document.getElementById('loadingMask');
    const pBar = document.getElementById('progressBar');
    const pText = document.getElementById('progressText');
    const statusText = document.querySelector('.loading-text');

    try {
        log(`Connecting to: ${wasmUrl}...`);
        const response = await fetch(wasmUrl);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const contentLength = response.headers.get('Content-Length');
        const total = parseInt(contentLength, 10);
        const reader = response.body.getReader();
        
        let receivedLength = 0; 
        let chunks = []; 

        while(true) {
            const {done, value} = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;

            if (total) {
                const percent = Math.round((receivedLength / total) * 100);
                pBar.style.width = `${percent}%`;
                pText.innerText = `${percent}%`;
                statusText.innerText = `Downloading Core... ${(receivedLength/1024/1024).toFixed(2)}MB`;
            } else {
                pBar.style.width = '100%';
                pText.innerText = 'Downloading...';
            }
        }

        statusText.innerText = "Assembling Binary...";
        const chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for(let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
        }

        statusText.innerText = "Instantiating Wasm...";
        const result = await WebAssembly.instantiate(chunksAll, go.importObject);
        go.run(result.instance);
        
        state.wasmLoaded = true;
        log("Wasm Core Loaded Successfully.");

        statusText.innerText = "Ready!";
        pBar.style.width = '100%';
        
        setTimeout(() => {
            mask.classList.add('hidden');
            setTimeout(() => { mask.style.display = 'none'; }, 500);
        }, 500);

    } catch (err) {
        console.error(err);
        statusText.innerText = "Load Failed!";
        statusText.style.color = "#ff3366";
        pText.innerText = "Error";
        log("Wasm Load Failed: " + err);
        alert("核心加载失败，请检查网络或刷新页面。\n" + err);
    }
}



function bindEvents() {
    // 文件
    document.getElementById('fileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        document.getElementById('fileBtnText').innerText = file.name;
        document.getElementById('fileStatus').innerText = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        const buffer = await file.arrayBuffer();
        state.fileData = new Uint8Array(buffer);
        log(`Loaded ${file.name}`);
        state.zoom = 1.0;
        updateZoomUI();
        requestRender();
    });

    document.getElementById('bpp').addEventListener('change', () => {
        updateSwizzleUI();
        requestRender();
    });

    document.querySelectorAll('input, select').forEach(el => {
        if (el.id !== 'fileInput' && el.id !== 'bpp') { // bpp 单独处理了
            el.addEventListener('input', () => debounceRender(el.type === 'text' ? 500 : 100));
        }
    });

    // 背景
    document.getElementById('btnToggleBg').addEventListener('click', () => {
        state.isDarkBg = !state.isDarkBg;
        const container = document.getElementById('canvasContainer');
        if (state.isDarkBg) {
            container.classList.remove('light-grid');
            container.classList.add('dark-grid');
        } else {
            container.classList.remove('dark-grid');
            container.classList.add('light-grid');
        }
        updateBgBtn();
    });

    document.getElementById('zoomRange').addEventListener('input', (e) => {
        state.zoom = parseFloat(e.target.value);
        updateZoomUI();
    });
    document.getElementById('canvasContainer').addEventListener('wheel', (e) => {
        if(e.ctrlKey || true) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            let newZoom = state.zoom + delta;
            newZoom = Math.max(0.1, Math.min(5.0, newZoom));
            state.zoom = newZoom;
            updateZoomUI();
        }
    }, { passive: false });
    document.getElementById('btnFit').addEventListener('click', () => {
        state.zoom = 1.0;
        updateZoomUI();
    });
    document.getElementById('btnDownload').addEventListener('click', () => {
        const img = document.getElementById('previewImage');
        if (!img.src || img.style.display === 'none') return;
        const link = document.createElement('a');
        link.download = 'extracted.png';
        link.href = img.src;
        link.click();
    });
}

function updateSwizzleUI() {
    const bpp = parseInt(document.getElementById('bpp').value);
    const swpSelect = document.getElementById('swp');
    const options = swpSelect.options;
    
    // 4bpp 模式: 4packed, 4native, 4as8, linear
    // 8/16/32bpp: std, linear
    
    let hasValidSelection = false;

    for (let i = 0; i < options.length; i++) {
        const val = options[i].value;
        let enable = false;

        if (bpp === 4) {
            if (val.startsWith('4') || val === 'linear') enable = true;
        } else {
            if (val === 'std' || val === 'linear') enable = true;
        }

        options[i].disabled = !enable;
        options[i].hidden = !enable; 
        if (enable && options[i].selected) hasValidSelection = true;
    }

    if (!hasValidSelection) {
        if (bpp === 4) swpSelect.value = '4packed';
        else swpSelect.value = 'std';
    }
}

function initDragAndDrop() {
    const container = document.getElementById('canvasContainer');
    let isDown = false;
    let startX, startY, scrollLeft, scrollTop;

    container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDown = true;
        container.classList.add('grabbing');
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;
    });
    container.addEventListener('mouseleave', () => { isDown = false; container.classList.remove('grabbing'); });
    container.addEventListener('mouseup', () => { isDown = false; container.classList.remove('grabbing'); });
    container.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
    });
}

function updateBgBtn() {
    const btn = document.getElementById('btnToggleBg');
    btn.innerText = state.isDarkBg ? t('bg_dark') : t('bg_light');
    btn.style.background = state.isDarkBg ? "var(--bg-input)" : "#eee";
    btn.style.color = state.isDarkBg ? "var(--text-main)" : "#333";
}

function debounceRender(delay) {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(requestRender, delay);
}

function requestRender() {
    if (!state.wasmLoaded || !state.fileData) return;

    const config = {
        width: parseInt(document.getElementById('width').value) || 256,
        height: parseInt(document.getElementById('height').value) || 256,
        bpp: parseInt(document.getElementById('bpp').value),
        pixelOff: parseHex(document.getElementById('pixelOff').value),
        clutOff: parseHex(document.getElementById('clutOff').value),
        swp: document.getElementById('swp').value,
        swc: document.getElementById('swc').value,
        cf: document.getElementById('cf').value,
        alpha: document.getElementById('alpha').value,
        doSwap: document.getElementById('doSwap').checked
    };

    const startTime = performance.now();
    const pngData = TheiaRender(state.fileData, config);
    const dt = (performance.now() - startTime).toFixed(1);

    const img = document.getElementById('previewImage');
    const info = document.getElementById('imgInfo');

    if (pngData) {
        const blob = new Blob([pngData], {type: "image/png"});
        if (img.src) URL.revokeObjectURL(img.src);
        img.src = URL.createObjectURL(blob);
        img.style.display = 'block';
        
        log(`Render OK: ${dt}ms`);
        info.innerText = `${config.width}x${config.height} | ${pngData.length} B`;
        info.style.color = "var(--color-success)";
    } else {
        img.style.display = 'none';
        info.innerText = t("status_render_fail");
        info.style.color = "#f00";
    }
}

function updateZoomUI() {
    const percent = Math.round(state.zoom * 100);
    document.getElementById('zoomValue').innerText = percent + "%";
    document.getElementById('zoomRange').value = state.zoom;
    const img = document.getElementById('previewImage');
    if (img.naturalWidth) {
        img.style.width = (img.naturalWidth * state.zoom) + 'px';
        img.style.height = 'auto';
    }
}

function parseHex(val) {
    val = (val || "").trim();
    if (!val) return 0;
 
    if (val.toLowerCase().startsWith("0x")) {
        return parseInt(val, 16) || 0;
    }
    return parseInt(val) || 0;
}

function log(msg) {
    const area = document.getElementById('logArea');
    const time = new Date().toLocaleTimeString();
    area.value = `[${time}] ${msg}\n` + area.value;
}