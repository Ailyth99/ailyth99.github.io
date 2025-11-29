const state = {
    fontFamily: 'sans-serif',
    isTransparent: true,
    zoom: 1.0,
    canvas: null,
    ctx: null
};

document.addEventListener('DOMContentLoaded', () => {
    state.canvas = document.getElementById('previewCanvas');
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
    
    bindEvents();
    checkSystemFontSupport();
    render();
});

function bindEvents() {
    document.getElementById('fontInput').addEventListener('change', handleFontUpload);
    const btnSys = document.getElementById('btnLoadSystemFonts');
    if(btnSys) btnSys.addEventListener('click', loadSystemFonts);
    const selSys = document.getElementById('systemFontSelect');
    if(selSys) selSys.addEventListener('change', (e) => {
        state.fontFamily = e.target.value;
        updateFontStatus(e.target.value, 'System');
        render();
    });

    bindSyncedInputs('cellW', 'slider_cellW', 'val_cellW');
    bindSyncedInputs('cellH', 'slider_cellH', 'val_cellH');
    bindSyncedInputs('fontSize', 'slider_fontSize', 'val_fontSize');
    bindSyncedInputs('offsetX', 'slider_offsetX', null);
    bindSyncedInputs('offsetY', 'slider_offsetY', null);

    document.getElementById('btnToggleBg').addEventListener('click', (e) => {
        state.isTransparent = !state.isTransparent;
        const btn = e.target;
        if (state.isTransparent) {
            btn.innerText = "背景: 透明";
            btn.style.background = "var(--bg-input)";
            btn.style.color = "var(--text-muted)";
        } else {
            btn.innerText = "背景: 黑色";
            btn.style.background = "#000";
            btn.style.color = "#fff";
        }
        render();
    });

    const container = document.getElementById('canvasContainer');
    const zoomRange = document.getElementById('zoomRange');
    const zoomValue = document.getElementById('zoomValue');
    
    container.addEventListener('wheel', (e) => {
        if(e.ctrlKey || true) { 
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            let newZoom = parseFloat(zoomRange.value) + delta;
            newZoom = Math.max(0.1, Math.min(4.0, newZoom));
            
            zoomRange.value = newZoom.toFixed(1);
            state.zoom = newZoom;
            zoomValue.innerText = Math.round(state.zoom * 100) + "%";
            updateZoom();
        }
    }, { passive: false });

    zoomRange.addEventListener('input', (e) => {
        state.zoom = parseFloat(e.target.value);
        zoomValue.innerText = Math.round(state.zoom * 100) + "%";
        updateZoom();
    });

    document.getElementById('btnDownload').addEventListener('click', downloadPNG);
    document.getElementById('btnFitHeight').addEventListener('click', fitHeight);

    const inputs = ['charList', 'canvasW', 'canvasH', 'textColor', 'showGrid', 'disableAA'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => render());
            el.addEventListener('change', () => render());
        }
    });
}

function bindSyncedInputs(numId, rangeId, displayId) {
    const numEl = document.getElementById(numId);
    const rangeEl = document.getElementById(rangeId);
    const displayEl = displayId ? document.getElementById(displayId) : null;

    if (!numEl || !rangeEl) return;

    // Range 改变 -> 更新 Number, Display, Render
    rangeEl.addEventListener('input', () => {
        numEl.value = rangeEl.value;
        if(displayEl) displayEl.innerText = rangeEl.value;
        render();
    });

    // Number 改变 -> 更新 Range, Display, Render
    numEl.addEventListener('input', () => {
        rangeEl.value = numEl.value;
        if(displayEl) displayEl.innerText = numEl.value;
        render();
    });
}

function checkSystemFontSupport() {
    if ('queryLocalFonts' in window) {
        document.getElementById('systemFontArea').style.display = 'block';
    }
}

async function loadSystemFonts() {
    const btn = document.getElementById('btnLoadSystemFonts');
    const select = document.getElementById('systemFontSelect');
    btn.innerText = "获取中...";
    try {
        const availableFonts = await window.queryLocalFonts();
        btn.style.display = 'none';
        select.style.display = 'block';
        
        const fontFamilies = new Set();
        availableFonts.forEach(font => fontFamilies.add(font.family));
        const sorted = Array.from(fontFamilies).sort();
        
        select.innerHTML = '<option value="" disabled selected>▼ 选择字体</option>';
        sorted.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.text = f;
            select.appendChild(opt);
        });
    } catch (err) {
        btn.innerText = "无法读取";
        setTimeout(() => btn.innerText = "🖥️读取系统字体", 2000);
    }
}

async function handleFontUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    updateFontStatus("加载中...", "Loading");
    try {
        const buffer = await file.arrayBuffer();
        const fontName = 'UserFont_' + Date.now();
        const fontFace = new FontFace(fontName, buffer);
        await fontFace.load();
        document.fonts.add(fontFace);
        state.fontFamily = fontName;
        
        const sysSel = document.getElementById('systemFontSelect');
        if(sysSel) sysSel.value = "";
        
        updateFontStatus(file.name, 'File');
        render();
    } catch (err) {
        updateFontStatus("无效文件", "Error");
    }
}

function updateFontStatus(name, type) {
    const el = document.getElementById('fontStatus');
    if (!el) return;
    if (type === 'Error') { el.innerText = `错误: ${name}`; el.style.color = '#f48771'; }
    else if (type === 'File') { el.innerText = `文件: ${name}`; el.style.color = '#ff3366'; }
    else if (type === 'System') { el.innerText = `系统: ${name}`; el.style.color = '#4fc1ff'; }
    else { el.innerText = name; el.style.color = '#ccc'; }
}

function fitHeight() {
    const chars = document.getElementById('charList').value.replace(/[\r\n]/g, '');
    const cW = parseInt(document.getElementById('canvasW').value);
    const cellW = parseInt(document.getElementById('cellW').value);
    const cellH = parseInt(document.getElementById('cellH').value);
    const cols = Math.floor(cW / cellW);
    const rows = Math.ceil(chars.length / cols);
    document.getElementById('canvasH').value = Math.max(rows * cellH, cellH);
    render();
}

function render(exportMode = false) {
    const { canvas, ctx } = state;
    if (!canvas || !ctx) return;
    
    const chars = document.getElementById('charList').value.replace(/[\r\n]/g, '');
    const cW = parseInt(document.getElementById('canvasW').value) || 512;
    let cH = parseInt(document.getElementById('canvasH').value) || 512;
    const cellW = parseInt(document.getElementById('cellW').value) || 32;
    const cellH = parseInt(document.getElementById('cellH').value) || 32;
    const fSize = parseInt(document.getElementById('fontSize').value) || 24;
    const offX = parseInt(document.getElementById('offsetX').value) || 0;
    const offY = parseInt(document.getElementById('offsetY').value) || 0;
    const color = document.getElementById('textColor').value;
    const showGrid = document.getElementById('showGrid').checked;
    const disableAA = document.getElementById('disableAA').checked;

    const cols = Math.floor(cW / cellW);
    if (cols <= 0) return;
    
    const rowsNeeded = Math.ceil(chars.length / cols);
    const finalHeight = Math.max(cH, rowsNeeded * cellH);

    canvas.width = cW;
    canvas.height = finalHeight;
    updateZoom();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!state.isTransparent) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.font = `${fSize}px "${state.fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellW + (cellW / 2) + offX;
        const y = row * cellH + (cellH / 2) + offY;
        ctx.fillText(char, x, y);
    }

    if (disableAA) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const threshold = 128;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 0) {
                data[i + 3] = data[i + 3] >= threshold ? 255 : 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    if (!exportMode && showGrid) {
        ctx.strokeStyle = 'rgba(255, 51, 102, 0.4)'; // Makai Pink
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // 计算行数和列数（基于画布总大小）
        const totalCols = Math.floor(canvas.width / cellW);
        const totalRows = Math.floor(canvas.height / cellH);

        for (let r = 0; r < totalRows; r++) {
            for (let c = 0; c < totalCols; c++) {
                ctx.rect(c * cellW, r * cellH, cellW, cellH);
            }
        }
        ctx.stroke();
    }
}

function updateZoom() {
    const { canvas, zoom } = state;
    if (!canvas) return;
    canvas.style.width = (canvas.width * zoom) + 'px';
    canvas.style.height = (canvas.height * zoom) + 'px';
}

function downloadPNG() {
    render(true);
    const link = document.createElement('a');
    link.download = 'pixel_font.png';
    link.href = state.canvas.toDataURL('image/png');
    link.click();
    render(false);
}