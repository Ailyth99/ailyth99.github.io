const vramCanvas = document.getElementById('vramCanvas');
const gridCanvas = document.getElementById('gridCanvas');
const interCanvas = document.getElementById('interactionCanvas');
const container = document.getElementById('container');
const viewport = document.getElementById('viewport');
const toast = document.getElementById('toast');
const widthSelect = document.getElementById('gameWidthSelect');
const btnClut = document.getElementById('setClutAreaBtn');
const btnFrame = document.getElementById('setFrameAreaBtn');

const vctx = vramCanvas.getContext('2d', { alpha: false });
const gctx = gridCanvas.getContext('2d');
const ictx = interCanvas.getContext('2d');


let rawBuffer = null;
let vramData = null;
let scale = 1.0;
let viewX = 0, viewY = 0;
let isPanning = false, isSelecting = false;
let startMousePos = { x: 0, y: 0 };
let selection = { x1: 0, y1: 0, x2: 0, y2: 0, active: false };

let editMode = 'NORMAL'; 
let isFrozen = false; let lastHoverState = { val: null, px: 0, py: 0 }; 

let clutArea = { x: 0, y: 480, w: 320, h: 32 };
let frameArea = { x: 0, y: 0, w: 320, h: 480 };


btnClut.onclick = () => { 
    editMode = (editMode === 'SET_CLUT') ? 'NORMAL' : 'SET_CLUT';
    updateBtnStates(); 
    refreshOverlay();
};

btnFrame.onclick = () => { 
    editMode = (editMode === 'SET_FRAME') ? 'NORMAL' : 'SET_FRAME';
    updateBtnStates(); 
    refreshOverlay();
};

function updateBtnStates() {
    btnClut.classList.toggle('btn-active', editMode === 'SET_CLUT');
    btnFrame.classList.toggle('btn-active', editMode === 'SET_FRAME');
}

function syncInterCanvas() {
    const rect = viewport.getBoundingClientRect();
    if (interCanvas.width !== rect.width || interCanvas.height !== rect.height) {
        interCanvas.width = rect.width; 
        interCanvas.height = rect.height;
    }
}
window.addEventListener('resize', syncInterCanvas);

function resetDefaults() {
    const w = parseInt(widthSelect.value);
    frameArea = { x: 0, y: 0, w: w, h: 480 };
    clutArea = { x: 0, y: 480, w: w, h: 32 };
    
    editMode = 'NORMAL';
    isFrozen = false;
    lastHoverState = { val: null, px: 0, py: 0 };
    
    updateBtnStates();
    refreshOverlay();
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        rawBuffer = await file.arrayBuffer();
        vramData = new Uint16Array(rawBuffer);
        renderVRAM();
        resetView();
        resetDefaults(); 
            } catch (err) {
        alert("载入失败: " + err);
    }
});

function renderVRAM() {
    const imgData = vctx.createImageData(1024, 512);
    const pix = imgData.data;
    for (let i = 0; i < vramData.length; i++) {
        const v = vramData[i];
        pix[i*4] = (v & 0x1F) << 3; 
        pix[i*4+1] = ((v >> 5) & 0x1F) << 3;
        pix[i*4+2] = ((v >> 10) & 0x1F) << 3;
        pix[i*4+3] = 255;
    }
    vctx.putImageData(imgData, 0, 0);
}

function updateTransform() {
    container.style.transform = `translate(${viewX}px, ${viewY}px) scale(${scale})`;
    document.getElementById('zoomInfo').innerText = `${Math.round(scale * 100)}%`;
    drawGrid(); 
    syncInterCanvas(); 
    refreshOverlay();
}

function resetView() {
    const vRect = viewport.getBoundingClientRect();
    scale = Math.min((vRect.width - 20) / 1024, (vRect.height - 20) / 512);
    viewX = (vRect.width - 1024 * scale) / 2; 
    viewY = (vRect.height - 512 * scale) / 2;
    updateTransform();
}
document.getElementById('recenterBtn').onclick = resetView;

widthSelect.addEventListener('change', resetDefaults);

function screenToPixel(clientX, clientY) {
    const vRect = viewport.getBoundingClientRect();
    const x = Math.floor((clientX - vRect.left - viewX) / scale);
    const y = Math.floor((clientY - vRect.top - viewY) / scale);
    return { 
        x: Math.max(0, Math.min(1023, x)), 
        y: Math.max(0, Math.min(511, y)) 
    };
}
function pixelToScreen(px, py) { 
    return { x: px * scale + viewX, y: py * scale + viewY }; 
}

function drawAreas() {
    ictx.save();
    ictx.setLineDash([5, 5]);
    ictx.lineWidth = 1.5;
    
    const cs = pixelToScreen(clutArea.x, clutArea.y);
    ictx.shadowBlur = 4; ictx.shadowColor = "#ff3366";
    ictx.strokeStyle = "rgba(255, 51, 102, 0.8)";
    ictx.strokeRect(cs.x, cs.y, clutArea.w * scale, clutArea.h * scale);
    ictx.fillStyle = "#ff3366"; ictx.font = "10px Consolas";
    ictx.fillText(`CLUT AREA`, cs.x + 5, cs.y - 5);

    const fs = pixelToScreen(frameArea.x, frameArea.y);
    ictx.shadowColor = "#9933ff";
    ictx.strokeStyle = "rgba(153, 51, 255, 0.6)";
    ictx.strokeRect(fs.x, fs.y, frameArea.w * scale, frameArea.h * scale);
    ictx.fillStyle = "#9933ff";
    ictx.fillText("FRAME BUFFER", fs.x + 5, fs.y - 5);
    
    ictx.restore();
}

function drawLinkageLines() {
    const state = lastHoverState; 

    if (!state || state.val === null) return;
    if ((state.val & 0x7FFF) === 0) return; //忽略纯黑

    if (state.px < frameArea.x || state.px >= frameArea.x + frameArea.w || 
        state.py < frameArea.y || state.py >= frameArea.y + frameArea.h) return;

    let matches = [];
    //只在“CLUT区域”内搜索
    for (let y = clutArea.y; y < clutArea.y + clutArea.h; y++) {
        for (let x = clutArea.x; x < clutArea.x + clutArea.w; x++) {
            if (vramData[y * 1024 + x] === state.val) {
                matches.push({x, y});
            }
        }
    }

    if (matches.length > 0) {
        ictx.save();
        // 冻结时变蓝，平时红
        const color = isFrozen ? "#00ffff" : "#ff3366";
        ictx.shadowBlur = 4; 
        ictx.shadowColor = color;
        ictx.beginPath(); 
        ictx.strokeStyle = color; 
        ictx.lineWidth = 1.2;
        
        const start = pixelToScreen(state.px, state.py);
        matches.forEach(m => {
            const end = pixelToScreen(m.x, m.y);
            ictx.moveTo(start.x + scale/2, start.y + scale/2);
            ictx.lineTo(end.x + scale/2, end.y + scale/2);
            ictx.strokeRect(end.x, end.y, scale, scale);
        });
        ictx.stroke(); 
        ictx.restore();
    }
}

function refreshOverlay() {
    ictx.clearRect(0, 0, interCanvas.width, interCanvas.height);
    
    drawAreas(); 
    
    if (selection.active) drawSelection();
    
    
    if (isSelecting && editMode !== 'NORMAL') {
        const x1 = Math.min(selection.x1, selection.x2);
        const y1 = Math.min(selection.y1, selection.y2);
        const w = Math.abs(selection.x1 - selection.x2) + 1;
        const h = Math.abs(selection.y1 - selection.y2) + 1;
        const s = pixelToScreen(x1, y1);
        ictx.strokeStyle = editMode === 'SET_CLUT' ? "#ff3366" : "#9933ff";
        ictx.strokeRect(s.x, s.y, w * scale, h * scale);
    }
    
    if (!isSelecting && !isPanning && editMode === 'NORMAL') {
        drawLinkageLines();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') {
        isFrozen = !isFrozen;
        const msg = isFrozen ? "连线已锁定 (F 解锁)" : "连线解锁";
        showToast(msg);
        refreshOverlay();
    }
});

function showToast(msg) {
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 1000);
}

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const vRect = viewport.getBoundingClientRect();
    const factor = e.deltaY > 0 ? 0.8 : 1.25;
    const nextScale = Math.min(Math.max(scale * factor, 0.05), 100);
    const mx = e.clientX - vRect.left - viewX;
    const my = e.clientY - vRect.top - viewY;
    viewX -= (mx / scale) * (nextScale - scale);
    viewY -= (my / scale) * (nextScale - scale);
    scale = nextScale;
    updateTransform();
}, { passive: false });

interCanvas.addEventListener('mousedown', (e) => {
    const c = screenToPixel(e.clientX, e.clientY);
    if (e.button === 2 || e.button === 1) {
        isPanning = true; 
        startMousePos = { x: e.clientX, y: e.clientY };
    } else if (e.button === 0) {
        isSelecting = true;
        selection.active = true;
        selection.x1 = selection.x2 = c.x; 
        selection.y1 = selection.y2 = c.y;
    }
});

window.addEventListener('mousemove', (e) => {
    syncInterCanvas();
    
    if (isPanning) {
        viewX += e.clientX - startMousePos.x; 
        viewY += e.clientY - startMousePos.y;
        startMousePos = { x: e.clientX, y: e.clientY }; 
        updateTransform(); 
        return;
    }

    const rect = interCanvas.getBoundingClientRect();
    const isInViewport = (e.clientX >= rect.left && e.clientX <= rect.right && 
                          e.clientY >= rect.top && e.clientY <= rect.bottom);

    if (!isInViewport) {
        if (!isSelecting) refreshOverlay();
        return;
    }

    const c = screenToPixel(e.clientX, e.clientY);
    document.getElementById('posInfo').innerText = `${c.x}, ${c.y}`;
    document.getElementById('offsetInfo').innerText = `0x${((c.y * 1024 + c.x) * 2).toString(16).toUpperCase()}`;

    let val = null;
    if (vramData) {
        val = vramData[c.y * 1024 + c.x];
        const r = (val & 0x1F) << 3;
        const g = ((val >> 5) & 0x1F) << 3;
        const b = ((val >> 10) & 0x1F) << 3;
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
        document.getElementById('hexInfo').innerText = hex;
        document.getElementById('colorSwatch').style.backgroundColor = hex;
    }

    if (!isFrozen) {
        lastHoverState = { val: val, px: c.x, py: c.y };
    }

    if (isSelecting) { 
        selection.x2 = c.x; 
        selection.y2 = c.y; 
    }
    
    refreshOverlay();
});

window.addEventListener('mouseup', () => {
    if (isSelecting) {
        const x = Math.min(selection.x1, selection.x2);
        const y = Math.min(selection.y1, selection.y2);
        const w = Math.abs(selection.x1 - selection.x2) + 1;
        const h = Math.abs(selection.y1 - selection.y2) + 1;
        
        if (editMode === 'SET_CLUT') {
            clutArea = { x, y, w, h }; 
            editMode = 'NORMAL';
            updateBtnStates();
        } else if (editMode === 'SET_FRAME') {
            frameArea = { x, y, w, h }; 
            editMode = 'NORMAL';
            updateBtnStates();
        }
    }
    isPanning = false; 
    isSelecting = false;
    if (selection.active) { 
        document.getElementById('exportBtn').disabled = false; 
        document.getElementById('exportActBtn').disabled = false; 
    }
    refreshOverlay();
});

interCanvas.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    const c = screenToPixel(e.clientX, e.clientY);
    const x1 = Math.min(selection.x1, selection.x2);
    const x2 = Math.max(selection.x1, selection.x2);
    const y1 = Math.min(selection.y1, selection.y2);
    const y2 = Math.max(selection.y1, selection.y2);
    
    if (selection.active && c.x >= x1 && c.x <= x2 && c.y >= y1 && c.y <= y2) {
        const w = x2 - x1 + 1;
        const h = y2 - y1 + 1;
        const raw = new Uint8Array(w * h * 2);
        for(let i=0; i<h; i++){ 
            for(let j=0; j<w; j++){ 
                const v = vramData[(y1+i)*1024+(x1+j)]; 
                raw[(i*w+j)*2] = v & 0xFF; 
                raw[(i*w+j)*2+1] = (v>>8)&0xFF; 
            } 
        }
        await navigator.clipboard.writeText(Array.from(raw).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' '));
        showToast("HEX 已复制");
    }
});

function drawGrid() {
    gctx.clearRect(0, 0, 1024, 512); 
    if (scale < 12) return;
    gctx.beginPath(); 
    gctx.strokeStyle = "rgba(255, 51, 102, 0.2)"; 
    gctx.lineWidth = 1/scale;
    for(let x=0; x<=1024; x++) { gctx.moveTo(x,0); gctx.lineTo(x,512); }
    for(let y=0; y<=512; y++) { gctx.moveTo(0,y); gctx.lineTo(1024,y); }
    gctx.stroke();
}

function drawSelection() {
    const x = Math.min(selection.x1, selection.x2);
    const y = Math.min(selection.y1, selection.y2);
    const w = Math.abs(selection.x1 - selection.x2) + 1;
    const h = Math.abs(selection.y1 - selection.y2) + 1;
    const s = pixelToScreen(x, y); 
    ictx.fillStyle = "rgba(255, 0, 0, 0.5)"; 
    ictx.fillRect(s.x, s.y, w * scale, h * scale);
    document.getElementById('sizeInfo').innerText = `${w} x ${h}`; 
    document.getElementById('byteInfo').innerText = w * h * 2;
}

async function exportData(type) {
    const x = Math.min(selection.x1, selection.x2);
    const y = Math.min(selection.y1, selection.y2);
    const w = Math.abs(selection.x1-selection.x2)+1;
    const h = Math.abs(selection.y1-selection.y2)+1;
    let data, ext;
    if (type === 'raw') {
        data = new Uint8Array(w * h * 2);
        for(let i=0; i<h; i++) for(let j=0; j<w; j++) { 
            const v = vramData[(y+i)*1024 + (x+j)]; 
            data[(i*w+j)*2] = v & 0xFF; 
            data[(i*w+j)*2+1] = (v >> 8) & 0xFF; 
        }
        ext = '.bin';
    } else {
        data = new Uint8Array(768); 
        const count = Math.min(w * h, 256);
        for(let i=0; i<count; i++){ 
            const v = vramData[y*1024 + x + i]; 
            data[i*3]=(v&0x1F)<<3; 
            data[i*3+1]=((v>>5)&0x1F)<<3; 
            data[i*3+2]=((v>>10)&0x1F)<<3; 
        }
        ext = '.act';
    }
    const name = `CLUT_0x${((y*1024+x)*2).toString(16).toUpperCase()}_${w}x${h}${ext}`;
    if (window.showSaveFilePicker) {
        try { 
            const hdl = await window.showSaveFilePicker({ suggestedName: name }); 
            const wr = await hdl.createWritable(); 
            await wr.write(data); 
            await wr.close(); 
        } catch(e){}
    } else {
        const b = new Blob([data]); 
        const u = URL.createObjectURL(b); 
        const a = document.createElement('a'); 
        a.href = u; 
        a.download = name; 
        a.click();
    }
}
document.getElementById('exportBtn').onclick = () => exportData('raw');
document.getElementById('exportActBtn').onclick = () => exportData('act');