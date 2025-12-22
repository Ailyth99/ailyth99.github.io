const appState = {
    zoom: 1.0,
    image: null,
    canvas: null,
    ctx: null,
    uiColor: "#FF3366",
    dataColor: "#6fedb2"
};

document.addEventListener('DOMContentLoaded', () => {
    appState.canvas = document.getElementById('main_canvas');
    appState.ctx = appState.canvas.getContext('2d');
    initApp();
});

function initApp() {
    setupEventListeners();
    renderFrame();
}

function setupEventListeners() {
    document.getElementById('image_loader').addEventListener('change', handleImageUpload);

    const rangeSyncs = [
        ['origin_x', 'slider_x'], ['origin_y', 'slider_y'],
        ['cell_w', 'slider_w'], ['cell_h', 'slider_h']
    ];
    rangeSyncs.forEach(cfg => bindRangeSync(cfg[0], cfg[1]));

    const zoomer = document.getElementById('zoom_slider');
    zoomer.addEventListener('input', () => {
        appState.zoom = parseFloat(zoomer.value);
        refreshCanvasDisplay();
    });

    document.getElementById('viewport').addEventListener('wheel', (e) => {
        e.preventDefault();
        const step = e.deltaY > 0 ? -0.1 : 0.1;
        appState.zoom = Math.max(0.1, Math.min(8.0, appState.zoom + step));
        zoomer.value = appState.zoom.toFixed(1);
        refreshCanvasDisplay();
    }, { passive: false });

    ['sequence_input', 'toggle_overlay', 'toggle_grid', 'bg_picker'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderFrame);
    });

    document.getElementById('export_button').addEventListener('click', openExportWindow);
    document.getElementById('copy_button').addEventListener('click', copyHexToClipboard);
    document.getElementById('close_modal').addEventListener('click', () => {
        document.getElementById('export_modal').style.display = 'none';
    });
}

function bindRangeSync(nId, rId) {
    const num = document.getElementById(nId), range = document.getElementById(rId);
    range.addEventListener('input', () => { num.value = range.value; renderFrame(); });
    num.addEventListener('input', () => { range.value = num.value; renderFrame(); });
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
        appState.image = img;
        document.getElementById('image_info').innerText = `尺寸: ${img.width} x ${img.height}`;
        refreshCanvasDisplay(true);
    };
    img.src = URL.createObjectURL(file);
}

function refreshCanvasDisplay(resetRes = false) {
    if (resetRes) {
        appState.canvas.width = appState.image ? appState.image.width : 512;
        appState.canvas.height = appState.image ? appState.image.height : 512;
    }
    appState.canvas.style.width = (appState.canvas.width * appState.zoom) + 'px';
    appState.canvas.style.height = (appState.canvas.height * appState.zoom) + 'px';
    document.getElementById('zoom_display').innerText = Math.round(appState.zoom * 100) + '%';
    renderFrame();
}

function parseInputMap(cols) {
    const input = document.getElementById('sequence_input').value;
    const result = [];
    let pos = 0;
    for (let char of input) {
        if (char === '\n') {
            pos = (Math.floor(pos / cols) + 1) * cols;
        } else if (char === ' ' || char === '　') {
            pos++;
        } else {
            result.push({ char, index: pos });
            pos++;
        }
    }
    return result;
}

function renderFrame() {
    const { canvas, ctx, image, dataColor, uiColor } = appState;
    if (!ctx) return;

    const ox = parseInt(document.getElementById('origin_x').value) || 0;
    const oy = parseInt(document.getElementById('origin_y').value) || 0;
    const cw = parseInt(document.getElementById('cell_w').value) || 16;
    const ch = parseInt(document.getElementById('cell_h').value) || 16;
    const activeGrid = document.getElementById('toggle_grid').checked;
    const activeText = document.getElementById('toggle_overlay').checked;
    const bg = document.getElementById('bg_picker').value;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (image) ctx.drawImage(image, 0, 0);

    if (activeGrid) {
        ctx.strokeStyle = dataColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = ox; x <= canvas.width; x += cw) {
            ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        }
        for (let y = oy; y <= canvas.height; y += ch) {
            ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
    }

    const cols = Math.floor((canvas.width - ox) / cw);
    if (cols <= 0) return;
    const map = parseInputMap(cols);

    map.forEach(item => {
        const c = item.index % cols, r = Math.floor(item.index / cols);
        const x = ox + c * cw, y = oy + r * ch;
        ctx.fillStyle = "rgba(255, 51, 102, 0.3)";
        ctx.fillRect(x, y, cw, ch);
        if (activeText) {
            ctx.fillStyle = uiColor;
            ctx.font = `${ch * 0.7}px sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(item.char, x + cw/2, y + ch/2);
        }
    });
}

function openExportWindow() {
    const ox = parseInt(document.getElementById('origin_x').value);
    const oy = parseInt(document.getElementById('origin_y').value);
    const cw = parseInt(document.getElementById('cell_w').value);
    const ch = parseInt(document.getElementById('cell_h').value);
    const cols = Math.floor((appState.canvas.width - ox) / cw);
    const map = parseInputMap(cols);

    let hexStr = "";
    const toHexLE = (v) => {
        const l = (v & 0xFF).toString(16).padStart(2, '0');
        const h = ((v >> 8) & 0xFF).toString(16).padStart(2, '0');
        return (l + h).toUpperCase();
    };

    map.forEach(item => {
        const c = item.index % cols, r = Math.floor(item.index / cols);
        const x1 = ox + c * cw, y1 = oy + r * ch;
        hexStr += toHexLE(item.char.charCodeAt(0)) + toHexLE(x1) + toHexLE(y1) + toHexLE(x1 + cw) + toHexLE(y1 + ch);
    });

    document.getElementById('hex_output').value = hexStr;
    document.getElementById('export_modal').style.display = 'flex';
}

function copyHexToClipboard() {
    const out = document.getElementById('hex_output');
    const btn = document.getElementById('copy_button');
    out.select();
    document.execCommand('copy');
    
    const originalText = btn.innerText;
    btn.innerText = "已复制到剪贴板";
    btn.style.background = "#8CB7AF";
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = appState.uiColor;
    }, 1500);
}