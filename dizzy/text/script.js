// Utility function for alerts (consistent messaging)
function showCopyAlert(message) {
    alert(message + ' 已复制到剪贴板 ✨');
}
function showNoCopyAlert() {
    alert('没有结果可以复制 🤔');
}


// --- Vertical Converter ---
const verticalConverter = {
    convert() {
        const inputEl = document.querySelector('#vertical-content .input');
        const outputEl = document.querySelector('#vertical-content .output');
        const formatEl = document.querySelector('#vertical-content input[name="verticalFormat"]:checked');
        if (!inputEl || !outputEl || !formatEl) return; // Element check

        const input = inputEl.value;
        const format = formatEl.value;
        let output;
        if (format === 'single_line') { output = input.replace(/[\n\r]/g, ' ').replace(/\s+/g, '').trim(); }
        else { output = input.replace(/ +/g, '').split('').join('\n'); }
        this.setOutput(output);
    },
    copyOutput() {
        const output = this.getOutput();
        if (!output || !output.value) { showNoCopyAlert(); return; }
        output.select(); document.execCommand('copy'); showCopyAlert('转换结果');
    },
    getInput() { return document.querySelector('#vertical-content .input')?.value ?? ''; }, // Added null check
    getOutput() { return document.querySelector('#vertical-content .output'); },
    setOutput(value) {
        const outputEl = this.getOutput();
        if (outputEl) outputEl.value = value;
        this.updateCharCount();
    },
    updateCharCount() {
        const input = this.getInput();
        const outputEl = this.getOutput();
        const output = outputEl ? outputEl.value : '';
        const inputCounter = document.querySelector('#vertical-content .input')?.nextElementSibling; // Added null check
        const outputCounter = outputEl?.nextElementSibling; // Added null check

        if (inputCounter && inputCounter.classList.contains('char-counter')) {
            inputCounter.querySelector('.total').textContent = input.length;
            inputCounter.querySelector('.no-space').textContent = input.replace(/[\s\r\n]+/g, '').length;
        }
         if (outputCounter && outputCounter.classList.contains('char-counter')) {
            outputCounter.querySelector('.total').textContent = output.length;
            outputCounter.querySelector('.no-space').textContent = output.replace(/[\s\r\n]+/g, '').length;
        }
    }
};

// --- Frequency Analyzer ---
const frequencyAnalyzer = {
    internetFrequencyMap: new Map(), // Stores char -> rank

    init() {
        // 初始化互联网频率映射表
        // CHINESE_INTERNET_FREQUENCY_STRING is expected to be a global variable
        // defined in frequency_data.js
        if (typeof CHINESE_INTERNET_FREQUENCY_STRING !== 'undefined' && CHINESE_INTERNET_FREQUENCY_STRING.length > 0) {
            for (let i = 0; i < CHINESE_INTERNET_FREQUENCY_STRING.length; i++) {
                const char = CHINESE_INTERNET_FREQUENCY_STRING[i];
                // If the frequency string has duplicates, the first occurrence (higher rank) is used.
                if (!this.internetFrequencyMap.has(char)) {
                    this.internetFrequencyMap.set(char, i); // char -> rank (index)
                }
            }
            //console.log(`互联网汉字频率表已从 frequency_data.js 初始化，包含 ${this.internetFrequencyMap.size} 个唯一字符。`);
        } else {
            console.warn("全局变量 CHINESE_INTERNET_FREQUENCY_STRING 未定义。");
        }
    },

    analyze() {
        const input = this.getInput();
        const formatEl = document.querySelector('#frequency-content input[name="frequencyFormat"]:checked');
        if (!formatEl) return;

        const format = formatEl.value;
        let results;

        if (format === 'internet_frequency') {
            if (this.internetFrequencyMap.size === 0) {
                alert("错误：互联网频率数据未加载或为空");
                this.setOutput('');
                this.updateUniqueCharCount(0);
                return;
            }
            // 1. Input text, remove duplicates
            const uniqueCharsInput = [...new Set(input.replace(/[\s\r\n]+/g, '').split(''))];

            // 2. Compare with frequency database and sort
            results = uniqueCharsInput.sort((a, b) => {
                const rankA = this.internetFrequencyMap.has(a) ? this.internetFrequencyMap.get(a) : Infinity; // Unfound chars go to the end
                const rankB = this.internetFrequencyMap.has(b) ? this.internetFrequencyMap.get(b) : Infinity;

                if (rankA !== rankB) {
                    return rankA - rankB; // Sort by rank ascending (lower rank = more frequent)
                }
                // If ranks are the same (e.g., both Infinity, or a tie in hypothetical perfect data), sort by Unicode
                return a.localeCompare(b);
            }).join('\n'); // 3. Output: one char per line

            this.setOutput(results);
            this.updateUniqueCharCount(uniqueCharsInput.length);

        } else { // Original logic for frequency based on input text
            const charMap = new Map();
            const cleanedInputChars = input.replace(/[\s\r\n]+/g, '').split('');
            cleanedInputChars.forEach(char => { charMap.set(char, (charMap.get(char) || 0) + 1); });

            // Sort by frequency (desc), then by character (locale)
            const sortedEntries = [...charMap.entries()].sort((a, b) => {
                 const freqDiff = b[1] - a[1];
                 if (freqDiff !== 0) return freqDiff;
                 return a[0].localeCompare(b[0]);
            });

            if (format === 'with_count') {
                results = sortedEntries.map(([char, count]) => `${char},${count}`).join('\n');
            } else { // 'only_chars'
                results = sortedEntries.map(([char]) => char).join('\n');
            }
            this.setOutput(results);
            this.updateUniqueCharCount(charMap.size);
        }
    },
    copyOutput() {
        const output = this.getOutput();
        if (!output || !output.value) { showNoCopyAlert(); return; }
        output.select(); document.execCommand('copy'); showCopyAlert('分析结果');
    },
    getInput() { return document.querySelector('#frequency-content .input')?.value ?? ''; },
    getOutput() { return document.querySelector('#frequency-content .output'); },
    setOutput(value) {
        const outputEl = this.getOutput();
        if (outputEl) outputEl.value = value;
        this.updateCharCount();
     },
    updateCharCount() {
        const input = this.getInput();
        const outputEl = this.getOutput();
        const output = outputEl ? outputEl.value : '';
        const inputCounter = document.querySelector('#frequency-content .input')?.nextElementSibling;
        const outputCounter = outputEl?.nextElementSibling;

         if(inputCounter && inputCounter.classList.contains('char-counter')) {
            inputCounter.querySelector('.total').textContent = input.length;
            inputCounter.querySelector('.no-space').textContent = input.replace(/[\s\r\n]+/g, '').length;
         }
        if (outputCounter && outputCounter.classList.contains('char-counter')) {
             outputCounter.querySelector('.total').textContent = output.length;
             outputCounter.querySelector('.no-space').textContent = output.replace(/[\s\r\n]+/g, '').length;
        }
    },
    updateUniqueCharCount(count) {
        const freqContentDiv = document.getElementById('frequency-content'); // Get parent of button group
        const buttonGroup = document.querySelector('#frequency-content .button-group');
        let charTypeCounter = document.querySelector('#frequency-content .char-type-counter');

        if (!charTypeCounter && buttonGroup && freqContentDiv) {
            charTypeCounter = document.createElement('div');
            charTypeCounter.className = 'char-type-counter';
            charTypeCounter.style.cssText = 'margin-top: 10px; text-align: right; color: #e6b3cc; font-size: 0.9em;';
            // Insert before the button group within the frequency-content div
            freqContentDiv.insertBefore(charTypeCounter, buttonGroup);
        }

        if (charTypeCounter) {
            const formatEl = document.querySelector('#frequency-content input[name="frequencyFormat"]:checked');
            const currentFormat = formatEl ? formatEl.value : '';
            let labelText = "处理后字符种类：";

            if (currentFormat === 'internet_frequency') {
                 labelText = `输入文本去重后字符种类：`;
            } else if (currentFormat === 'with_count' || currentFormat === 'only_chars') {
                 labelText = `输入文本统计后字符种类：`;
            }
            charTypeCounter.textContent = `${labelText}${count}`;
        }
    }
};

// --- SHIFT-JIS Converter ---
const sjisConverter = {
    convert() {
        const input = this.getInput();
        const formatEl = document.querySelector('#sjis-content input[name="sjisFormat"]:checked');
         if (!formatEl) return;
        const format = formatEl.value;
        const unmatchedChars = new Set();
        const results = [];

        if (typeof sjisMapping === 'undefined') {
            alert("错误：SHIFT-JIS 映射表 (sjismap.js) 未加载！");
            this.setOutput('');
            this.setDebugOutput('SJIS Map Error');
            return;
        }

        for (const char of input) {
            if (char === '\n' || char === '\r') continue;
            const code = sjisMapping.get(char);
            if (code) {
                switch(format) {
                    case 'code': results.push(code); break;
                    case 'char_code': results.push(`${char},${code}`); break;
                    case 'code_char': results.push(`${code},${char}`); break;
                }
            } else if (char.trim()) {
                unmatchedChars.add(char);
            }
        }
        this.setOutput(results.join('\n'));
        this.setDebugOutput(Array.from(unmatchedChars).join(''));
    },
    copyOutput() {
        const output = this.getOutput();
        if (!output || !output.value) {
             // Check debug output only if main output is empty
             const debugOutput = this.getDebugOutput();
             if (!debugOutput || !debugOutput.value) {
                 showNoCopyAlert();
                 return;
             }
             alert('转换结果为空，未复制。'); // Don't copy debug output automatically
             return;
        }
        output.select();
        document.execCommand('copy');
        showCopyAlert('转换结果');
    },
    getInput() { return document.querySelector('#sjis-content .input')?.value ?? ''; },
    getOutput() { return document.querySelector('#sjis-content .output'); },
    getDebugOutput() { return document.querySelector('#sjis-content .debug-output'); },
    setOutput(value) {
        const outputEl = this.getOutput();
        if(outputEl) outputEl.value = value;
    },
    setDebugOutput(value) {
         const debugEl = this.getDebugOutput();
         if(debugEl) debugEl.value = value;
    }
};

// --- Font Tester ---
const fontTester = {
    loadFontsBtn: null, fontSelect: null, testInput: null, preview: null,
    fontSize: null, fontColor: null, fontControls: null, fontSizeDisplay: null,

    init() {
        this.loadFontsBtn = document.getElementById('loadFontsBtn');
        this.fontSelect = document.getElementById('fontSelect');
        this.testInput = document.getElementById('testInput');
        this.preview = document.getElementById('preview');
        this.fontSize = document.getElementById('fontSize');
        this.fontColor = document.getElementById('fontColor');
        this.fontControls = document.querySelector('#font-content .font-controls');
        this.fontSizeDisplay = document.getElementById('fontSizeDisplay');

        // Check if all essential elements exist
        if (!this.loadFontsBtn || !this.fontSelect || !this.testInput || !this.preview || !this.fontSize || !this.fontColor || !this.fontControls || !this.fontSizeDisplay) {
             console.warn("Font Tester elements missing. Skipping initialization.");
             // Hide related controls if elements are missing
             if(this.loadFontsBtn) this.loadFontsBtn.style.display = 'none';
             if(document.querySelector('#font-content .controls')) {
                 document.querySelector('#font-content .controls').style.display = 'none';
             }
             return;
        }

        this.bindEvents();
        this.updatePreview();
    },
    bindEvents() {
        this.loadFontsBtn.addEventListener('click', async () => {
            // Check for Font Access API support
            if (!navigator.fonts || typeof navigator.fonts.query !== 'function') {
                 alert('抱歉，您的浏览器不支持本地字体访问 API。\n无法加载系统字体列表。');
                 this.loadFontsBtn.disabled = true; // Disable button if API not supported
                 return;
             }
            this.loadFontsBtn.textContent = '加载中...';
            this.loadFontsBtn.disabled = true;

            try {
                const availableFonts = await navigator.fonts.query();
                // Use a Set to get unique family names, then sort
                const fontFamilies = [...new Set(availableFonts.map(font => font.family))].sort((a, b) => a.localeCompare(b));

                this.fontSelect.innerHTML = '<option value="">选择字体...</option>'; // Clear previous options
                fontFamilies.forEach(family => {
                    const option = document.createElement('option');
                    option.value = family;
                    option.textContent = family;
                     // Attempt to set the font-family for the option itself for better preview
                    try { option.style.fontFamily = `"${family}"`; } catch (e) { /* Ignore errors for problematic font names */ }
                    this.fontSelect.appendChild(option);
                });
                this.fontSelect.style.display = 'block';
                this.fontControls.style.display = 'flex'; // Show controls like size/color
                this.loadFontsBtn.style.display = 'none'; // Hide button after success
            } catch (err) {
                console.error('Error loading system fonts:', err);
                alert('加载系统字体时出错。请检查浏览器控制台获取详细信息。\n可能是权限问题或 API 错误。');
                this.loadFontsBtn.textContent = '加载字体失败'; // Update button text
                this.loadFontsBtn.disabled = false; // Re-enable button on error
            }
        });

        this.fontSelect.addEventListener('change', this.updatePreview.bind(this));
        this.fontSize.addEventListener('input', () => {
            this.fontSizeDisplay.textContent = `${this.fontSize.value}像素`;
            this.updatePreview();
        });
        this.fontColor.addEventListener('input', this.updatePreview.bind(this));
        this.testInput.addEventListener('input', this.updatePreview.bind(this));
    },
    updatePreview() {
         if (!this.preview || !this.fontSelect || !this.fontSize || !this.fontColor || !this.testInput) {
             return; // Element check
         }
        const selectedFont = this.fontSelect.value;
        const fontSize = this.fontSize.value;
        const fontColor = this.fontColor.value;
        const text = this.testInput.value;

        // Use CSS.escape potentially for fonts with special characters, though quotes often suffice
        // const safeFontFamily = selectedFont ? `"${CSS.escape(selectedFont)}", sans-serif` : 'Arial, sans-serif';
        const safeFontFamily = selectedFont ? `"${selectedFont}", Arial, sans-serif` : 'Arial, sans-serif'; // Add fallback

        this.preview.style.fontFamily = safeFontFamily;
        this.preview.style.fontSize = `${fontSize}px`;
        this.preview.style.color = fontColor;
        this.preview.textContent = text;
    }
};


// --- Text Sorter ---
const textSorter = {
    sort() {
        const input = this.getInput();
        const methodEl = document.querySelector('#sort-content input[name="sortMethod"]:checked');
        if (!methodEl) return;
        const method = methodEl.value;
        let output;
        const charsToSort = input.replace(/[\s\r\n]+/g, '').split('');

        switch (method) {
            case 'alphabetical':
                output = charsToSort.sort((a, b) => a.localeCompare(b)).join('');
                break;
            case 'frequency':
                const map = new Map();
                charsToSort.forEach(c => map.set(c, (map.get(c) || 0) + 1));
                output = charsToSort.sort((a, b) => {
                    const freqDiff = map.get(b) - map.get(a);
                    if (freqDiff !== 0) return freqDiff;
                    return a.localeCompare(b);
                }).join('');
                break;
            case 'unicode':
                output = charsToSort.sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join(''); // Use codePointAt for better Unicode support
                break;
            default:
                output = charsToSort.join('');
        }
        this.setOutput(output);
    },
    shuffle() {
         const input = this.getInput();
         const charsToShuffle = input.replace(/[\s\r\n]+/g, '').split('');
         for (let i = charsToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [charsToShuffle[i], charsToShuffle[j]] = [charsToShuffle[j], charsToShuffle[i]];
         }
         this.setOutput(charsToShuffle.join(''));
    },
    copyOutput() {
        const output = this.getOutput();
        if (!output || !output.value) { showNoCopyAlert(); return; }
        output.select(); document.execCommand('copy'); showCopyAlert('排序/打乱结果');
    },
    getInput() { return document.querySelector('#sort-content .input')?.value ?? ''; },
    getOutput() { return document.querySelector('#sort-content .output'); },
    setOutput(value) {
         const outputEl = this.getOutput();
         if(outputEl) outputEl.value = value;
         this.updateCharCount();
    },
    updateCharCount() {
        const input = this.getInput();
        const outputEl = this.getOutput();
        const output = outputEl ? outputEl.value : '';
        const inputCounter = document.querySelector('#sort-content .input')?.nextElementSibling;
        const outputCounter = outputEl?.nextElementSibling;

        if (inputCounter?.classList.contains('char-counter')) {
            inputCounter.querySelector('.total').textContent = input.length;
            inputCounter.querySelector('.no-space').textContent = input.replace(/[\s\r\n]+/g, '').length;
        }
        if (outputCounter?.classList.contains('char-counter')) {
            outputCounter.querySelector('.total').textContent = output.length;
            outputCounter.querySelector('.no-space').textContent = output.length;
        }
    }
};

// --- Text Cropper ---
const textCropper = {
    crop() {
        const originalText = this.getOriginalText();
        const charactersToCrop = this.getCharactersToCrop();

        if (!charactersToCrop) {
            this.setOutput(originalText);
            return;
        }
        try {
            const escapedChars = charactersToCrop.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`[${escapedChars}]`, 'gu'); // Add 'u' flag for unicode
             this.setOutput(originalText.replace(regex, ''));
        } catch (e) {
             console.error("Error creating regex for cropping:", e);
             alert("裁剪字符中包含无效的正则表达式模式。");
             this.setOutput(originalText); // Reset output on error
        }
    },
    copyOutput() {
        const output = document.querySelector('#crop-content .output');
        if (!output || !output.value) { showNoCopyAlert(); return; }
        output.select(); document.execCommand('copy'); showCopyAlert('裁剪结果');
    },
    getOriginalText() { return document.querySelector('#crop-content .input:nth-of-type(1)')?.value ?? ''; },
    getCharactersToCrop() { return document.querySelectorAll('#crop-content .input')[1]?.value ?? ''; },
    setOutput(value) {
        const outputEl = document.querySelector('#crop-content .output');
         if (outputEl) outputEl.value = value;
         this.updateCharCount();
    },
    updateCharCount() {
         const originalText = this.getOriginalText();
         const cropChars = this.getCharactersToCrop();
         const outputEl = document.querySelector('#crop-content .output');
         const output = outputEl ? outputEl.value : '';
         const originalCounter = document.querySelector('#crop-content .input:nth-of-type(1)')?.nextElementSibling;
         const cropCounter = document.querySelectorAll('#crop-content .input')[1]?.nextElementSibling;
         const outputCounter = outputEl?.nextElementSibling;

         if (originalCounter?.classList.contains('char-counter')) {
             originalCounter.querySelector('.total').textContent = originalText.length;
             originalCounter.querySelector('.no-space').textContent = originalText.replace(/[\s\r\n]+/g, '').length;
         }
         if (cropCounter?.classList.contains('char-counter')) {
             cropCounter.querySelector('.total').textContent = cropChars.length;
             cropCounter.querySelector('.no-space').textContent = cropChars.replace(/[\s\r\n]+/g, '').length;
         }
         if (outputCounter?.classList.contains('char-counter')) {
             outputCounter.querySelector('.total').textContent = output.length;
             outputCounter.querySelector('.no-space').textContent = output.replace(/[\s\r\n]+/g, '').length;
         }
    }
};

// --- Text Comparer ---
const textComparer = {
    compare() {
        const text1 = this.getText1();
        const text2 = this.getText2();

        const set1 = new Set(text1.replace(/[\s\r\n]+/g, ''));
        const set2 = new Set(text2.replace(/[\s\r\n]+/g, ''));

        const commonChars = [...set1].filter(char => set2.has(char)).sort((a, b) => a.localeCompare(b)).join('');
        const onlyInText1 = [...set1].filter(char => !set2.has(char)).sort((a, b) => a.localeCompare(b)).join('');
        const onlyInText2 = [...set2].filter(char => !set1.has(char)).sort((a, b) => a.localeCompare(b)).join('');

        this.setCommonChars(commonChars);
        this.setOnlyInText1(onlyInText1);
        this.setOnlyInText2(onlyInText2);
    },
    getText1() { return document.querySelector('#compare-content .input:nth-of-type(1)')?.value ?? ''; },
    getText2() { return document.querySelectorAll('#compare-content .input')[1]?.value ?? ''; },
    setCommonChars(value) {
        const el = document.querySelectorAll('#compare-content .output')[0];
        if (el) el.value = value;
        this.updateCharCount(); // Update counts after setting value
    },
    setOnlyInText1(value) {
        const el = document.querySelectorAll('#compare-content .output')[1];
        if (el) el.value = value;
        this.updateCharCount();
     },
    setOnlyInText2(value) {
         const el = document.querySelectorAll('#compare-content .output')[2];
         if (el) el.value = value;
         this.updateCharCount();
    },
    updateCharCount() {
         const text1 = this.getText1();
         const text2 = this.getText2();
         const text1Counter = document.querySelector('#compare-content .input:nth-of-type(1)')?.nextElementSibling;
         const text2Counter = document.querySelectorAll('#compare-content .input')[1]?.nextElementSibling;

         if (text1Counter?.classList.contains('char-counter')) {
            text1Counter.querySelector('.total').textContent = text1.length;
            text1Counter.querySelector('.no-space').textContent = text1.replace(/[\s\r\n]+/g, '').length;
         }
          if (text2Counter?.classList.contains('char-counter')) {
            text2Counter.querySelector('.total').textContent = text2.length;
            text2Counter.querySelector('.no-space').textContent = text2.replace(/[\s\r\n]+/g, '').length;
         }

         const outputs = document.querySelectorAll('#compare-content .output');
         outputs.forEach((outputEl) => {
             const total = outputEl.value.length;
             const counter = outputEl.nextElementSibling;
             if(counter?.classList.contains('char-counter')) {
                 counter.querySelector('.total').textContent = total;
                 counter.querySelector('.no-space').textContent = total; // Output is already no-space in this case
             }
         });
    }
};

// --- Half/Full Width Converter ---
const widthConverter = {
     halfToFullMap: { /* ... map content remains the same ... */
         ' ': '　', '!': '！', '"': '＂', '#': '＃', '$': '＄', '%': '％', '&': '＆', "'": '＇',
         '(': '（', ')': '）', '*': '＊', '+': '＋', ',': '，', '-': '－', '.': '．', '/': '／',
         '0': '０', '1': '１', '2': '２', '3': '３', '4': '４', '5': '５', '6': '６', '7': '７', '8': '８', '9': '９',
         ':': '：', ';': '；', '<': '＜', '=': '＝', '>': '＞', '?': '？', '@': '＠',
         'A': 'Ａ', 'B': 'Ｂ', 'C': 'Ｃ', 'D': 'Ｄ', 'E': 'Ｅ', 'F': 'Ｆ', 'G': 'Ｇ', 'H': 'Ｈ', 'I': 'Ｉ', 'J': 'Ｊ', 'K': 'Ｋ', 'L': 'Ｌ', 'M': 'Ｍ', 'N': 'Ｎ', 'O': 'Ｏ', 'P': 'Ｐ', 'Q': 'Ｑ', 'R': 'Ｒ', 'S': 'Ｓ', 'T': 'Ｔ', 'U': 'Ｕ', 'V': 'Ｖ', 'W': 'Ｗ', 'X': 'Ｘ', 'Y': 'Ｙ', 'Z': 'Ｚ',
         '[': '［', '\\': '＼', ']': '］', '^': '＾', '_': '＿', '`': '｀',
         'a': 'ａ', 'b': 'ｂ', 'c': 'ｃ', 'd': 'ｄ', 'e': 'ｅ', 'f': 'ｆ', 'g': 'ｇ', 'h': 'ｈ', 'i': 'ｉ', 'j': 'ｊ', 'k': 'ｋ', 'l': 'ｌ', 'm': 'ｍ', 'n': 'ｎ', 'o': 'ｏ', 'p': 'ｐ', 'q': 'ｑ', 'r': 'ｒ', 's': 'ｓ', 't': 'ｔ', 'u': 'ｕ', 'v': 'ｖ', 'w': 'ｗ', 'x': 'ｘ', 'y': 'ｙ', 'z': 'ｚ',
         '{': '｛', '|': '｜', '}': '｝', '~': '～',
         '｡': '。', '｢': '「', '｣': '」', '､': '、', '･': '・', 'ｰ': 'ー', 'ﾞ': '゛', 'ﾟ': '゜'
      },
     fullToHalfMap: null,

     init() {
        this.fullToHalfMap = Object.fromEntries(Object.entries(this.halfToFullMap).map(([k, v]) => [v, k]));
     },

    convertToFull() {
        const input = this.getInput();
        let output = '';
        for (const char of input) {
            output += this.halfToFullMap[char] || char;
        }
        this.setOutput(output);
    },
    convertToHalf() {
        const input = this.getInput();
        let output = '';
        for (const char of input) {
            output += this.fullToHalfMap[char] || char;
        }
        this.setOutput(output);
    },
    copyOutput() {
        const output = this.getOutput();
        if (!output || !output.value) { showNoCopyAlert(); return; }
        output.select(); document.execCommand('copy'); showCopyAlert('转换结果');
    },
    getInput() { return document.querySelector('#width-content .input')?.value ?? ''; },
    getOutput() { return document.querySelector('#width-content .output'); },
    setOutput(value) {
        const outputEl = this.getOutput();
         if(outputEl) outputEl.value = value;
         this.updateCharCount();
    },
    updateCharCount() {
        const input = this.getInput();
        const outputEl = this.getOutput();
         const output = outputEl ? outputEl.value : '';
        const inputCounter = document.querySelector('#width-content .input')?.nextElementSibling;
        const outputCounter = outputEl?.nextElementSibling;

        if (inputCounter?.classList.contains('char-counter')) {
            inputCounter.querySelector('.total').textContent = input.length;
            inputCounter.querySelector('.no-space').textContent = input.replace(/[\s\r\n]+/g, '').length;
        }
        if (outputCounter?.classList.contains('char-counter')) {
            outputCounter.querySelector('.total').textContent = output.length;
            outputCounter.querySelector('.no-space').textContent = output.replace(/[\s\r\n]+/g, '').length;
        }
    }
};
// widthConverter.init(); // Will be called in DOMContentLoaded


// --- Combined Color Format Converter ---
const colorConverter = {
    // --- Selectors ---
    getRgbaInputElement() { return document.querySelector('#color-convert-content .rgba-input'); },
    getAbgrOutputElement() { return document.querySelector('#color-convert-content .abgr-output'); },
    getRgbaLogicalValueElement() { return document.querySelector('#color-convert-content .logical-value-rgba'); },
    getRgbaBinaryValueElement() { return document.querySelector('#color-convert-content .binary-value-rgba'); },
    getRgbaInputPreviewElement() { return document.getElementById('rgba-input-preview'); },
    getAbgrInputElement() { return document.querySelector('#color-convert-content .abgr-input'); },
    getRgbaOutputElement() { return document.querySelector('#color-convert-content .rgba-output'); },
    getAbgrLogicalValueElement() { return document.querySelector('#color-convert-content .logical-value-abgr'); },
    getAbgrExtractedValuesElement() { return document.querySelector('#color-convert-content .extracted-values'); },
    getRgbaOutputPreviewElement() { return document.getElementById('rgba-output-preview'); },

    // --- Helper to update preview ---
    updatePreview(element, hexColor) {
        if (!element) return;
        let cssColor = 'transparent';
        let finalBg = '#eee';

        if (hexColor && /^#[0-9A-F]{8}$/i.test(hexColor)) {
            cssColor = hexColor;
            finalBg = hexColor;
        } else if (hexColor && /^#[0-9A-F]{6}$/i.test(hexColor)) {
            cssColor = hexColor + 'FF';
            finalBg = cssColor;
        }
        element.style.backgroundColor = finalBg;
    },

    // --- RGBA -> ABGR Conversion Logic ---
    convertToAbgr() {
        const rgbaInputEl = this.getRgbaInputElement();
        const abgrOutputEl = this.getAbgrOutputElement();
        const logicalValEl = this.getRgbaLogicalValueElement();
        const binaryValEl = this.getRgbaBinaryValueElement();
        const previewEl = this.getRgbaInputPreviewElement();

        if (!rgbaInputEl || !abgrOutputEl || !logicalValEl || !binaryValEl || !previewEl) {
            console.error("RGBA->ABGR: Missing one or more required elements.");
            return;
        }

        const inputHex = rgbaInputEl.value.toUpperCase();
        abgrOutputEl.value = '';
        logicalValEl.textContent = 'N/A';
        binaryValEl.textContent = 'N/A';

        if (!/^[0-9A-F]{8}$/.test(inputHex)) {
            this.updatePreview(previewEl, null);
            return;
        }
        this.updatePreview(previewEl, '#' + inputHex);

        try {
            const r = parseInt(inputHex.substring(0, 2), 16);
            const g = parseInt(inputHex.substring(2, 4), 16);
            const b = parseInt(inputHex.substring(4, 6), 16);
            const a = parseInt(inputHex.substring(6, 8), 16);

            const r5 = (r >> 3) & 0x1F;
            const g5 = (g >> 3) & 0x1F;
            const b5 = (b >> 3) & 0x1F;
            const a1 = (a >> 7) & 0x01;

            const abgr1555_logical = (a1 << 15) | (b5 << 10) | (g5 << 5) | r5;
            const lowByte = abgr1555_logical & 0xFF;
            const highByte = (abgr1555_logical >> 8) & 0xFF;
            const littleEndianHex = lowByte.toString(16).toUpperCase().padStart(2, '0') +
                                    highByte.toString(16).toUpperCase().padStart(2, '0');
            abgrOutputEl.value = littleEndianHex;
            logicalValEl.textContent = '0x' + abgr1555_logical.toString(16).toUpperCase().padStart(4, '0');
            const binaryString = abgr1555_logical.toString(2).padStart(16, '0');
            binaryValEl.textContent = `${binaryString.substring(0, 1)} ${binaryString.substring(1, 6)} ${binaryString.substring(6, 11)} ${binaryString.substring(11, 16)}`;
        } catch (e) {
             console.error("Error during RGBA to ABGR conversion:", e);
             abgrOutputEl.value = '';
             logicalValEl.textContent = 'N/A';
             binaryValEl.textContent = 'N/A';
        }
    },

    copyAbgrOutput() {
        const output = this.getAbgrOutputElement();
        if (!output || !output.value) { showNoCopyAlert(); return; }
        output.select(); document.execCommand('copy'); showCopyAlert('ABGR1555 (小端序 Hex)');
    },

    // --- ABGR -> RGBA Conversion Logic ---
    convertToRgba() {
        const abgrInputEl = this.getAbgrInputElement();
        const rgbaOutputEl = this.getRgbaOutputElement();
        const logicalValEl = this.getAbgrLogicalValueElement();
        const extractedValEl = this.getAbgrExtractedValuesElement();
        const previewEl = this.getRgbaOutputPreviewElement();

         if (!abgrInputEl || !rgbaOutputEl || !logicalValEl || !extractedValEl || !previewEl) {
             console.error("ABGR->RGBA: Missing one or more required elements.");
             return;
         }
        const inputHex = abgrInputEl.value.toUpperCase();
        rgbaOutputEl.value = '';
        logicalValEl.textContent = 'N/A';
        extractedValEl.textContent = 'A:N/A B:N/A G:N/A R:N/A';
        this.updatePreview(previewEl, null);

        if (!/^[0-9A-F]{4}$/.test(inputHex)) {
            return;
        }

         try {
            const lowByteHex = inputHex.substring(0, 2);
            const highByteHex = inputHex.substring(2, 4);
            const logicalValue = (parseInt(highByteHex, 16) << 8) | parseInt(lowByteHex, 16);
            logicalValEl.textContent = '0x' + logicalValue.toString(16).toUpperCase().padStart(4, '0');

            const a1 = (logicalValue >> 15) & 0x01;
            const b5 = (logicalValue >> 10) & 0x1F;
            const g5 = (logicalValue >> 5)  & 0x1F;
            const r5 = logicalValue        & 0x1F;
            extractedValEl.textContent = `A:${a1} B:${b5.toString(16).toUpperCase().padStart(2,'0')} G:${g5.toString(16).toUpperCase().padStart(2,'0')} R:${r5.toString(16).toUpperCase().padStart(2,'0')}`;

            const r8 = (r5 << 3) | (r5 >> 2);
            const g8 = (g5 << 3) | (g5 >> 2);
            const b8 = (b5 << 3) | (b5 >> 2);
            const a8 = (a1 === 1) ? 0xFF : 0x00;
            const rgbaHex = `${r8.toString(16).toUpperCase().padStart(2, '0')}${g8.toString(16).toUpperCase().padStart(2, '0')}${b8.toString(16).toUpperCase().padStart(2, '0')}${a8.toString(16).toUpperCase().padStart(2, '0')}`;
            rgbaOutputEl.value = rgbaHex;
            this.updatePreview(previewEl, '#' + rgbaHex);
         } catch(e) {
             console.error("Error during ABGR to RGBA conversion:", e);
             rgbaOutputEl.value = '';
             logicalValEl.textContent = 'N/A';
             extractedValEl.textContent = 'A:N/A B:N/A G:N/A R:N/A';
             this.updatePreview(previewEl, null);
         }
    },

     copyRgbaOutput() {
        const output = this.getRgbaOutputElement();
        if (!output || !output.value) { showNoCopyAlert(); return; }
        output.select(); document.execCommand('copy'); showCopyAlert('RGBA (Hex)');
    },
};

// --- DOMContentLoaded Event Listener ---
window.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const defaultTab = 'vertical';
    let savedTab = localStorage.getItem('activeTextPixieTab');

    let activeTabFound = false;
    tabButtons.forEach(button => {
        const tabName = button.getAttribute('data-tab');
        if (tabName === savedTab) {
            const contentElement = document.getElementById(`${tabName}-content`);
            if (contentElement) {
                activeTabFound = true;
            }
        }
    });
    if (!activeTabFound) {
        savedTab = defaultTab;
        localStorage.setItem('activeTextPixieTab', defaultTab);
    }


    tabButtons.forEach(button => {
        const tabName = button.getAttribute('data-tab');
        const contentElement = document.getElementById(`${tabName}-content`);

        if (!contentElement) {
             console.warn(`Content element #${tabName}-content not found. Hiding tab button.`);
             button.style.display = 'none';
             return;
        }

        button.addEventListener('click', () => {
            // Deactivate all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activate clicked
            button.classList.add('active');
            contentElement.classList.add('active');
            localStorage.setItem('activeTextPixieTab', tabName);

            // Post-activation actions
             if (tabName === 'font') {
                 fontTester.updatePreview();
             } else if (tabName === 'frequency') {
                 // When switching TO frequency tab, if input exists, re-analyze, else init count
                 if (document.querySelector('#frequency-content .input')?.value.trim() !== '') {
                    frequencyAnalyzer.analyze();
                 } else {
                    frequencyAnalyzer.updateUniqueCharCount(0);
                 }
             } else if (tabName === 'color-convert') {
                 const rgbaInputEl = colorConverter.getRgbaInputElement();
                 const abgrInputEl = colorConverter.getAbgrInputElement();
                 if (rgbaInputEl) {
                     const isValidRgba = /^[0-9A-F]{8}$/i.test(rgbaInputEl.value);
                     colorConverter.updatePreview(colorConverter.getRgbaInputPreviewElement(), isValidRgba ? '#' + rgbaInputEl.value : null);
                 }
                 if (abgrInputEl) {
                     const isValidAbgr = /^[0-9A-F]{4}$/i.test(abgrInputEl.value);
                     if (isValidAbgr) {
                         colorConverter.convertToRgba();
                     } else {
                          colorConverter.updatePreview(colorConverter.getRgbaOutputPreviewElement(), null);
                     }
                 }
             }
        });

        // Set initial active state
        if (tabName === savedTab) {
            button.classList.add('active');
            contentElement.classList.add('active');
        } else {
            button.classList.remove('active');
            contentElement.classList.remove('active');
        }
    });

    // --- Initialize modules ---
     if (document.getElementById('font-content')) {
        fontTester.init();
     }
     widthConverter.init();
     if (document.getElementById('frequency-content')) {
        frequencyAnalyzer.init(); // Initialize frequency analyzer, including internet frequency map
     }

    // --- Setup Input Listeners ---
    const setupCounterListener = (selector, handler) => {
        const element = document.querySelector(selector);
        if (element) {
             element.addEventListener('input', handler);
             handler(); // Initial call
        }
    };
     const setupMultiCounterListener = (selector, handler) => {
         const elements = document.querySelectorAll(selector);
         if (elements.length > 0) {
              elements.forEach(el => el.addEventListener('input', handler));
              handler(); // Initial call
         }
     };

    // Assign listeners
    if(document.getElementById('vertical-content')) setupCounterListener('#vertical-content .input', verticalConverter.updateCharCount.bind(verticalConverter));
    if(document.getElementById('frequency-content')) {
        setupCounterListener('#frequency-content .input', () => {
            frequencyAnalyzer.updateCharCount();
            // Auto-analyze on input if a format is selected (useful for immediate feedback on internet freq)
            const formatEl = document.querySelector('#frequency-content input[name="frequencyFormat"]:checked');
            if (formatEl && document.querySelector('#frequency-content .input')?.value.trim() !== '') {
                 if (formatEl.value === 'internet_frequency' && frequencyAnalyzer.internetFrequencyMap.size > 0) {
                    frequencyAnalyzer.analyze();
                 } else if (formatEl.value !== 'internet_frequency') {
                    // For other modes, maybe don't auto-analyze on pure input, but rely on button or format change
                    // frequencyAnalyzer.analyze(); // Or keep it for consistency
                 }
            } else if (document.querySelector('#frequency-content .input')?.value.trim() === '') {
                 frequencyAnalyzer.setOutput('');
                 frequencyAnalyzer.updateUniqueCharCount(0);
            }
        });
        const freqFormatRadios = document.querySelectorAll('#frequency-content input[name="frequencyFormat"]');
        freqFormatRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (document.querySelector('#frequency-content .input')?.value.trim() !== '') {
                    frequencyAnalyzer.analyze();
                } else {
                    frequencyAnalyzer.setOutput('');
                    frequencyAnalyzer.updateUniqueCharCount(0);
                }
            });
        });
    }
    if(document.getElementById('sort-content')) setupCounterListener('#sort-content .input', textSorter.updateCharCount.bind(textSorter));
    if(document.getElementById('crop-content')) setupMultiCounterListener('#crop-content .input', textCropper.updateCharCount.bind(textCropper));
    if(document.getElementById('compare-content')) setupMultiCounterListener('#compare-content .input', textComparer.updateCharCount.bind(textComparer));
    if(document.getElementById('width-content')) setupCounterListener('#width-content .input', widthConverter.updateCharCount.bind(widthConverter));


     // --- Color Converter Input Listeners ---
     const rgbaColorInput = colorConverter.getRgbaInputElement();
     if(rgbaColorInput) {
         rgbaColorInput.addEventListener('input', () => {
            const isValid = /^[0-9A-F]{8}$/i.test(rgbaColorInput.value);
            colorConverter.updatePreview(colorConverter.getRgbaInputPreviewElement(), isValid ? '#' + rgbaColorInput.value : null);
         });
     }

      const abgrColorInput = colorConverter.getAbgrInputElement();
     if(abgrColorInput) {
         abgrColorInput.addEventListener('input', () => {
             const isValid = /^[0-9A-F]{4}$/i.test(abgrColorInput.value);
             if(!isValid && abgrColorInput.value.length >= 4) {
                  colorConverter.updatePreview(colorConverter.getRgbaOutputPreviewElement(), null);
             }
         });
     }


    // --- Initial updates for the ACTIVE tab on page load ---
    const activeTabElement = document.querySelector('.tab-content.active');
    if (activeTabElement) {
        const activeTabId = activeTabElement.id;

        if (activeTabId === 'font-content') fontTester.updatePreview();
        if (activeTabId === 'frequency-content') {
             if (document.querySelector('#frequency-content .input')?.value.trim() !== '') {
                 frequencyAnalyzer.analyze();
             } else {
                 frequencyAnalyzer.updateUniqueCharCount(0);
             }
        }
        if (activeTabId === 'color-convert-content') {
            const initialRgbaInputEl = colorConverter.getRgbaInputElement();
            const initialAbgrInputEl = colorConverter.getAbgrInputElement();
            if (initialRgbaInputEl) {
                const isValidRgba = /^[0-9A-F]{8}$/i.test(initialRgbaInputEl.value);
                colorConverter.updatePreview(colorConverter.getRgbaInputPreviewElement(), isValidRgba ? '#' + initialRgbaInputEl.value : null);
            }
            if (initialAbgrInputEl) {
                 const isValidAbgr = /^[0-9A-F]{4}$/i.test(initialAbgrInputEl.value);
                 if (isValidAbgr) {
                     colorConverter.convertToRgba();
                 } else {
                     colorConverter.updatePreview(colorConverter.getRgbaOutputPreviewElement(), null);
                 }
            }
        }

         const updateFunction = {
             'vertical-content': verticalConverter.updateCharCount.bind(verticalConverter),
             'frequency-content': frequencyAnalyzer.updateCharCount.bind(frequencyAnalyzer), // This updates I/O counts
             'sort-content': textSorter.updateCharCount.bind(textSorter),
             'crop-content': textCropper.updateCharCount.bind(textCropper),
             'compare-content': textComparer.updateCharCount.bind(textComparer),
             'width-content': widthConverter.updateCharCount.bind(widthConverter)
         }[activeTabId];

         if (updateFunction) {
             updateFunction();
         }

    } else if(document.getElementById(defaultTab + '-content')) {
         const defaultButton = document.querySelector(`.tab-button[data-tab="${defaultTab}"]`);
         const defaultContent = document.getElementById(defaultTab + '-content');
         if (defaultButton && defaultContent) {
            defaultButton.classList.add('active');
            defaultContent.classList.add('active');
            if (defaultTab === 'vertical') verticalConverter.updateCharCount();
            if (defaultTab === 'frequency') {
                if (document.querySelector('#frequency-content .input')?.value.trim() !== '') {
                     frequencyAnalyzer.analyze();
                } else {
                     frequencyAnalyzer.updateUniqueCharCount(0);
                }
            }
         }
     } else {
         console.warn("No active tab found and default tab content is missing.");
     }
});