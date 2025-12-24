const state = {
    fontFamily: 'sans-serif',
    zoom: 1.5,
    canvas: null,
    ctx: null,
    refImage: null
};

document.addEventListener('DOMContentLoaded', () => {
    checkMobile();
    state.canvas = document.getElementById('previewCanvas');
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
    
    bindEvents();
    checkSystemFontSupport();
    updateCharCount(); 
    render();
});

function checkMobile() {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth < 768;
    if (isMobile) {
        setTimeout(() => {
            alert("提示：\n\n本工具未对手机进行适配\n请在PC上面使用");
        }, 500);
    }
}

function bindEvents() {
    document.getElementById('refImgInput').addEventListener('change', handleRefImgUpload);
    
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
    
    bindSyncedInputs('textOffsetX', 'slider_textOffsetX', null);
    bindSyncedInputs('textOffsetY', 'slider_textOffsetY', null);
    bindSyncedInputs('gridOffsetX', 'slider_gridOffsetX', null);
    bindSyncedInputs('gridOffsetY', 'slider_gridOffsetY', null);

    const container = document.getElementById('canvasContainer');
    const zoomRange = document.getElementById('zoomRange');
    const zoomValue = document.getElementById('zoomValue');
    const tooltip = document.getElementById('gridTooltip');
    
    if (zoomRange && parseFloat(zoomRange.value) !== state.zoom) {
        zoomRange.value = state.zoom;
        zoomValue.innerText = (state.zoom * 100) + "%";
    }

    container.addEventListener('wheel', (e) => {
        if(e.ctrlKey || true) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            let newZoom = parseFloat(zoomRange.value) + delta;
            newZoom = Math.max(0.1, Math.min(8.0, newZoom));
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

    state.canvas.addEventListener('mousemove', (e) => {
        const cellW = parseInt(document.getElementById('cellW').value) || 20;
        const cellH = parseInt(document.getElementById('cellH').value) || 20;
        const gridOffX = parseInt(document.getElementById('gridOffsetX').value) || 0;
        const gridOffY = parseInt(document.getElementById('gridOffsetY').value) || 0;
        
        const rect = state.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / state.zoom;
        const mouseY = (e.clientY - rect.top) / state.zoom;

        const relX = mouseX - gridOffX;
        const relY = mouseY - gridOffY;

        if (relX >= 0 && relY >= 0) {
            const col = Math.floor(relX / cellW);
            const row = Math.floor(relY / cellH);
            
            const maxCols = Math.floor((state.canvas.width - gridOffX) / cellW);
            const maxRows = Math.floor((state.canvas.height - gridOffY) / cellH);

            if (col < maxCols && row < maxRows) {
                const index = row * maxCols + col + 1;
                const indexStr = index < 10 ? '0' + index : index;
                
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
                tooltip.innerText = '序号: ' + indexStr;
                return;
            }
        }
        tooltip.style.display = 'none';
    });

    state.canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });

    document.getElementById('btnDownload').addEventListener('click', downloadPNG);

    const charListEl = document.getElementById('charList');
    if (charListEl) {
        charListEl.addEventListener('input', () => {
            updateCharCount();
            render();
        });
    }

    const inputs = [
        'canvasW', 'canvasH', 
        'textColor', 'bgColor', 'bgTransparent', 
        'showGrid', 'disableAA', 'mode4Color', 'showRefImg',
        'gridOffsetX', 'gridOffsetY', 'showText',
        'isItalic', 'hasStroke', 'strokeColor', 'strokeWidth'
    ];
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
    const sync = (src, dst) => {
        dst.value = src.value;
        if(displayEl) displayEl.innerText = src.value;
        render();
    };
    rangeEl.addEventListener('input', () => sync(rangeEl, numEl));
    numEl.addEventListener('input', () => sync(numEl, rangeEl));
}

function checkSystemFontSupport() {
    if ('queryLocalFonts' in window) document.getElementById('systemFontArea').style.display = 'block';
}

async function loadSystemFonts() {
    const btn = document.getElementById('btnLoadSystemFonts');
    const select = document.getElementById('systemFontSelect');
    if (!('queryLocalFonts' in window)) { alert('不支持此API'); return; }
    btn.innerText = "请授权..."; btn.disabled = true;
    try {
        const fonts = await window.queryLocalFonts();
        const families = new Set(fonts.map(f => f.family));
        select.innerHTML = '<option value="" disabled selected>▼ 选择字体</option>';
        [...families].sort().forEach(f => {
            const opt = document.createElement('option');
            opt.value = f; opt.textContent = f;
            try { opt.style.fontFamily = `"${f}"`; } catch(e){}
            select.appendChild(opt);
        });
        btn.style.display = 'none'; select.style.display = 'block';
    } catch (err) {
        btn.innerText = "重试"; btn.disabled = false;
        if(err.name !== 'SecurityError' && err.name !== 'NotAllowedError') alert(err.message);
    }
}

function handleRefImgUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            state.refImage = img;
            document.getElementById('canvasW').value = img.width;
            document.getElementById('canvasH').value = img.height;
            const toggle = document.getElementById('showRefImg');
            toggle.disabled = false;
            toggle.checked = true;
            render();
        }
        img.src = evt.target.result;
    }
    reader.readAsDataURL(file);
}

function updateFontStatus(name, type) {
    const el = document.getElementById('fontStatus');
    if(!el) return;
    el.innerText = (type==='Error'?'错误:':(type==='File'?'文件:':(type==='System'?'系统:':''))) + name;
    el.style.color = type==='Error'?'#f48771':(type==='File'?'#ff3366':(type==='System'?'#4fc1ff':'#ccc'));
}

function render(exportMode = false) {
    const { canvas, ctx } = state;
    if (!canvas || !ctx) return;
    
    const rawText = document.getElementById('charList').value;
    
    const cW = parseInt(document.getElementById('canvasW').value) || 512;
    const cH = parseInt(document.getElementById('canvasH').value) || 512;
    const cellW = parseInt(document.getElementById('cellW').value) || 20;
    const cellH = parseInt(document.getElementById('cellH').value) || 20;
    const fSize = parseInt(document.getElementById('fontSize').value) || 18;
    
    const textOffX = parseInt(document.getElementById('textOffsetX').value) || 0;
    const textOffY = parseInt(document.getElementById('textOffsetY').value) || 0;
    const gridOffX = parseInt(document.getElementById('gridOffsetX').value) || 0;
    const gridOffY = parseInt(document.getElementById('gridOffsetY').value) || 0;

    const textColor = document.getElementById('textColor').value;
    const bgColor = document.getElementById('bgColor').value;
    const isTransparent = document.getElementById('bgTransparent').checked;
    const showGrid = document.getElementById('showGrid').checked;
    const disableAA = document.getElementById('disableAA').checked; 
    const mode4Color = document.getElementById('mode4Color').checked;
    const showRefImg = document.getElementById('showRefImg').checked;
    const showText = document.getElementById('showText').checked;

    const isItalic = document.getElementById('isItalic').checked;
    const hasStroke = document.getElementById('hasStroke').checked;
    const strokeColor = document.getElementById('strokeColor').value;
    const strokeWidth = parseFloat(document.getElementById('strokeWidth').value) || 1;

    canvas.width = cW;
    canvas.height = cH;
    updateZoom();

    const availableW = cW - gridOffX;
    const maxCols = Math.floor(availableW / cellW);
    const availableH = cH - gridOffY;
    const maxRows = Math.floor(availableH / cellH);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!isTransparent) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (!exportMode && state.refImage && showRefImg) {
        ctx.drawImage(state.refImage, 0, 0, cW, cH);
    }

    ctx.font = `${isItalic ? 'italic ' : ''}${fSize}px "${state.fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;

    const lines = rawText.split('\n');
    let currentRow = 0;

    if (showText) {
        for (let l = 0; l < lines.length; l++) {
            const lineText = lines[l];
            let currentCol = 0;

            for (let c = 0; c < lineText.length; c++) {
                const char = lineText[c];
                
                if (currentCol >= maxCols) {
                    currentCol = 0;
                    currentRow++;
                }
                if (currentRow >= maxRows) break;

                if (char !== ' ' && char !== '\t') {
                    const x = gridOffX + currentCol * cellW + (cellW / 2) + textOffX;
                    const y = gridOffY + currentRow * cellH + (cellH / 2) + textOffY;
                    
                    if (hasStroke) {
                        ctx.lineWidth = strokeWidth;
                        ctx.strokeStyle = strokeColor;
                        ctx.strokeText(char, x, y);
                    }
                    
                    ctx.fillText(char, x, y);
                }
                
                currentCol++;
            }
            currentRow++;
            if (currentRow >= maxRows) break;
        }
    }

    if (showText && (disableAA || mode4Color)) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const quantize4 = (val) => Math.round(val / 255 * 3) / 3 * 255;
        const threshold = 128;

        for (let i = 0; i < data.length; i += 4) {
            if (disableAA) {
                if (isTransparent) {
                    data[i + 3] = data[i + 3] >= threshold ? 255 : 0;
                } else {
                    const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                    const val = brightness >= threshold ? 255 : 0;
                    data[i] = data[i+1] = data[i+2] = val;
                }
            } 
            else if (mode4Color) {
                if (isTransparent) {
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
        ctx.strokeStyle = '#ff557fe6'; 
        ctx.lineWidth = 1;
        ctx.beginPath();
        const drawCols = Math.floor((canvas.width - gridOffX) / cellW);
        const drawRows = Math.floor((canvas.height - gridOffY) / cellH);

        for (let r = 0; r < drawRows; r++) {
            for (let c = 0; c < drawCols; c++) {
                ctx.rect(gridOffX + c * cellW, gridOffY + r * cellH, cellW, cellH);
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