/**
 * PS2 ReTX - Core Interface Script
 * Version: 3.0 (Ultimate Full Edition)
 * Author: Sena (Logic-Strict & Non-Lazy Mode)
 */

const I18N = {
    "en": {
        "version": "v3.0 / Multi-Core",
        "sec_file": "Source File",
        "btn_load": "📂 Load File",
        "no_file": "No file loaded",
        "sec_dim_off": "Dimensions & Offsets",
        "lbl_w": "W", "lbl_h": "H",
        "lbl_pixel": "Pixel Offset", "lbl_clut": "CLUT Offset",
        "sec_swizzle": "Format & Swizzle",
        "lbl_swp": "Pixel Swizzle", "lbl_swc": "CLUT Swizzle",
        "sec_color": "CLUT Format & Alpha",
        "lbl_swap": "Nibble Swap",
        "btn_save": "💾 Save PNG",
        "btn_flip_v": "Flip Vert",
        "btn_flip_h": "Flip Horz",
        "btn_inject_reuse": "💉 Inject (Reuse CLUT)",
        "btn_inject_new": "✨ Inject (New CLUT)",
        "no_img": "No Image",
        "lbl_zoom": "Zoom",
        "btn_fit": "Fit",
        "bg_dark": "BG: Dark", "bg_light": "BG: Light",
        "status_ready": "Ready. Load a file.",
        "status_render_fail": "❌ Out of bounds"
    },
    "zh": {
        "version": "v3.0 / aikika",
        "sec_file": "来源文件",
        "btn_load": "📂 加载文件 (BIN/RAW)",
        "no_file": "未加载文件",
        "sec_dim_off": "尺寸与数据起始偏移量",
        "lbl_w": "宽", "lbl_h": "高",
        "lbl_pixel": "像素偏移 (10/16进制)", "lbl_clut": "CLUT偏移 (10/16进制)",
        "sec_swizzle": "格式与重排模式",
        "lbl_swp": "像素重排", "lbl_swc": "CLUT重排",
        "sec_color": "CLUT颜色格式和ALPHA值调整",
        "lbl_swap": "高低位交换",
        "btn_save": "💾 保存图片",
        "btn_flip_v": "上下翻转",
        "btn_flip_h": "左右翻转",
        "btn_inject_reuse": "💉 注入(复用CLUT)",
        "btn_inject_new": "✨ 注入(生成新CLUT)",
        "no_img": "无预览",
        "lbl_zoom": "缩放",
        "btn_fit": "适应",
        "bg_dark": "背景: 深色", "bg_light": "背景: 浅色",
        "status_ready": "就绪。请加载文件。",
        "status_render_fail": "❌ 超出数据范围"
    }
};

const state = {
    fileData: null,
    fileName: "",
    wasmLoaded: false,
    zoom: 1.0,
    isDarkBg: true,
    flipV: false, 
    flipH: false, 
    debounceTimer: null,
    injectMode: 'reuse', 
    lang: navigator.language.startsWith('zh') ? 'zh' : 'en',
    tempBlob: null,
    tempName: ""
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
    const wasmUrl = "main.wasm"; 
    
    const mask = document.getElementById('loadingMask');
    const pBar = document.getElementById('progressBar');
    const pText = document.getElementById('progressText');
    const statusText = document.querySelector('.loading-text');

    try {
        log(`Loading local core: ${wasmUrl}`);
        const response = await fetch(wasmUrl);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

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
                statusText.innerText = `Loading... ${(receivedLength/1024/1024).toFixed(2)}MB`;
            }
        }

        const chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for(let chunk of chunks) {
            chunksAll.set(chunk, position);
            position += chunk.length;
        }

        const result = await WebAssembly.instantiate(chunksAll, go.importObject);
        go.run(result.instance);
        
        state.wasmLoaded = true;
        log("Wasm Core Loaded Successfully.");
        pBar.style.width = '100%';
        setTimeout(() => {
            mask.classList.add('hidden');
            setTimeout(() => { mask.style.display = 'none'; }, 500);
        }, 500);

    } catch (err) {
        console.error(err);
        statusText.innerText = "Load Failed!";
        log("Wasm Load Failed: " + err);
    }
}

async function saveFileHelper(blob, suggestedName, description, acceptConfig) {
    try {
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{ description: description, accept: acceptConfig }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            const link = document.createElement('a');
            link.download = suggestedName;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
            return true;
        }
    }
    return false;
}

function showResultModal(blob, fileName, msg) {
    state.tempBlob = blob;
    state.tempName = fileName;
    document.getElementById('modalMsg').innerText = msg;
    document.getElementById('modalFileName').innerText = fileName;
    document.getElementById('resultModal').classList.remove('hidden');
}

function getPngDimensions(data) {
    if (data.length < 24) return null;
    if (data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4E || data[3] !== 0x47) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function bindEvents() {
    document.getElementById('fileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        state.fileName = file.name;
        document.getElementById('fileBtnText').innerText = file.name;
        document.getElementById('fileStatus').innerText = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        const buffer = await file.arrayBuffer();
        state.fileData = new Uint8Array(buffer);
        log(`Loaded ${file.name}`);
        requestRender();
    });

    document.getElementById('bpp').addEventListener('change', () => {
        updateSwizzleUI();
        requestRender();
    });

    document.querySelectorAll('input, select').forEach(el => {
        const skipIds = ['fileInput', 'injectFileInput', 'bpp', 'bgColorPicker', 'zoomRange'];
        if (!skipIds.includes(el.id)) {
            el.addEventListener('input', () => debounceRender(el.type === 'text' ? 500 : 100));
        }
    });

    document.getElementById('btnToggleBg').addEventListener('click', () => {
        state.isDarkBg = !state.isDarkBg;
        document.getElementById('canvasContainer').className = `canvas-container ${state.isDarkBg ? 'dark-grid' : 'light-grid'}`;
        updateBgBtn();
    });

    document.getElementById('bgColorPicker').addEventListener('input', (e) => {
        const container = document.getElementById('canvasContainer');
        container.className = 'canvas-container';
        container.style.backgroundColor = e.target.value;
    });

    document.getElementById('btnFlipV').addEventListener('click', (e) => {
        state.flipV = !state.flipV;
        e.target.classList.toggle('active', state.flipV);
        updateZoomUI(); 
    });

    document.getElementById('btnFlipH').addEventListener('click', (e) => {
        state.flipH = !state.flipH;
        e.target.classList.toggle('active', state.flipH);
        updateZoomUI();
    });

    document.getElementById('zoomRange').addEventListener('input', (e) => {
        state.zoom = parseFloat(e.target.value);
        updateZoomUI();
    });

    document.getElementById('btnFit').addEventListener('click', () => {
        state.zoom = 1.0;
        updateZoomUI();
    });

    document.getElementById('canvasContainer').addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        state.zoom = Math.max(0.1, Math.min(5.0, state.zoom + delta));
        updateZoomUI();
    }, { passive: false });

    document.getElementById('btnDownload').addEventListener('click', async () => {
        const img = document.getElementById('previewImage');
        if (!img.src || img.style.display === 'none') return;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.translate(state.flipH ? canvas.width : 0, state.flipV ? canvas.height : 0);
        ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        let outName = state.fileName ? state.fileName.split('.')[0] + ".png" : "extracted.png";
        
        const success = await saveFileHelper(blob, outName, 'PNG Image', {'image/png': ['.png']});
        if (success) log(`PNG Saved: ${outName}`);
    });

    document.getElementById('btnInjectReuse').addEventListener('click', () => {
        if (!state.wasmLoaded || !state.fileData) return alert("Please load a source file first.");
        state.injectMode = 'reuse';
        document.getElementById('injectFileInput').click();
    });

    document.getElementById('btnInjectNew').addEventListener('click', () => {
        if (!state.wasmLoaded || !state.fileData) return alert("Please load a source file first.");
        state.injectMode = 'new';
        document.getElementById('injectFileInput').click();
    });

    document.getElementById('injectFileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const buffer = await file.arrayBuffer();
        const pngData = new Uint8Array(buffer);
        const pngDims = getPngDimensions(pngData);
        
        if (!pngDims) {
            alert("Invalid PNG file.");
            e.target.value = '';
            return;
        }

        const targetW = parseInt(document.getElementById('width').value) || 256;
        const targetH = parseInt(document.getElementById('height').value) || 256;

        const config = {
            width: targetW, height: targetH,
            bpp: parseInt(document.getElementById('bpp').value),
            pixelOff: parseHex(document.getElementById('pixelOff').value),
            clutOff: parseHex(document.getElementById('clutOff').value),
            swp: document.getElementById('swp').value,
            swc: document.getElementById('swc').value,
            cf: document.getElementById('cf').value,
            alpha: document.getElementById('alpha').value,
            doSwap: document.getElementById('doSwap').checked,
            flipV: state.flipV, flipH: state.flipH,
            genClut: (state.injectMode === 'new'),
            forceInject: false 
        };

        const doInject = (force) => {
            config.forceInject = force;
            log(`Injecting PNG [Force: ${force}]...`);
            const injectedData = TheiaInject(state.fileData, pngData, config);
            
            if (injectedData) {
                const parts = state.fileName.split('.');
                let newName = state.fileName + "_injected.bin";
                if (parts.length > 1) {
                    const ext = parts.pop();
                    newName = parts.join('.') + "_injected." + ext;
                }
                const blob = new Blob([injectedData], {type: "application/octet-stream"});
                showResultModal(blob, newName, `Injection successful!`);
            } else {
                alert("Injection failed. See log.");
            }
            e.target.value = '';
        };

        if (pngDims.width !== targetW || pngDims.height !== targetH) {
            const isZh = state.lang === 'zh';
            const action = (pngDims.width < targetW || pngDims.height < targetH) 
                ? (isZh ? "部分写入 (原图周边数据保留)" : "Partial Write")
                : (isZh ? "截断写入 (忽略多余像素)" : "Truncate Write");
                
            const msg = isZh 
                ? `目标尺寸: <b style="color:#ff3366">${targetW}x${targetH}</b><br>新图尺寸: <b style="color:#00ffcc">${pngDims.width}x${pngDims.height}</b><br><br>尺寸不匹配！是否强制注入？<br>(${action})`
                : `Target: ${targetW}x${targetH}<br>PNG: ${pngDims.width}x${pngDims.height}<br><br>Dimension mismatch! Force?`;
            
            document.getElementById('forceModalMsg').innerHTML = msg;
            document.getElementById('forceModal').classList.remove('hidden');
            
            document.getElementById('btnForceConfirm').onclick = () => {
                document.getElementById('forceModal').classList.add('hidden');
                doInject(true);
            };
            document.getElementById('btnForceCancel').onclick = () => {
                document.getElementById('forceModal').classList.add('hidden');
                e.target.value = '';
            };
        } else {
            doInject(false);
        }
    });

    document.getElementById('btnModalSave').addEventListener('click', async () => {
        if (!state.tempBlob) return;
        const success = await saveFileHelper(state.tempBlob, state.tempName, 'Binary File', { 'application/octet-stream': ['.bin', '.raw', '.img', '.dat'] });
        if (success) {
            document.getElementById('resultModal').classList.add('hidden');
            log(`Saved: ${state.tempName}`);
            state.tempBlob = null;
        }
    });

    document.getElementById('btnModalCancel').addEventListener('click', () => {
        document.getElementById('resultModal').classList.add('hidden');
        state.tempBlob = null;
    });
}

function updateSwizzleUI() {
    const bpp = parseInt(document.getElementById('bpp').value);
    const swpSelect = document.getElementById('swp');
    const isTrueColor = (bpp > 8);
    
    const swpOptions = swpSelect.options;
    let hasValidSwp = false;
    for (let i = 0; i < swpOptions.length; i++) {
        const val = swpOptions[i].value;
        let enable = (bpp === 4) ? (val.startsWith('4') || ['linear','zorder','psp'].includes(val)) : (['std','linear','zorder','psp'].includes(val));
        swpOptions[i].disabled = !enable;
        swpOptions[i].hidden = !enable;
        if (enable && swpOptions[i].selected) hasValidSwp = true;
    }
    if (!hasValidSwp) {
        swpSelect.value = (bpp === 4) ? '4packed' : 'std';
    }

    document.getElementById('swc').disabled = isTrueColor;
    document.getElementById('clutOff').disabled = isTrueColor;
    document.getElementById('cf').disabled = isTrueColor;
    document.getElementById('alpha').disabled = isTrueColor;
    document.getElementById('doSwap').disabled = (bpp !== 4);
    
    const btnNew = document.getElementById('btnInjectNew');
    if(btnNew) {
        btnNew.disabled = isTrueColor;
        btnNew.style.opacity = isTrueColor ? "0.3" : "1.0";
    }
}

function initDragAndDrop() {
    const container = document.getElementById('canvasContainer');
    let isDown = false, startX, startY, scrollLeft, scrollTop;

    container.addEventListener('mousedown', (e) => {
        if (e.target.id === 'previewImage') e.preventDefault();
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
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        container.scrollLeft = scrollLeft - (x - startX) * 1.5;
        container.scrollTop = scrollTop - (y - startY) * 1.5;
    });
}

function updateBgBtn() {
    const btn = document.getElementById('btnToggleBg');
    btn.innerText = state.isDarkBg ? t('bg_dark') : t('bg_light');
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

    const pngData = TheiaRender(state.fileData, config);
    const img = document.getElementById('previewImage');
    const info = document.getElementById('imgInfo');

    if (pngData) {
        const blob = new Blob([pngData], {type: "image/png"});
        if (img.src) URL.revokeObjectURL(img.src);
        img.onload = () => { updateZoomUI(); };
        img.src = URL.createObjectURL(blob);
        img.style.display = 'block';
        info.innerText = `${config.width}x${config.height}`;
        info.style.color = "var(--color-success)";
    } else {
        img.style.display = 'none';
        const errPrefix = t("status_render_fail");
        info.innerText = `${errPrefix} (Offset: Px=${config.pixelOff}, Clut=${config.clutOff})`;
        info.style.color = "#ff3366";
    }
}

function updateZoomUI() {
    document.getElementById('zoomValue').innerText = Math.round(state.zoom * 100) + "%";
    document.getElementById('zoomRange').value = state.zoom;
    const img = document.getElementById('previewImage');
    if (img.naturalWidth) {
        img.style.width = (img.naturalWidth * state.zoom) + 'px';
        img.style.height = 'auto'; 
        img.style.transformOrigin = "center center"; 
        img.style.transform = `scale(${state.flipH ? -1 : 1}, ${state.flipV ? -1 : 1})`;
    }
}

function parseHex(val) {
    if (!val) return 0;
    let s = String(val).trim().toLowerCase().replace(/[^0-9a-fx]/g, '');
    if (!s) return 0;
    if (s.startsWith("0x")) {
        let n = parseInt(s.substring(2), 16);
        return isNaN(n) ? 0 : n;
    }
    let n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
}

function log(msg) {
    const area = document.getElementById('logArea');
    area.value = `[${new Date().toLocaleTimeString()}] ${msg}\n` + area.value;
}