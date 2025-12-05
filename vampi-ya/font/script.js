const state = { fontFamily: "sans-serif", zoom: 1.5, canvas: null, ctx: null };
document.addEventListener("DOMContentLoaded", () => {
  checkMobile();
  state.canvas = document.getElementById("previewCanvas");
  state.ctx = state.canvas.getContext("2d", { willReadFrequently: true });
  bindEvents();
  checkSystemFontSupport();
  updateCharCount();
  render();
});
function checkMobile() {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile =
    /iphone|ipad|ipod|android|blackberry|iemobile|opera mini/i.test(ua) ||
    window.innerWidth < 768;
  if (isMobile) {
    setTimeout(() => {
      alert("提示：\n本工具未做手机适配\n建议在电脑端使用。");
    }, 500);
  }
}
function bindEvents() {
  document
    .getElementById("fontInput")
    .addEventListener("change", handleFontUpload);
  const btnSys = document.getElementById("btnLoadSystemFonts");
  if (btnSys) btnSys.addEventListener("click", loadSystemFonts);
  const selSys = document.getElementById("systemFontSelect");
  if (selSys)
    selSys.addEventListener("change", (e) => {
      state.fontFamily = e.target.value;
      updateFontStatus(e.target.value, "System");
      render();
    });
  bindSyncedInputs("cellW", "slider_cellW", "val_cellW");
  bindSyncedInputs("cellH", "slider_cellH", "val_cellH");
  bindSyncedInputs("fontSize", "slider_fontSize", "val_fontSize");
  bindSyncedInputs("offsetX", "slider_offsetX", null);
  bindSyncedInputs("offsetY", "slider_offsetY", null);
  const container = document.getElementById("canvasContainer");
  const zoomRange = document.getElementById("zoomRange");
  const zoomValue = document.getElementById("zoomValue");
  if (zoomRange && parseFloat(zoomRange.value) !== state.zoom) {
    zoomRange.value = state.zoom;
    zoomValue.innerText = state.zoom * 100 + "%";
  }
  container.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || true) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        let newZoom = parseFloat(zoomRange.value) + delta;
        newZoom = Math.max(0.1, Math.min(4.0, newZoom));
        zoomRange.value = newZoom.toFixed(1);
        state.zoom = newZoom;
        zoomValue.innerText = Math.round(state.zoom * 100) + "%";
        updateZoom();
      }
    },
    { passive: false },
  );
  zoomRange.addEventListener("input", (e) => {
    state.zoom = parseFloat(e.target.value);
    zoomValue.innerText = Math.round(state.zoom * 100) + "%";
    updateZoom();
  });
  document.getElementById("btnDownload").addEventListener("click", downloadPNG);
  document.getElementById("btnFitHeight").addEventListener("click", fitHeight);
  const charListEl = document.getElementById("charList");
  if (charListEl) {
    charListEl.addEventListener("input", () => {
      updateCharCount();
      render();
    });
  }
  const inputs = [
    "canvasW",
    "canvasH",
    "textColor",
    "bgColor",
    "bgTransparent",
    "showGrid",
    "disableAA",
    "mode4Color",
  ];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => render());
      el.addEventListener("change", () => render());
    }
  });
}
function updateCharCount() {
  const val = document.getElementById("charList").value.replace(/[\r\n]/g, "");
  const display = document.getElementById("charCountDisplay");
  if (display) {
    display.innerText = `当前字数:${val.length}`;
  }
}
function bindSyncedInputs(numId, rangeId, displayId) {
  const numEl = document.getElementById(numId);
  const rangeEl = document.getElementById(rangeId);
  const displayEl = displayId ? document.getElementById(displayId) : null;
  if (!numEl || !rangeEl) return;
  const sync = (src, dst) => {
    dst.value = src.value;
    if (displayEl) displayEl.innerText = src.value;
    render();
  };
  rangeEl.addEventListener("input", () => sync(rangeEl, numEl));
  numEl.addEventListener("input", () => sync(numEl, rangeEl));
}
function checkSystemFontSupport() {
  if ("queryLocalFonts" in window)
    document.getElementById("systemFontArea").style.display = "block";
}
async function loadSystemFonts() {
  const btn = document.getElementById("btnLoadSystemFonts");
  const select = document.getElementById("systemFontSelect");
  if (!("queryLocalFonts" in window)) {
    alert("不支持此API");
    return;
  }
  btn.innerText = "请授权...";
  btn.disabled = true;
  try {
    const fonts = await window.queryLocalFonts();
    const families = new Set(fonts.map((f) => f.family));
    select.innerHTML = '<option value="" disabled selected>▼ 选择字体</option>';
    [...families].sort().forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f;
      opt.textContent = f;
      try {
        opt.style.fontFamily = `"${f}"`;
      } catch (e) {}
      select.appendChild(opt);
    });
    btn.style.display = "none";
    select.style.display = "block";
  } catch (err) {
    btn.innerText = "重试";
    btn.disabled = false;
    if (err.name !== "SecurityError" && err.name !== "NotAllowedError")
      alert(err.message);
  }
}
async function handleFontUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  updateFontStatus("加载中...", "Loading");
  try {
    const buffer = await file.arrayBuffer();
    const fontName = "UserFont_" + Date.now();
    const fontFace = new FontFace(fontName, buffer);
    await fontFace.load();
    document.fonts.add(fontFace);
    state.fontFamily = fontName;
    document.getElementById("systemFontSelect").value = "";
    updateFontStatus(file.name, "File");
    render();
  } catch (err) {
    updateFontStatus("无效文件", "Error");
  }
}
function updateFontStatus(name, type) {
  const el = document.getElementById("fontStatus");
  if (!el) return;
  el.innerText =
    (type === "Error"
      ? "错误:"
      : type === "File"
        ? "文件:"
        : type === "System"
          ? "系统:"
          : "") + name;
  el.style.color =
    type === "Error"
      ? "#f48771"
      : type === "File"
        ? "#ff3366"
        : type === "System"
          ? "#4fc1ff"
          : "#ccc";
}
function fitHeight() {
  const chars = document
    .getElementById("charList")
    .value.replace(/[\r\n]/g, "");
  const cW = parseInt(document.getElementById("canvasW").value);
  const cellW = parseInt(document.getElementById("cellW").value);
  const cellH = parseInt(document.getElementById("cellH").value);
  const cols = Math.floor(cW / cellW);
  const rows = Math.ceil(chars.length / cols);
  document.getElementById("canvasH").value = Math.max(rows * cellH, cellH);
  render();
}
function render(exportMode = false) {
  const { canvas, ctx } = state;
  if (!canvas || !ctx) return;
  const chars = document
    .getElementById("charList")
    .value.replace(/[\r\n]/g, "");
  const cW = parseInt(document.getElementById("canvasW").value) || 512;
  const cH = parseInt(document.getElementById("canvasH").value) || 512;
  const cellW = parseInt(document.getElementById("cellW").value) || 32;
  const cellH = parseInt(document.getElementById("cellH").value) || 32;
  const fSize = parseInt(document.getElementById("fontSize").value) || 24;
  const offX = parseInt(document.getElementById("offsetX").value) || 0;
  const offY = parseInt(document.getElementById("offsetY").value) || 0;
  const textColor = document.getElementById("textColor").value;
  const bgColor = document.getElementById("bgColor").value;
  const isTransparent = document.getElementById("bgTransparent").checked;
  const showGrid = document.getElementById("showGrid").checked;
  const disableAA = document.getElementById("disableAA").checked;
  const mode4Color = document.getElementById("mode4Color").checked;
  canvas.width = cW;
  canvas.height = cH;
  updateZoom();
  const cols = Math.floor(cW / cellW);
  const rows = Math.floor(cH / cellH);
  const maxChars = cols * rows;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!isTransparent) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.font = `${fSize}px"${state.fontFamily}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = textColor;
  for (let i = 0; i < chars.length; i++) {
    if (i >= maxChars) break;
    const char = chars[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellW + cellW / 2 + offX;
    const y = row * cellH + cellH / 2 + offY;
    ctx.fillText(char, x, y);
  }
  if (disableAA || mode4Color) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const quantize4 = (val) => (Math.round((val / 255) * 3) / 3) * 255;
    const threshold = 128;
    for (let i = 0; i < data.length; i += 4) {
      if (disableAA) {
        if (isTransparent) {
          data[i + 3] = data[i + 3] >= threshold ? 255 : 0;
        } else {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const val = brightness >= threshold ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = val;
        }
      } else if (mode4Color) {
        if (isTransparent) {
          data[i + 3] = quantize4(data[i + 3]);
        } else {
          data[i] = quantize4(data[i]);
          data[i + 1] = quantize4(data[i + 1]);
          data[i + 2] = quantize4(data[i + 2]);
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
  if (!exportMode && showGrid) {
    ctx.strokeStyle = "rgba(255, 51, 102, 0.4)";
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
  canvas.style.width = canvas.width * zoom + "px";
  canvas.style.height = canvas.height * zoom + "px";
}
function downloadPNG() {
  render(true);
  const link = document.createElement("a");
  link.download = "font_img.png";
  link.href = state.canvas.toDataURL("image/png");
  link.click();
  render(false);
}
