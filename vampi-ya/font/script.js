const state = {
    fontFamily: 'sans-serif', // 当前字体
    isTransparent: true,      // 背景透明状态
    zoom: 1.0,                // 缩放倍率
    canvas: null,
    ctx: null
};

document.addEventListener('DOMContentLoaded', () => {
    state.canvas = document.getElementById('previewCanvas');
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
    
    bindEvents();
    checkSystemFontSupport();
    updateCharCount(); // 初始化显示字数
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
            newZoom = Math.max(0.1, Math.min(4.0, newZoom)); // 限制范围 10% - 400%
            
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

    const charListEl = document.getElementById('charList');
    if (charListEl) {
        charListEl.addEventListener('input', () => {
            updateCharCount();
            render();
        });
    }

 
    const inputs = ['canvasW', 'canvasH', 'textColor', 'showGrid', 'disableAA', 'mode4Color'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => render());
            el.addEventListener('change', () => render());
        }
    });
}

function updateCharCount() {
    const val = document.getElementById('charList').value.replace(/[\r\n]/g, '');
    const display = document.getElementById('charCountDisplay');
    if (display) {
        display.innerText = `当前字数: ${val.length}`;
    }
}

function bindSyncedInputs(numId, rangeId, displayId) {
    const numEl = document.getElementById(numId);
    const rangeEl = document.getElementById(rangeId);
    const displayEl = displayId ? document.getElementById(displayId) : null;

    if (!numEl || !rangeEl) return;

    rangeEl.addEventListener('input', () => {
        numEl.value = rangeEl.value;
        if(displayEl) displayEl.innerText = rangeEl.value;
        render();
    });

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
    
    if (!('queryLocalFonts' in window)) {
        alert('浏览器不支持本地字体访问');
        return;
    }

    btn.innerText = "请在弹窗中允许...";
    btn.disabled = true;

    try {
        const availableFonts = await window.queryLocalFonts();
        
        const fontFamilies = new Set();
        for (const font of availableFonts) {
            fontFamilies.add(font.family);
        }
        const sorted = Array.from(fontFamilies).sort((a, b) => a.localeCompare(b));
        
        select.innerHTML = '<option value="" disabled selected>▼ 选择字体</option>';
        sorted.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            // 尝试设置选项字体样式以便预览
            try { opt.style.fontFamily = `"${f}"`; } catch(e) {}
            select.appendChild(opt);
        });

        btn.style.display = 'none';
        select.style.display = 'block';

    } catch (err) {
        console.error(err);
        if (err.name === 'SecurityError' || err.name === 'NotAllowedError') {
            alert('权限被拒绝，无法获取字体列表。');
        } else {
            alert('加载出错: ' + err.message);
        }
        btn.innerText = "重试加载系统字体";
        btn.disabled = false;
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
        console.error(err);
        updateFontStatus("无效的字体文件", "Error");
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
    const newH = Math.max(rows * cellH, cellH);
    
    document.getElementById('canvasH').value = newH;
    render();
}

function render(exportMode = false) {
    const { canvas, ctx } = state;
    if (!canvas || !ctx) return;
    
    const chars = document.getElementById('charList').value.replace(/[\r\n]/g, '');
    const cW = parseInt(document.getElementById('canvasW').value) || 512;
    const cH = parseInt(document.getElementById('canvasH').value) || 512;
    const cellW = parseInt(document.getElementById('cellW').value) || 32;
    const cellH = parseInt(document.getElementById('cellH').value) || 32;
    const fSize = parseInt(document.getElementById('fontSize').value) || 24;
    const offX = parseInt(document.getElementById('offsetX').value) || 0;
    const offY = parseInt(document.getElementById('offsetY').value) || 0;
    const color = document.getElementById('textColor').value;
    
    const showGrid = document.getElementById('showGrid').checked;
    const disableAA = document.getElementById('disableAA').checked; // 1-bit
    const mode4Color = document.getElementById('mode4Color').checked; // 2-bit

    canvas.width = cW;
    canvas.height = cH;
    updateZoom();

    const cols = Math.floor(cW / cellW);
    const rows = Math.floor(cH / cellH);
    const maxChars = cols * rows; // 最大可容纳字数

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
        if (i >= maxChars) break;

        const char = chars[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const x = col * cellW + (cellW / 2) + offX;
        const y = row * cellH + (cellH / 2) + offY;
        
        ctx.fillText(char, x, y);
    }

    // 6. 像素后处理 (抗锯齿控制 / 4色量化)
    if (disableAA || mode4Color) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 辅助：4色量化函数 (0, 85, 170, 255)
        const quantize4 = (val) => {
            return Math.round(val / 255 * 3) / 3 * 255;
        };

        const threshold = 128; // 二值化阈值

        for (let i = 0; i < data.length; i += 4) {
            // data[i]=R, data[i+1]=G, data[i+2]=B, data[i+3]=Alpha

            if (disableAA) {
                if (state.isTransparent) {
                    // 透明背景：Alpha 二值化
                    data[i + 3] = data[i + 3] >= threshold ? 255 : 0;
                } else {
                    // 黑背景：亮度二值化 (取R通道近似)
                    // 假设是灰度文字
                    const val = data[i] >= threshold ? 255 : 0;
                    data[i] = data[i+1] = data[i+2] = val;
                }
            } 
            else if (mode4Color) {
                // --- 2-bit (4色) 模式 ---
                if (state.isTransparent) {
                    // 透明背景：量化 Alpha 通道
                    data[i + 3] = quantize4(data[i + 3]);
                } else {
                    data[i] = quantize4(data[i]);
                    data[i+1] = quantize4(data[i+1]);
                    data[i+2] = quantize4(data[i+2]);
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    if (!exportMode && showGrid) {
        ctx.strokeStyle = 'rgba(255, 51, 102, 0.4)'; 
        ctx.lineWidth = 1;
        ctx.beginPath();
        
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

// 导出 PNG
function downloadPNG() {
    render(true); // 渲染导出模式无网格)
    const link = document.createElement('a');
    link.download = 'font_img.png';
    link.href = state.canvas.toDataURL('image/png');
    link.click();
    render(false); 
}