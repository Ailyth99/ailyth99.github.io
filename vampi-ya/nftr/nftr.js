const NftrCore = {
    fontU8: null, dataView: null, fileName: "font.nftr",
    encoding: 0, tileWidth: 0, tileHeight: 0, tileSize: 0, 
    tileBitDepth: 0, bytesPerWidth: 0, maxChar: 0,
    fontTiles: [], fontWidths: [], tileToCharMap:[], 

    parse(buffer) {
        this.fontU8 = new Uint8Array(buffer);
        this.dataView = new DataView(this.fontU8.buffer);
        
        const magicStr = String.fromCharCode(
            this.dataView.getUint8(0), this.dataView.getUint8(1),
            this.dataView.getUint8(2), this.dataView.getUint8(3)
        );

        if (magicStr !== "RTFN" && magicStr !== "NFTR") throw new Error("文件头部不是 NFTR 或 RTFN。");

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

        this.fontTiles =[];
        for (let i = 0; i < tileAmount; i++) {
            this.fontTiles.push(new Uint8Array(buffer.slice(offset + (i * this.tileSize), offset + ((i + 1) * this.tileSize))));
        }

        offset = this.dataView.getUint32(0x24, true) - 4;
        chunkSize = this.dataView.getUint32(offset, true);
        offset += 6;
        this.maxChar = this.dataView.getUint16(offset, true) + 1;
        offset += 6;

        this.fontWidths =[];
        this.bytesPerWidth = Math.min(3, Math.floor((chunkSize - 0x10) / tileAmount));
        for (let i = 0; i < tileAmount; i++) {
            this.fontWidths.push(new Uint8Array(buffer.slice(offset + (i * this.bytesPerWidth), offset + ((i + 1) * this.bytesPerWidth))));
        }

        this.tileToCharMap = new Array(tileAmount).fill(null);
        let locPAMC = this.dataView.getUint32(0x28, true);

        while (locPAMC < this.fontU8.length && locPAMC !== 0) {
            offset = locPAMC;
            let firstChar = this.dataView.getUint16(offset, true);
            offset += 2;
            let lastChar = this.dataView.getUint16(offset, true);
            offset += 2;
            let mapType = this.dataView.getUint32(offset, true);
            offset += 4;
            locPAMC = this.dataView.getUint32(offset, true);
            offset += 4;

            if (mapType === 0) {
                let firstTile = this.dataView.getUint16(offset, true);
                for (let i = firstChar; i <= lastChar; i++) {
                    this.tileToCharMap[firstTile + (i - firstChar)] = i;
                }
            } else if (mapType === 1) {
                for (let i = firstChar; i <= lastChar; i++) {
                    let tile = this.dataView.getUint16(offset, true);
                    offset += 2;
                    this.tileToCharMap[tile] = i;
                }
            } else if (mapType === 2) {
                let groupAmount = this.dataView.getUint16(offset, true);
                offset += 2;
                for (let i = 0; i < groupAmount; i++) {
                    let charNo = this.dataView.getUint16(offset, true);
                    offset += 2;
                    let tileNo = this.dataView.getUint16(offset, true);
                    offset += 2;
                    this.tileToCharMap[tileNo] = charNo;
                }
            }
        }
        return true;
    },

    generateBlob() {
        let offset = this.dataView.getUint32(0x20, true) + 8;
        for (let i = 0; i < this.fontTiles.length; i++) {
            this.fontU8.set(this.fontTiles[i], offset + (i * this.tileSize));
        }
        offset = this.dataView.getUint32(0x24, true) + 8;
        for (let i = 0; i < this.fontWidths.length; i++) {
            this.fontU8.set(this.fontWidths[i], offset + (i * this.bytesPerWidth));
        }
        this.dataView.setUint32(0x8, this.fontU8.length, true);
        return new Blob([this.fontU8], { type: "application/octet-stream" });
    }
};

/**
 * CsvParser字典解析
 */
const CsvParser = {
    mappings:[],
    parse(text) {
        this.mappings =[];
        const lines = text.split(/\r?\n/);
        for (let line of lines) {
            if (!line.trim()) continue;
            let parts = line.split(',');
            let newChar = (parts[0] === "" && parts[1] === "") ? "," : parts[0];
            let hexStr = (parts[0] === "" && parts[1] === "") ? parts[2] : parts[1];

            if (newChar !== undefined && hexStr !== undefined) {
                let hexCode = parseInt(hexStr.trim().replace('0x', ''), 16);
                if (!isNaN(hexCode)) this.mappings.push({ newChar, hexCode });
            }
        }
        return this.mappings;
    }
};

/**
 * AppController: 交互与渲染控制
 */
const AppController = {
    replacedSet: new Set(),

    init() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM() {
        this.elNftrFile = document.getElementById('nftrFile');
        this.elCsvFile = document.getElementById('csvFile');
        this.elNftrInfo = document.getElementById('nftrInfo');
        this.elLogOutput = document.getElementById('logOutput');
        
        this.elFontFamily = document.getElementById('fontFamily');
        this.btnLoadSysFonts = document.getElementById('btnLoadSysFonts');
        this.elFontSize = document.getElementById('fontSize');
        this.elOffsetX = document.getElementById('offsetX');
        this.elOffsetY = document.getElementById('offsetY');
        
        this.elAlphaThreshold = document.getElementById('alphaThreshold');
        this.elPurePixel = document.getElementById('purePixel');
        this.elFontWeight = document.getElementById('fontWeight');
        this.elFixedWidth = document.getElementById('fixedWidth');

        this.btnProcess = document.getElementById('btnProcess');
        this.btnSave = document.getElementById('btnSave');
        this.btnClearFont = document.getElementById('btnClearFont');
        
        this.canvasContainer = document.getElementById('canvasContainer');
        this.canvasPreview = document.getElementById('previewCanvas');
        this.ctxPreview = this.canvasPreview.getContext('2d');
        this.emptyState = document.getElementById('emptyState');
        this.statusText = document.getElementById('statusText');
        this.statsText = document.getElementById('statsText');
    },

    bindEvents() {
        this.elNftrFile.addEventListener('change', (e) => this.handleNftrUpload(e));
        this.elCsvFile.addEventListener('change', (e) => this.handleCsvUpload(e));
        this.btnLoadSysFonts.addEventListener('click', () => this.loadSystemFonts());
        this.btnProcess.addEventListener('click', () => this.processData());
        this.btnSave.addEventListener('click', () => this.saveFile());
        this.btnClearFont.addEventListener('click', () => this.clearFontData());
        
        let resizeTimer;
        window.addEventListener('resize', () => {
            if (NftrCore.fontU8) {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => this.renderGrid(), 200);
            }
        });
    },

    log(msg) {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        this.elLogOutput.innerHTML += `\n[${time}] ${msg}`;
        this.elLogOutput.scrollTop = this.elLogOutput.scrollHeight;
    },

    async loadSystemFonts() {
        if ('queryLocalFonts' in window) {
            try {
                this.btnLoadSysFonts.textContent = "获取中...";
                const fonts = await window.queryLocalFonts();
                this.elFontFamily.innerHTML = ""; 
                let fontSet = new Set();
                
                fonts.forEach(f => {
                    if (!fontSet.has(f.family)) {
                        fontSet.add(f.family);
                        let opt = document.createElement('option');
                        opt.value = `'${f.family}'`;
                        opt.textContent = f.fullName;
                        this.elFontFamily.appendChild(opt);
                    }
                });
                this.btnLoadSysFonts.textContent = "已获取";
                this.btnLoadSysFonts.disabled = true;
                this.log("成功加载本地系统字体列表。");
            } catch (err) {
                this.log("获取字体失败或被拒绝权限。");
                this.btnLoadSysFonts.textContent = "获取系统字体";
            }
        } else {
            this.log("错误: 浏览器不支持 Local Font Access API。");
            alert("您的浏览器不支持此 API，只能使用内置下拉列表。");
        }
    },

    handleNftrUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        NftrCore.fileName = file.name;
        this.log(`正在读取字库文件: ${file.name}`);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                if (NftrCore.parse(evt.target.result)) {
                    this.elNftrInfo.classList.remove('hidden', 'error');
                    this.elNftrInfo.innerHTML = `✅ 解析成功<br>字模尺寸: ${NftrCore.tileWidth} x ${NftrCore.tileHeight}<br>色彩深度: ${NftrCore.tileBitDepth} bpp`;
                    this.log(`解析成功！尺寸: ${NftrCore.tileWidth}x${NftrCore.tileHeight}, 总字模: ${NftrCore.fontTiles.length}`);
                    
                    this.elFontSize.value = NftrCore.tileHeight;
                    this.replacedSet.clear();
                    this.statsText.textContent = `总字模: ${NftrCore.fontTiles.length} | 已汉化: 0`;
                    
                    this.btnClearFont.disabled = false;
                    this.btnSave.disabled = false;
                    
                    this.renderGrid();
                    this.checkReadyState();
                }
            } catch (err) {
                this.elNftrInfo.classList.remove('hidden');
                this.elNftrInfo.classList.add('error');
                this.elNftrInfo.innerHTML = `❌ ${err.message}`;
                this.log(`读取错误: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    },

    handleCsvUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.log(`正在读取字典文件: ${file.name}`);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const mappings = CsvParser.parse(evt.target.result);
            this.log(`识别到 ${mappings.length} 个汉化替换规则。`);
            this.checkReadyState();
        };
        reader.readAsText(file);
    },

    checkReadyState() {
        if (NftrCore.fontU8 && CsvParser.mappings.length > 0) this.btnProcess.disabled = false;
    },

    clearFontData() {
        if (!confirm("确定要清空字库中的所有字符数据吗？这会将所有字模抹白。")) return;
        
        this.log("==== 开始抹除字库像素 ====");
        for (let i = 0; i < NftrCore.fontTiles.length; i++) {
            NftrCore.fontTiles[i].fill(0);
        }
        
        this.replacedSet.clear();
        this.log(`已成功抹除 ${NftrCore.fontTiles.length} 个字模的像素数据。`);
        this.btnSave.disabled = false;
        
        this.renderGrid();
    },

    isCharSupportedByFont(ctx, char, fontString) {
        const w = NftrCore.tileWidth;
        const h = NftrCore.tileHeight;
        
        ctx.clearRect(0, 0, w, h);
        ctx.font = fontString;
        ctx.fillText('\uFFFF', 0, 0);
        const missingData = ctx.getImageData(0, 0, w, h).data;
        
        ctx.clearRect(0, 0, w, h);
        ctx.fillText(char, 0, 0);
        const charData = ctx.getImageData(0, 0, w, h).data;
        
        for (let i = 3; i < charData.length; i += 4) {
            if (charData[i] !== missingData[i]) return true;
        }
        return false;
    },

    processData() {
        this.statusText.textContent = "正在生成像素...";
        this.log("==== 开始执行批量替换 ====");
        
        const fontName = this.elFontFamily.value;
        const fontSize = parseInt(this.elFontSize.value) || NftrCore.tileHeight;
        const xOff = parseInt(this.elOffsetX.value) || 0;
        const yOff = parseInt(this.elOffsetY.value) || 0;
        const isBold = this.elFontWeight.checked;
        const isFixed = this.elFixedWidth.checked;
        const threshold = parseInt(this.elAlphaThreshold.value) || 160;
        const isPurePixel = this.elPurePixel.checked;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = NftrCore.tileWidth;
        offCanvas.height = NftrCore.tileHeight;
        const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
        ctx.textBaseline = "top";

        const baseFontString = `${isBold ? "bold " : "normal "}${fontSize}px ${fontName}`;
        const fallbackFontString = `${isBold ? "bold " : "normal "}${fontSize}px SimSun`;

        const maxColor = (1 << NftrCore.tileBitDepth) - 1; 
        const pixelsPerByte = 8 / NftrCore.tileBitDepth;

        let missingChars =[];

        for (let mapping of CsvParser.mappings) {
            const targetIndex = NftrCore.tileToCharMap.indexOf(mapping.hexCode);
            if (targetIndex === -1) continue;

            let currentFont = baseFontString;
            if (!this.isCharSupportedByFont(ctx, mapping.newChar, baseFontString)) {
                missingChars.push(mapping.newChar);
                currentFont = fallbackFontString; 
            }

            ctx.clearRect(0, 0, NftrCore.tileWidth, NftrCore.tileHeight);
            ctx.fillStyle = "white"; 
            ctx.font = currentFont;
            ctx.fillText(mapping.newChar, xOff, yOff);

            const imgData = ctx.getImageData(0, 0, NftrCore.tileWidth, NftrCore.tileHeight).data;
            let newBitmap =[];

            for (let i = 0; i < NftrCore.tileWidth * NftrCore.tileHeight; i++) {
                let alpha = imgData[i * 4 + 3]; 
                let colorIdx = 0;
                
                if (NftrCore.tileBitDepth === 1 || isPurePixel) {
                    colorIdx = (alpha >= threshold) ? maxColor : 0;
                } else {
                    if (alpha >= threshold / 2) {
                        colorIdx = Math.round((alpha / 255) * maxColor);
                    }
                }
                newBitmap.push(colorIdx);
            }

            for (let i = 0; i < newBitmap.length; i += pixelsPerByte) {
                let byte = 0;
                for (let j = 0; j < pixelsPerByte; j++) {
                    let color = newBitmap[i + j] || 0;
                    byte |= (color & maxColor) << (8 - (NftrCore.tileBitDepth * (j + 1)));
                }
                NftrCore.fontTiles[targetIndex][i / pixelsPerByte] = byte;
            }

            ctx.font = currentFont; 
            const textWidth = isFixed ? NftrCore.tileWidth : Math.min(Math.ceil(ctx.measureText(mapping.newChar).width), NftrCore.tileWidth);
            NftrCore.fontWidths[targetIndex][0] = 0; 
            NftrCore.fontWidths[targetIndex][1] = textWidth; 
            if (NftrCore.bytesPerWidth === 3) NftrCore.fontWidths[targetIndex][2] = textWidth; 

            this.replacedSet.add(targetIndex);
        }

        if (missingChars.length > 0) {
            this.log(`注意: 发现 ${missingChars.length} 个字符缺失，已降级为 SimSun 渲染。`);
            let displayMissing = missingChars.join('');
            if (displayMissing.length > 200) {
                displayMissing = displayMissing.substring(0, 200) + "...(等共 " + missingChars.length + " 个字)";
            }
            this.log(`缺失字符列表: \n${displayMissing}`);
        } else {
            this.log(`全部字模均被成功渲染！`);
        }

        this.btnSave.disabled = false;
        this.statusText.textContent = "生成完毕";
        this.statsText.textContent = `总字模: ${NftrCore.fontTiles.length} | 已汉化: ${this.replacedSet.size}`;
        this.log(`==== 替换完成！覆盖了 ${this.replacedSet.size} 个字模 ====`);
        
        this.renderGrid();
    },

    renderGrid() {
        this.emptyState.style.display = 'none';
        this.canvasPreview.style.display = 'block';

        const scale = 2; 
        const cellWidth = Math.max((NftrCore.tileWidth * scale) + 15, 45);
        const cellHeight = (NftrCore.tileHeight * scale) + 30; 

        const paddingOffset = 40; 
        const containerWidth = Math.max(this.canvasContainer.clientWidth - paddingOffset, 500); 
        const cols = Math.max(1, Math.floor(containerWidth / cellWidth));
        const totalTiles = NftrCore.fontTiles.length;
        const rows = Math.ceil(totalTiles / cols);

        this.canvasPreview.width = cols * cellWidth;
        this.canvasPreview.height = rows * cellHeight;

        this.ctxPreview.clearRect(0, 0, this.canvasPreview.width, this.canvasPreview.height);
        this.ctxPreview.textBaseline = "top";
        this.ctxPreview.textAlign = "center";

        const maxColor = (1 << NftrCore.tileBitDepth) - 1;
        const pixelsPerByte = 8 / NftrCore.tileBitDepth;

        for (let t = 0; t < totalTiles; t++) {
            const tileData = NftrCore.fontTiles[t];
            const charCode = NftrCore.tileToCharMap[t];
            const isReplaced = this.replacedSet.has(t);
            
            const col = t % cols;
            const row = Math.floor(t / cols);
            const cellX = col * cellWidth;
            const cellY = row * cellHeight;
            
            const drawX = cellX + (cellWidth - (NftrCore.tileWidth * scale)) / 2;
            const drawY = cellY + 5; 

            let p = 0;
            for (let i = 0; i < tileData.length; i++) {
                let byte = tileData[i];
                for (let j = 0; j < pixelsPerByte; j++) {
                    if (p >= NftrCore.tileWidth * NftrCore.tileHeight) break;
                    
                    let colorIdx = (byte >> (8 - (NftrCore.tileBitDepth * (j + 1)))) & maxColor;
                    if (colorIdx > 0) {
                        let alpha = colorIdx / maxColor; 
                        if (isReplaced) {
                            this.ctxPreview.fillStyle = `rgba(210, 63, 71, ${alpha})`;
                        } else {
                            this.ctxPreview.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                        }
                        let px = (p % NftrCore.tileWidth) * scale;
                        let py = Math.floor(p / NftrCore.tileWidth) * scale;
                        this.ctxPreview.fillRect(drawX + px, drawY + py, scale, scale);
                    }
                    p++;
                }
            }

            this.ctxPreview.font = "11px Consolas, monospace";
            this.ctxPreview.fillStyle = isReplaced ? "#d23f47" : "rgba(255, 255, 255, 0.4)";
            let hexStr = charCode !== null ? charCode.toString(16).toUpperCase().padStart(4, '0') : "NULL";
            this.ctxPreview.fillText(hexStr, cellX + cellWidth / 2, drawY + (NftrCore.tileHeight * scale) + 6);
        }
    },

    saveFile() {
        const blob = NftrCore.generateBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "CN_" + NftrCore.fileName;
        document.body.appendChild(a);
        a.click();
        this.log(`导出完成！文件名: CN_${NftrCore.fileName}`);
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    }
};

document.addEventListener('DOMContentLoaded', () => AppController.init());