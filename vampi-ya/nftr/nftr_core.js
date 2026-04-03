const NftrCore = {
  fontU8: null,
  dataView: null,
  fileName: "font.nftr",
  encoding: 0,
  tileWidth: 0,
  tileHeight: 0,
  tileSize: 0,
  tileBitDepth: 0,
  bytesPerWidth: 0,
  maxChar: 0,
  fontTiles: [],
  fontWidths: [],
  tileToCharMap: [],

  parse(buffer) {
    this.fontU8 = new Uint8Array(buffer);
    this.dataView = new DataView(this.fontU8.buffer);
    const magicStr = String.fromCharCode(this.dataView.getUint8(0), this.dataView.getUint8(1), this.dataView.getUint8(2), this.dataView.getUint8(3));
    if (magicStr !== "RTFN" && magicStr !== "NFTR") throw new Error("非有效NFTR格式");

    let offset = 0x14;
    this.encoding = this.dataView.getUint8(0x1F);
    offset += this.dataView.getUint8(0x14);

    let chunkSize = this.dataView.getUint32(offset, true);
    offset += 4;
    this.tileWidth = this.dataView.getUint8(offset++);
    this.tileHeight = this.dataView.getUint8(offset++);
    this.tileSize = this.dataView.getUint16(offset, true);
    offset += 4;
    this.tileBitDepth = this.dataView.getUint8(offset++);
    let tileAmount = Math.floor((chunkSize - 0x10) / this.tileSize);
    offset++;

    this.fontTiles = [];
    for (let i = 0; i < tileAmount; i++) {
      this.fontTiles.push(new Uint8Array(buffer.slice(offset + (i * this.tileSize), offset + ((i + 1) * this.tileSize))));
    }

    offset = this.dataView.getUint32(0x24, true) - 4;
    chunkSize = this.dataView.getUint32(offset, true);
    offset += 6;
    this.maxChar = this.dataView.getUint16(offset, true) + 1;
    offset += 6;
    this.fontWidths = [];
    this.bytesPerWidth = Math.min(3, Math.floor((chunkSize - 0x10) / tileAmount));
    for (let i = 0; i < tileAmount; i++) {
      this.fontWidths.push(new Uint8Array(buffer.slice(offset + (i * this.bytesPerWidth), offset + ((i + 1) * this.bytesPerWidth))));
    }

    this.tileToCharMap = new Array(tileAmount).fill(null);
    let locPAMC = this.dataView.getUint32(0x28, true);
    while (locPAMC < this.fontU8.length && locPAMC !== 0) {
      let start = locPAMC;
      let firstChar = this.dataView.getUint16(start, true);
      let lastChar = this.dataView.getUint16(start + 2, true);
      let mapType = this.dataView.getUint32(start + 4, true);
      locPAMC = this.dataView.getUint32(start + 8, true);
      let current = start + 12;

      if (mapType === 0) {
        let firstTile = this.dataView.getUint16(current, true);
        for (let i = firstChar; i <= lastChar; i++) {
          let tidx = firstTile + (i - firstChar);
          if (tidx < tileAmount) this.tileToCharMap[tidx] = i;
        }
      } else if (mapType === 1) {
        for (let i = firstChar; i <= lastChar; i++) {
          let tile = this.dataView.getUint16(current, true);
          current += 2;
          if (tile !== 0xFFFF && tile < tileAmount) this.tileToCharMap[tile] = i;
        }
      } else if (mapType === 2) {
        let groupAmount = this.dataView.getUint16(current, true);
        current += 2;
        for (let i = 0; i < groupAmount; i++) {
          let charNo = this.dataView.getUint16(current, true);
          let tileNo = this.dataView.getUint16(current + 2, true);
          current += 4;
          if (tileNo < tileAmount) this.tileToCharMap[tileNo] = charNo;
        }
      }
    }
    return true;
  },

  generateBlob() {
    let offset = this.dataView.getUint32(0x20, true) + 8;
    for (let i = 0; i < this.fontTiles.length; i++) this.fontU8.set(this.fontTiles[i], offset + (i * this.tileSize));
    offset = this.dataView.getUint32(0x24, true) + 8;
    for (let i = 0; i < this.fontWidths.length; i++) this.fontU8.set(this.fontWidths[i], offset + (i * this.bytesPerWidth));
    this.dataView.setUint32(0x8, this.fontU8.length, true);
    return new Blob([this.fontU8], {
      type: "application/octet-stream"
    });
  }
};

const CsvParser = {
  mappings: [],
  parse(text) {
    this.mappings = [];
    text.split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      let parts = line.split(',');
      let newChar = (parts[0] === "" && parts[1] === "") ? "," : parts[0];
      let hexStr = (parts[0] === "" && parts[1] === "") ? parts[2] : parts[1];
      if (newChar !== undefined && hexStr !== undefined) {
        let code = parseInt(hexStr.trim().replace('0x', ''), 16);
        if (!isNaN(code)) this.mappings.push({
          newChar,
          hexCode: code
        });
      }
    });
    return this.mappings;
  }
};

const AppController = {
  replacedSet: new Set(),

  init() {
    this.cacheDOM();
    this.bindEvents();
    this.log("系统已就绪。");
  },

  cacheDOM() {
    const ids = ['nftrFile', 'csvFile', 'logOutput', 'fontFamily', 'btnLoadSysFonts', 'fontSize', 'offsetX', 'offsetY', 'alphaThreshold', 'purePixel', 'fontWeight', 'fixedWidth', 'btnFullRegen', 'btnProcess', 'btnSave', 'btnClearFont', 'btnGlobalSpacing', 'btnGenerateShadow', 'btnExportDict', 'canvasContainer', 'previewCanvas', 'emptyState', 'statusText', 'statsText', 'letterSpacing', 'fontRotation'];
    ids.forEach(id => this[id] = document.getElementById(id));
    this.ctxPreview = this.previewCanvas?.getContext('2d');
  },

  bindEvents() {
    this.nftrFile?.addEventListener('change', (e) => this.handleNftrUpload(e));
    this.csvFile?.addEventListener('change', (e) => this.handleCsvUpload(e));
    this.btnLoadSysFonts?.addEventListener('click', () => this.loadSystemFonts());
    this.btnExportDict?.addEventListener('click', () => this.exportDictCsv());
    this.btnProcess?.addEventListener('click', () => this.processData(false));
    this.btnFullRegen?.addEventListener('click', () => this.processData(true));
    this.btnSave?.addEventListener('click', () => this.saveFile());
    this.btnClearFont?.addEventListener('click', () => this.clearFontData());
    this.btnGlobalSpacing?.addEventListener('click', () => this.applyGlobalSpacing());
    this.btnGenerateShadow?.addEventListener('click', () => this.applyGlobalShadow());
    window.addEventListener('resize', () => {
      if (NftrCore.fontU8) this.renderGrid();
    });
  },

  log(msg) {
    const t = new Date().toLocaleTimeString('zh-CN', {
      hour12: false
    });
    this.logOutput.innerHTML += `\n[${t}] ${msg}`;
    this.logOutput.scrollTop = this.logOutput.scrollHeight;
  },

  decodeChar(code) {
    if (NftrCore.encoding === 1) return String.fromCharCode(code);
    try {
      let h = (code >> 8) & 0xFF,
        l = code & 0xFF;
      return new TextDecoder("shift-jis").decode(h === 0 ? new Uint8Array([l]) : new Uint8Array([h, l]));
    } catch (e) {
      return null;
    }
  },

  async loadSystemFonts() {
    if ('queryLocalFonts' in window) {
      try {
        this.btnLoadSysFonts.textContent = "获取中...";
        const fonts = await window.queryLocalFonts();
        this.fontFamily.innerHTML = "";
        let set = new Set();
        fonts.forEach(f => {
          if (!set.has(f.family)) {
            set.add(f.family);
            let opt = document.createElement('option');
            opt.value = `'${f.family}'`;
            opt.textContent = f.fullName;
            this.fontFamily.appendChild(opt);
          }
        });
        this.btnLoadSysFonts.textContent = "已获取";
        this.btnLoadSysFonts.disabled = true;
      } catch (e) {
        this.log("获取本地字体受限。");
      }
    }
  },

  handleNftrUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    NftrCore.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        if (NftrCore.parse(evt.target.result)) {

          this.replacedSet.clear();


          let enc = NftrCore.encoding === 1 ? 'Unicode' : 'Shift-JIS';
          this.statusText.textContent = `${NftrCore.tileWidth}x${NftrCore.tileHeight} | ${NftrCore.tileBitDepth}bpp | ${enc}`;

          this.log(`解析成功: ${NftrCore.tileWidth}x${NftrCore.tileHeight}, 深度: ${NftrCore.tileBitDepth}bpp`);
          this.fontSize.value = NftrCore.tileHeight;
          this.btnSave.disabled = false;
          this.btnFullRegen.disabled = false;
          this.btnClearFont.disabled = false;
          this.btnExportDict?.classList.remove('hidden');
          this.renderGrid();
        }
      } catch (err) {
        this.log(`❌ 失败: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      CsvParser.parse(evt.target.result);
      this.log(`载入映射: ${CsvParser.mappings.length} 条记录。`);
      if (NftrCore.fontU8) this.btnProcess.disabled = false;
    };
    reader.readAsText(file);
  },

  processData(isFull) {
    if (!NftrCore.fontU8) return;
    this.statusText.textContent = "正在渲染处理...";
    setTimeout(() => {
      try {
        let targets = isFull ? [] : CsvParser.mappings;
        if (isFull) {
          NftrCore.tileToCharMap.forEach((code, idx) => {
            if (code !== null) {
              let char = this.decodeChar(code);
              if (char) targets.push({
                newChar: char,
                hexCode: code
              });
            }
          });
          this.log(`全量重生成任务: ${targets.length} 个字符。`);
        }
        this._executeProcess(targets);
        this.renderGrid();
        this.log(`处理完成。`);
      } catch (err) {
        this.log(`❌ 错误: ${err.message}`);
      }
    }, 50);
  },

  _executeProcess(mappings) {
    const name = this.fontFamily?.value || "SimSun";
    const size = parseInt(this.fontSize?.value) || NftrCore.tileHeight;
    const xOff = parseInt(this.offsetX?.value) || 0;
    const yOff = parseInt(this.offsetY?.value) || 0;
    const space = parseInt(this.letterSpacing?.value) || 0;
    const thres = parseInt(this.alphaThreshold?.value) || 160;
    const bold = this.fontWeight?.checked || false;
    const fixed = this.fixedWidth?.checked || false;
    const rot = parseInt(this.fontRotation?.value) || 0;

    const off = document.createElement('canvas');
    off.width = NftrCore.tileWidth;
    off.height = NftrCore.tileHeight;
    const ctx = off.getContext('2d', {
      willReadFrequently: true
    });
    ctx.textBaseline = "top";
    const fontStr = `${bold ? "bold " : ""}${size}px ${name}`;
    const maxC = (1 << NftrCore.tileBitDepth) - 1;
    const pxb = 8 / NftrCore.tileBitDepth;

    mappings.forEach(m => {
      const idx = NftrCore.tileToCharMap.indexOf(m.hexCode);
      if (idx === -1) return;

      ctx.clearRect(0, 0, NftrCore.tileWidth, NftrCore.tileHeight);
      ctx.fillStyle = "white";
      ctx.font = fontStr;
      ctx.save();
      if (rot === 90) {
        ctx.translate(NftrCore.tileWidth, 0);
        ctx.rotate(Math.PI / 2);
      } else if (rot === -90) {
        ctx.translate(0, NftrCore.tileHeight);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.fillText(m.newChar, xOff, yOff);
      ctx.restore();

      const img = ctx.getImageData(0, 0, NftrCore.tileWidth, NftrCore.tileHeight).data;
      let bitmap = new Array(NftrCore.tileWidth * NftrCore.tileHeight).fill(0);
      for (let i = 0; i < bitmap.length; i++)
        if (img[i * 4 + 3] >= thres) bitmap[i] = maxC;

      for (let i = 0; i < bitmap.length; i += pxb) {
        let byte = 0;
        for (let j = 0; j < pxb; j++) byte |= (bitmap[i + j] || 0) << (8 - (NftrCore.tileBitDepth * (j + 1)));
        NftrCore.fontTiles[idx][i / pxb] = byte;
      }

      let tw = fixed ? NftrCore.tileWidth : Math.min(Math.ceil(ctx.measureText(m.newChar).width), NftrCore.tileWidth);
      if (NftrCore.fontWidths[idx]) {
        if (NftrCore.bytesPerWidth === 1) NftrCore.fontWidths[idx][0] = tw + space;
        else {
          NftrCore.fontWidths[idx][0] = 0;
          NftrCore.fontWidths[idx][1] = tw;
          if (NftrCore.bytesPerWidth === 3) NftrCore.fontWidths[idx][2] = tw + space;
        }
      }
      this.replacedSet.add(idx);
    });
  },

  applyGlobalShadow() {
    if (!NftrCore.fontU8) return;
    const maxC = (1 << NftrCore.tileBitDepth) - 1;
    if (maxC < 1) return alert("1bpp不支持阴影。");
    let mode = prompt(`阴影设置: "文字色,阴影色"`, `${maxC},1`);
    if (!mode) return;
    let [txtC, shdC] = mode.split(',').map(Number);
    const pxb = 8 / NftrCore.tileBitDepth;
    NftrCore.fontTiles.forEach((tile, t) => {
      let pix = new Array(NftrCore.tileWidth * NftrCore.tileHeight).fill(0);
      for (let i = 0; i < tile.length; i++) {
        for (let j = 0; j < pxb; j++) pix[i * pxb + j] = (tile[i] >> (8 - (NftrCore.tileBitDepth * (j + 1)))) & maxC;
      }
      let temp = [...pix],
        changed = false;
      for (let y = 0; y < NftrCore.tileHeight; y++) {
        for (let x = 0; x < NftrCore.tileWidth; x++) {
          if (temp[y * NftrCore.tileWidth + x] === txtC) {
            [
              [1, 0],
              [0, 1],
              [1, 1]
            ].forEach(([dx, dy]) => {
              let nx = x + dx,
                ny = y + dy;
              if (nx < NftrCore.tileWidth && ny < NftrCore.tileHeight) {
                let nidx = ny * NftrCore.tileWidth + nx;
                if (pix[nidx] !== txtC) {
                  pix[nidx] = shdC;
                  changed = true;
                }
              }
            });
          }
        }
      }
      if (changed) {
        for (let i = 0; i < pix.length; i += pxb) {
          let byte = 0;
          for (let j = 0; j < pxb; j++) byte |= (pix[i + j] || 0) << (8 - (NftrCore.tileBitDepth * (j + 1)));
          tile[i / pxb] = byte;
        }
        this.replacedSet.add(t);
      }
    });
    this.log("全局阴影已渲染。");
    this.renderGrid();
  },

  applyGlobalSpacing() {
    let val = parseInt(prompt("增加步进像素:", "1"));
    if (isNaN(val)) return;
    let tidx = NftrCore.bytesPerWidth - 1;
    NftrCore.fontWidths.forEach(w => {
      if (w) w[tidx] = Math.max(0, w[tidx] + val);
    });
    this.log("全局步进已修正。");
    this.renderGrid();
  },

  renderGrid() {
    if (!NftrCore.fontU8) return;
    this.emptyState.style.display = 'none';
    this.previewCanvas.style.display = 'block';
    const w = this.canvasContainer.getBoundingClientRect().width || 800;
    const scale = 2,
      cellW = Math.max(NftrCore.tileWidth * scale + 15, 45),
      cellH = NftrCore.tileHeight * scale + 30;
    const cols = Math.floor((w - 40) / cellW) || 10;
    this.previewCanvas.width = cols * cellW;
    this.previewCanvas.height = Math.ceil(NftrCore.fontTiles.length / cols) * cellH;
    this.ctxPreview.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.ctxPreview.textAlign = "center";
    const pxb = 8 / NftrCore.tileBitDepth,
      maxC = (1 << NftrCore.tileBitDepth) - 1;

    NftrCore.fontTiles.forEach((tile, t) => {
      const col = t % cols,
        row = Math.floor(t / cols);
      const dx = col * cellW + (cellW - NftrCore.tileWidth * scale) / 2,
        dy = row * cellH + 5;
      const isRep = this.replacedSet.has(t);
      for (let i = 0; i < tile.length; i++) {
        for (let j = 0; j < pxb; j++) {
          let c = (tile[i] >> (8 - (NftrCore.tileBitDepth * (j + 1)))) & maxC;
          if (c > 0) {
            this.ctxPreview.fillStyle = isRep ? `rgba(210, 63, 71, ${c/maxC})` : `rgba(255, 255, 255, ${c/maxC})`;
            this.ctxPreview.fillRect(dx + ((i * pxb + j) % NftrCore.tileWidth) * scale, dy + Math.floor((i * pxb + j) / NftrCore.tileWidth) * scale, scale, scale);
          }
        }
      }
      this.ctxPreview.fillStyle = isRep ? "#d23f47" : "rgba(255,255,255,0.3)";
      this.ctxPreview.font = "10px Consolas";
      this.ctxPreview.fillText(NftrCore.tileToCharMap[t]?.toString(16).toUpperCase().padStart(4, '0') || "NULL", col * cellW + cellW / 2, dy + NftrCore.tileHeight * scale + 12);
    });
    this.statsText.textContent = `总数: ${NftrCore.fontTiles.length} | 已改: ${this.replacedSet.size}`;
  },

  clearFontData() {
    if (confirm("确定抹零？")) {
      NftrCore.fontTiles.forEach(t => t.fill(0));
      this.replacedSet.clear();
      this.renderGrid();
    }
  },

  async saveFile() {
    const name = "CN_" + NftrCore.fileName;
    const blob = NftrCore.generateBlob();
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{
            description: 'NFTR File',
            accept: {
              'application/octet-stream': ['.nftr']
            }
          }]
        });
        const writer = await handle.createWritable();
        await writer.write(blob);
        await writer.close();
        this.log("文件保存成功。");
      } catch (e) {}
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
    }
  },

  async exportDictCsv() {
    let csv = "\uFEFF";
    NftrCore.tileToCharMap.forEach((code, i) => {
      if (code !== null) csv += `,${code.toString(16).toUpperCase()},${this.decodeChar(code) || ""}\n`;
    });
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "dict.csv",
          types: [{
            description: 'CSV File',
            accept: {
              'text/csv': ['.csv']
            }
          }]
        });
        const writer = await handle.createWritable();
        await writer.write(blob);
        await writer.close();
        this.log("字典已成功导出。");
      } catch (e) {}
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "dict.csv";
      a.click();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => AppController.init());