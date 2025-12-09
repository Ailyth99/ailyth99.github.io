document.addEventListener('DOMContentLoaded', () => {
    
    if (window.innerWidth < 900) {
        document.getElementById('mobileModal').style.display = 'flex';
        document.getElementById('btnCloseModal').onclick = function() {
            document.getElementById('mobileModal').style.display = 'none';
        };
    }

    const dom = {
        text: document.getElementById('textInput'),
        font: document.getElementById('fontSelect'),
        size: document.getElementById('rangeSize'),
        lh: document.getElementById('rangeLineHeight'),
        colText: document.getElementById('colorText'),
        colBg: document.getElementById('colorBg'),
        strokeW: document.getElementById('rangeStroke'),
        fill: document.getElementById('checkFill'),
        italic: document.getElementById('checkItalic'),
        align: document.querySelectorAll('input[name="align"]'),
        effect: document.getElementById('effectType'),
        speed: document.getElementById('rangeSpeed'),
        scale: document.getElementById('rangeScale'),
        freq: document.getElementById('rangeFreq'),
        btnSysFont: document.getElementById('btnLoadSystemFonts'),
        sysStatus: document.getElementById('sysFontStatus'),
        svgText: document.getElementById('svgText'),
        mainSvg: document.getElementById('mainSvg'),
        mainArea: document.querySelector('.main-area'),
        btnRecord: document.getElementById('btnRecord'),
        btnGif: document.getElementById('btnGif'),
        gifStatus: document.getElementById('gifStatus'),
        timerDisplay: document.getElementById('recordTimer'),
        btnExportCode: document.getElementById('btnExportCode'),
        l_size: document.getElementById('valSize'),
        l_lh: document.getElementById('valLineHeight'),
        l_stroke: document.getElementById('valStroke'),
        l_speed: document.getElementById('valSpeed'),
        l_scale: document.getElementById('valScale'),
        l_freq: document.getElementById('valFreq'),
        injectedCSS: document.getElementById('injectedCSS'),
        f_basic: { t: document.querySelector('#filter-basic feTurbulence'), d: document.querySelector('#filter-basic feDisplacementMap') },
        f_glitch: { t: document.querySelector('#filter-glitch feTurbulence'), d: document.querySelector('#filter-glitch feDisplacementMap') },
        f_liquid: { t: document.querySelector('#filter-liquid feTurbulence'), d: document.querySelector('#filter-liquid feDisplacementMap') }
    };

    let lastTime = 0;
    let fpsInterval = 1000 / 12;
    let isRecording = false;
    let mediaRecorder;
    let recordedChunks = [];
    let recordCanvas;
    let recordCtx;
    let recordTimerInt = null;
    let recordScaleFactor = 1; 

    const webSafeFonts = [
        "Arial", "Verdana", "Helvetica", "Tahoma", "Trebuchet MS", "Times New Roman", 
        "Georgia", "Garamond", "Courier New", "Brush Script MT", "Impact"
    ];

    function init() {
        webSafeFonts.forEach(font => {
            const opt = document.createElement('option');
            opt.value = `'${font}', sans-serif`;
            opt.textContent = font;
            dom.font.appendChild(opt);
        });
        bindEvents();
        updateRender();
        startAnimation();
    }

    async function loadSystemFonts() {
        if (!('queryLocalFonts' in window)) {
            dom.sysStatus.textContent = "浏览器不支持";
            return;
        }
        try {
            dom.sysStatus.textContent = "请求权限中...";
            const fonts = await window.queryLocalFonts();
            dom.sysStatus.textContent = `已加载 ${fonts.length} 个字体`;
            const unique = [...new Set(fonts.map(f => f.family))].sort();
            const sep = document.createElement('option');
            sep.disabled = true; sep.textContent = "--- 系统字体 ---";
            dom.font.appendChild(sep);
            unique.forEach(f => {
                const opt = document.createElement('option');
                opt.value = `"${f}"`; opt.textContent = f;
                dom.font.appendChild(opt);
            });
            dom.btnSysFont.style.display = 'none';
        } catch (err) { console.error(err); dom.sysStatus.textContent = "加载失败"; }
    }

    function updateRender() {
        dom.l_size.textContent = `${dom.size.value}px`;
        dom.l_lh.textContent = dom.lh.value;
        dom.l_stroke.textContent = `${dom.strokeW.value}px`;
        dom.l_speed.textContent = dom.speed.value;
        dom.l_scale.textContent = dom.scale.value;
        dom.l_freq.textContent = dom.freq.value;

        const txt = dom.text.value;
        const lines = txt.split('\n');
        const fs = parseInt(dom.size.value);
        const lh = parseFloat(dom.lh.value);
        const fontName = dom.font.value;
        
        dom.svgText.innerHTML = '';
        dom.svgText.style.fontFamily = fontName;
        dom.svgText.style.fontSize = `${fs}px`;
        dom.svgText.style.stroke = dom.colText.value;
        dom.svgText.style.strokeWidth = dom.strokeW.value;
        dom.svgText.style.fill = dom.fill.checked ? dom.colText.value : 'transparent';
        dom.svgText.style.fontStyle = dom.italic.checked ? 'italic' : 'normal';
        dom.mainArea.style.backgroundColor = dom.colBg.value;

        dom.injectedCSS.textContent = `text { font-family: ${fontName}; }`;

        let alignVal = 'middle';
        dom.align.forEach(r => { if(r.checked) alignVal = r.value; });
        dom.svgText.setAttribute('text-anchor', alignVal);
        
        let xPos = "50%";
        if(alignVal === 'start') xPos = "5%";
        if(alignVal === 'end') xPos = "95%";

        const offset = (lines.length - 1) * lh / 2;
        
        lines.forEach((line, i) => {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.textContent = line;
            tspan.setAttribute("x", xPos);
            tspan.setAttribute("dy", i === 0 ? `-${offset}em` : `${lh}em`);
            dom.svgText.appendChild(tspan);
        });

        const type = dom.effect.value;
        dom.svgText.style.filter = `url(#${type})`;

        fpsInterval = 1000 / parseInt(dom.speed.value);

        const s = dom.scale.value;
        const f = dom.freq.value;
        if (type === 'filter-basic') { dom.f_basic.d.setAttribute('scale', s); dom.f_basic.t.setAttribute('baseFrequency', f); }
        if (type === 'filter-glitch') { dom.f_glitch.d.setAttribute('scale', s*2); dom.f_glitch.t.setAttribute('baseFrequency', `${f} 0.001`); }
        if (type === 'filter-liquid') { dom.f_liquid.d.setAttribute('scale', s*3); dom.f_liquid.t.setAttribute('baseFrequency', f/2); }
    }

    function startAnimation() {
        function frame(timestamp) {
            requestAnimationFrame(frame);
            const elapsed = timestamp - lastTime;
            if (elapsed < fpsInterval) return;
            lastTime = timestamp - (elapsed % fpsInterval);

            const seed = Math.floor(Math.random() * 1000);
            const type = dom.effect.value;
            if (type === 'filter-basic') dom.f_basic.t.setAttribute('seed', seed);
            if (type === 'filter-glitch') dom.f_glitch.t.setAttribute('seed', seed);
            if (type === 'filter-liquid') dom.f_liquid.t.setAttribute('seed', seed);

            if (isRecording && recordCtx) {
                drawFrameToRecord();
            }
        }
        requestAnimationFrame(frame);
    }

    function drawFrameToRecord() {
        let svgData = new XMLSerializer().serializeToString(dom.mainSvg);
        const rect = dom.mainSvg.getBoundingClientRect();
        const targetW = rect.width * recordScaleFactor;
        const targetH = rect.height * recordScaleFactor;

        const fontName = dom.font.value;
        const styleBlock = `<style>text { font-family: ${fontName}; }</style>`;
        
        svgData = svgData.replace('<style id="injectedCSS">', styleBlock + '<style id="ignore">');
        const header = `<svg id="mainSvg" width="${targetW}" height="${targetH}" viewBox="0 0 ${rect.width} ${rect.height}"`;
        svgData = svgData.replace('<svg id="mainSvg"', header);

        const blob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const img = new Image();
        
        img.onload = () => {
            recordCtx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
            recordCtx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    function toggleRecord() {
        if (!isRecording) startRecord();
        else stopRecord();
    }

    function startRecord() {
        isRecording = true;
        recordedChunks = [];
        dom.btnRecord.innerHTML = "⏹️ 停止录制";
        dom.btnRecord.classList.add('recording');
        dom.timerDisplay.style.visibility = 'visible';
        
        const startTime = Date.now();
        dom.timerDisplay.textContent = "00:00";
        recordTimerInt = setInterval(() => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const m = String(Math.floor(diff / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            dom.timerDisplay.textContent = `${m}:${s}`;
        }, 1000);

        const rect = dom.mainSvg.getBoundingClientRect();
        recordCanvas = document.createElement('canvas');
        recordCanvas.width = rect.width * recordScaleFactor;
        recordCanvas.height = rect.height * recordScaleFactor;
        recordCtx = recordCanvas.getContext('2d');

        const stream = recordCanvas.captureStream(30);
        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
        mediaRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10000000 });
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = saveVideo;
        mediaRecorder.start();
    }

    function stopRecord() {
        isRecording = false;
        mediaRecorder.stop();
        clearInterval(recordTimerInt);
        dom.btnRecord.innerHTML = "🔴 开始录制 (WebM)";
        dom.btnRecord.classList.remove('recording');
        setTimeout(() => {
            dom.timerDisplay.style.visibility = 'hidden';
            dom.timerDisplay.textContent = "00:00";
        }, 2000);
    }

    function saveVideo() {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `jitter_text_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    }

    async function generateGif() {
        if (typeof GIF === 'undefined') {
            alert("未检测到 gif.js！");
            return;
        }

        dom.btnGif.disabled = true;
        dom.gifStatus.style.display = 'block';
        dom.gifStatus.textContent = "初始化...";

        try {
            const rect = dom.mainSvg.getBoundingClientRect();
            const width = Math.floor(rect.width);
            const height = Math.floor(rect.height);

            const gif = new GIF({
                workers: 2,
                quality: 10,
                width: width,
                height: height,
                workerScript: 'gif.worker.js',
                transparent: 0x000000
            });

            const type = dom.effect.value;
            const scale = dom.scale.value;
            const freq = dom.freq.value;
            const fontName = dom.font.value;
            
            const filterIds = [];
            let filtersDefHTML = '';

            for(let i=0; i<5; i++) {
                const seed = Math.floor(Math.random() * 999);
                let content = '';
                if (type === 'filter-basic') {
                    content = `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale}" />`;
                } else if (type === 'filter-glitch') {
                    content = `<feTurbulence type="turbulence" baseFrequency="${freq} 0.001" numOctaves="2" seed="${seed}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale*2}" />`;
                } else {
                    content = `<feTurbulence type="turbulence" baseFrequency="${freq/2}" numOctaves="2" seed="${seed}" result="noise"/><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/><feDisplacementMap in="blur" in2="noise" scale="${scale*3}" />`;
                }
                const id = `gif_f${i}`;
                filterIds.push(id);
                filtersDefHTML += `<filter id="${id}">${content}</filter>`;
            }

            const textNode = dom.svgText.cloneNode(true);
            textNode.removeAttribute('style');
            
            for (let i = 0; i < filterIds.length; i++) {
                dom.gifStatus.textContent = `渲染第 ${i + 1} / 5 帧`;

                textNode.style.filter = `url(#${filterIds[i]})`;
                textNode.style.fontFamily = fontName;
                textNode.style.fontSize = `${dom.size.value}px`;
                textNode.style.fill = dom.fill.checked ? dom.colText.value : 'none';
                textNode.style.stroke = dom.colText.value;
                textNode.style.strokeWidth = dom.strokeW.value;
                textNode.style.fontStyle = dom.italic.checked ? 'italic' : 'normal';

                const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
        <style>text { font-family: ${fontName}; }</style>
        ${filtersDefHTML}
    </defs>
    ${textNode.outerHTML}
</svg>`;

                const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
                const url = URL.createObjectURL(blob);

                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0);
                        gif.addFrame(ctx, {delay: 100});
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = url;
                });
            }

            dom.gifStatus.textContent = "编码中...";
            
            gif.on('finished', function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = `jitter_text_${Date.now()}.gif`;
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(url);
                
                dom.btnGif.disabled = false;
                dom.gifStatus.style.display = 'none';
            });

            gif.render();

        } catch (e) {
            console.error(e);
            alert("生成失败: " + e.message);
            dom.btnGif.disabled = false;
            dom.gifStatus.style.display = 'none';
        }
    }

    function generateAnimatedSVG() {
        const rect = dom.mainSvg.getBoundingClientRect();
        const type = dom.effect.value;
        const scale = dom.scale.value;
        const freq = dom.freq.value;
        const speed = 1 / (parseInt(dom.speed.value) / 5);
        const fontName = dom.font.value.replace(/'/g, "").replace(/"/g, "");
        
        let filters = '';
        for(let i=0; i<5; i++) {
            const seed = Math.floor(Math.random() * 999);
            let content = '';
            if (type === 'filter-basic') {
                content = `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale}" />`;
            } else if (type === 'filter-glitch') {
                content = `<feTurbulence type="turbulence" baseFrequency="${freq} 0.001" numOctaves="2" seed="${seed}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${scale*2}" />`;
            } else {
                content = `<feTurbulence type="turbulence" baseFrequency="${freq/2}" numOctaves="2" seed="${seed}" result="noise"/><feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/><feDisplacementMap in="blur" in2="noise" scale="${scale*3}" />`;
            }
            filters += `<filter id="f${i}">${content}</filter>`;
        }

        const textNode = dom.svgText.cloneNode(true);
        textNode.removeAttribute('style');
        textNode.setAttribute('class', 'jitter-text');

        const svgOutput = `
<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}" viewBox="0 0 ${rect.width} ${rect.height}">
  <defs>
    <style>
      .jitter-text {
        font-family: '${fontName}', sans-serif;
        font-size: ${dom.size.value}px;
        fill: ${dom.fill.checked ? dom.colText.value : 'none'};
        stroke: ${dom.colText.value};
        stroke-width: ${dom.strokeW.value};
        font-style: ${dom.italic.checked ? 'italic' : 'normal'};
        text-anchor: ${dom.svgText.getAttribute('text-anchor')};
        dominant-baseline: middle;
        animation: jitterAnim ${speed}s steps(1) infinite;
      }
      @keyframes jitterAnim {
        0% { filter: url(#f0); }
        20% { filter: url(#f1); }
        40% { filter: url(#f2); }
        60% { filter: url(#f3); }
        80% { filter: url(#f4); }
        100% { filter: url(#f0); }
      }
    </style>
    ${filters}
  </defs>
  ${textNode.outerHTML}
</svg>`;
        return svgOutput;
    }

    function bindEvents() {
        const inputs = [
            dom.text, dom.font, dom.size, dom.lh, dom.colText, dom.colBg, 
            dom.strokeW, dom.fill, dom.italic, dom.effect, dom.speed, dom.scale, dom.freq
        ];
        inputs.forEach(el => el.addEventListener('input', updateRender));
        dom.align.forEach(el => el.addEventListener('change', updateRender));
        dom.btnSysFont.addEventListener('click', loadSystemFonts);
        dom.btnRecord.addEventListener('click', toggleRecord);
        dom.btnGif.addEventListener('click', generateGif);
        dom.btnExportCode.addEventListener('click', () => {
            const code = generateAnimatedSVG();
            const blob = new Blob([code], {type: "image/svg+xml;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `jitter_text_${Date.now()}.svg`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    init();
});