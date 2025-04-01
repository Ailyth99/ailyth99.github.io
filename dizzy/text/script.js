 

const verticalConverter = {
    convert() {
        const input = this.getInput();
        const format = document.querySelector('input[name="verticalFormat"]:checked').value;
        let output;

        if (format === 'single_line') {
            // 去掉换行符和所有空格
            output = input.replace(/[\n\r]/g, ' ').replace(/\s+/g, '').trim();
        } else {
            // 竖排转换 (保留换行，但去除多余空格)
            output = input.replace(/ +/g, '') // Remove spaces but keep line breaks
                         .split('')
                         .join('\n');
        }

        this.setOutput(output);
        // updateCharCount is called within setOutput
    },

    copyOutput() {
        const output = this.getOutput();
        if (!output.value) {
            alert('没有结果可以复制 🤔');
            return;
        }
        output.select();
        document.execCommand('copy');
        alert('已复制到剪贴板 ✨');
    },

    getInput() {
        return document.querySelector('#vertical-content .input').value;
    },

    getOutput() {
        return document.querySelector('#vertical-content .output');
    },

    setOutput(value) {
        this.getOutput().value = value;
        this.updateCharCount(); // Update counts when output is set
    },

    updateCharCount() {
        const input = this.getInput();
        const totalInput = input.length;
        const noSpaceInput = input.replace(/[\s\r\n]+/g, '').length; // Count non-whitespace

        const inputCounter = document.querySelector('#vertical-content .input').nextElementSibling;
        inputCounter.querySelector('.total').textContent = totalInput;
        inputCounter.querySelector('.no-space').textContent = noSpaceInput;

        // Update output counter
        const output = this.getOutput().value;
        const totalOutput = output.length;
        const noSpaceOutput = output.replace(/[\s\r\n]+/g, '').length; // Count non-whitespace

        const outputCounterElement = this.getOutput().nextElementSibling;
        if (outputCounterElement && outputCounterElement.classList.contains('char-counter')) {
             outputCounterElement.querySelector('.total').textContent = totalOutput;
             outputCounterElement.querySelector('.no-space').textContent = noSpaceOutput;
        }
    }
};


const frequencyAnalyzer = {
    analyze() {
        const input = this.getInput();
        const charMap = new Map();

        // Count non-whitespace characters
        input.replace(/[\s\r\n]+/g, '').split('').forEach(char => {
            charMap.set(char, (charMap.get(char) || 0) + 1);
        });

        const format = document.querySelector('input[name="frequencyFormat"]:checked').value;
        let results;
        let uniqueCharsCount = charMap.size;

        if (format === 'with_count') {
            results = [...charMap.entries()]
                .sort((a, b) => b[1] - a[1]) // Sort by frequency desc
                .map(([char, count]) => `${char},${count}`)
                .join('\n');
        } else {
            // Sort unique chars by frequency desc
            results = [...charMap.keys()]
                .sort((a, b) => charMap.get(b) - charMap.get(a))
                .join('\n');
        }

        this.setOutput(results);
        this.updateUniqueCharCount(uniqueCharsCount); // Call separate function to update unique count
        // updateCharCount is called within setOutput
    },

    copyOutput() {
        const output = this.getOutput();
         if (!output.value) {
             alert('没有结果可以复制 🤔');
             return;
         }
        output.select();
        document.execCommand('copy');
        alert('已复制到剪贴板 ✨');
    },

    getInput() {
        return document.querySelector('#frequency-content .input').value;
    },

    getOutput() {
        return document.querySelector('#frequency-content .output');
    },

    setOutput(value) {
        this.getOutput().value = value;
        this.updateCharCount(); // Update standard counts
    },

    updateCharCount() {
        const input = this.getInput();
        const totalInput = input.length;
        const noSpaceInput = input.replace(/[\s\r\n]+/g, '').length;

        const inputCounter = document.querySelector('#frequency-content .input').nextElementSibling;
        inputCounter.querySelector('.total').textContent = totalInput;
        inputCounter.querySelector('.no-space').textContent = noSpaceInput;

        const output = this.getOutput().value;
        const totalOutput = output.length;
        const noSpaceOutput = output.replace(/[\s\r\n]+/g, '').length;

        const outputCounterElement = this.getOutput().nextElementSibling;
         if (outputCounterElement && outputCounterElement.classList.contains('char-counter')) {
             outputCounterElement.querySelector('.total').textContent = totalOutput;
             outputCounterElement.querySelector('.no-space').textContent = noSpaceOutput;
         }
    },

    updateUniqueCharCount(count) {
        const outputContainer = document.querySelector('#frequency-content .container'); // Find container for output area
        let charTypeCounter = document.querySelector('#frequency-content .char-type-counter');

        if (!charTypeCounter && outputContainer) {
            charTypeCounter = document.createElement('div');
            charTypeCounter.className = 'char-type-counter';
            // Insert after the button group for better layout
            const buttonGroup = document.querySelector('#frequency-content .button-group');
            if (buttonGroup) {
                buttonGroup.parentNode.insertBefore(charTypeCounter, buttonGroup.nextSibling);
            } else { // Fallback if button group structure changes
                outputContainer.parentNode.appendChild(charTypeCounter);
            }

            // Style it
            charTypeCounter.style.marginTop = '10px';
            charTypeCounter.style.textAlign = 'right';
            charTypeCounter.style.color = '#e6b3cc';
            charTypeCounter.style.fontSize = '0.9em';
        }

        if (charTypeCounter) {
            charTypeCounter.textContent = `包含字符种类：${count}`;
        }
    }
};

// SHIFT-JIS Converter
const sjisConverter = {
    convert() {
        const input = this.getInput();
        const format = document.querySelector('input[name="sjisFormat"]:checked').value;
        const unmatchedChars = new Set();
        const results = [];

        for (const char of input) {
            if (char === '\n' || char === '\r') continue; // Skip newlines directly

            const code = sjisMapping.get(char);
            if (code) {
                switch(format) {
                    case 'code':
                        results.push(code);
                        break;
                    case 'char_code':
                        results.push(`${char},${code}`);
                        break;
                    case 'code_char':
                        results.push(`${code},${char}`);
                        break;
                }
            } else if (char.trim()) { // Only add non-whitespace unmatched
                unmatchedChars.add(char);
            }
        }

        this.setOutput(results.join('\n'));

        const debugOutput = Array.from(unmatchedChars).join('');
        this.setDebugOutput(debugOutput);
    },

    copyOutput() {
        const output = this.getOutput();
         if (!output.value && !this.getDebugOutput().value) { // Check both outputs
             alert('没有结果可以复制 🤔');
             return;
         }
        // Decide which output to copy? Maybe copy the main one? Or alert user?
        // Let's copy the main output for now.
        output.select();
        document.execCommand('copy');
        alert('已复制转换结果到剪贴板 ✨');
    },

    getInput() {
        return document.querySelector('#sjis-content .input').value;
    },

    getOutput() {
        return document.querySelector('#sjis-content .output');
    },

    getDebugOutput() { // Helper to get debug output element
        return document.querySelector('#sjis-content .debug-output');
    },

    setOutput(value) {
        this.getOutput().value = value;
    },

    setDebugOutput(value) {
        this.getDebugOutput().value = value;
    }
};


const fontTester = {
    init() {
        this.loadFontsBtn = document.getElementById('loadFontsBtn');
        this.fontSelect = document.getElementById('fontSelect');
        this.testInput = document.getElementById('testInput');
        this.preview = document.getElementById('preview');
        this.fontSize = document.getElementById('fontSize');
        this.fontColor = document.getElementById('fontColor');
        this.fontControls = document.querySelector('#font-content .font-controls');
        this.fontSizeDisplay = document.getElementById('fontSizeDisplay');

        this.bindEvents();
        this.updatePreview(); // Initial preview update
    },

    bindEvents() {
        if (this.loadFontsBtn) {
            this.loadFontsBtn.addEventListener('click', async () => {
                if ('queryLocalFonts' in window) {
                    try {
                        this.loadFontsBtn.disabled = true;
                        this.loadFontsBtn.textContent = '正在加载字体...';

                        const fonts = await window.queryLocalFonts();
                        const uniqueFonts = [...new Set(fonts.map(font => font.family))]
                            .filter(family => family && !family.startsWith('.'))
                            .sort((a, b) => a.localeCompare(b));

                        this.fontSelect.innerHTML = '';
                         const defaultOption = document.createElement('option');
                         defaultOption.value = '';
                         defaultOption.textContent = '--- 选择字体 ---';
                         this.fontSelect.appendChild(defaultOption);

                        uniqueFonts.forEach(fontFamily => {
                            const option = document.createElement('option');
                            option.value = fontFamily;
                            option.textContent = fontFamily;
                            this.fontSelect.appendChild(option);
                        });

                        this.fontSelect.style.display = 'block';
                        this.fontControls.style.display = 'flex';
                         this.loadFontsBtn.textContent = '字体加载完成！';
                         // Optional: Hide button after load
                         // this.loadFontsBtn.style.display = 'none';

                    } catch (err) {
                        console.error('获取字体失败:', err);
                        alert('加载系统字体失败。浏览器可能拒绝了权限或不支持此功能。\n' + err.message);
                        this.loadFontsBtn.textContent = '加载失败，请重试';
                        this.loadFontsBtn.disabled = false;
                    }
                } else {
                    alert('抱歉，您的浏览器不支持本地字体访问 API (Local Font Access API)。');
                    this.loadFontsBtn.style.display = 'none';
                }
            });
        }

        this.fontSelect.addEventListener('change', () => this.updatePreview());
        this.testInput.addEventListener('input', () => this.updatePreview());
        this.fontSize.addEventListener('input', (e) => {
            this.fontSizeDisplay.textContent = `${e.target.value}px`;
            this.updatePreview();
        });
        this.fontColor.addEventListener('input', () => this.updatePreview());
    },

    updatePreview() {
         if (!this.fontSelect || !this.testInput || !this.fontSize || !this.fontColor || !this.preview) {
             return;
         }
        const selectedFont = this.fontSelect.value || 'sans-serif';
        const testText = this.testInput.value;
        const size = this.fontSize.value;
        const color = this.fontColor.value;

        this.preview.style.fontFamily = `"${selectedFont}", sans-serif`; // Quote font name
        this.preview.style.fontSize = `${size}px`;
        this.preview.style.color = color;
        this.preview.textContent = testText;
    }
};


const textSorter = {
    sort() {
        const input = this.getInput();
        const method = document.querySelector('input[name="sortMethod"]:checked').value;
        let output;

        const charsToSort = input.replace(/[\s\r\n]+/g, '').split('');

        switch (method) {
            case 'alphabetical':
                output = charsToSort.sort((a, b) => a.localeCompare(b)).join('');
                break;
            case 'frequency':
                const charMap = new Map();
                charsToSort.forEach(char => {
                    charMap.set(char, (charMap.get(char) || 0) + 1);
                });
                output = [...charMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([char]) => char)
                    .join('');
                break;
            case 'unicode':
                output = charsToSort.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join('');
                break;
            default:
                output = charsToSort.join('');
        }

        this.setOutput(output);
    },

    shuffle() {
        const input = this.getInput();
        const charsToShuffle = input.replace(/[\s\r\n]+/g, '').split('');
        const shuffled = charsToShuffle.sort(() => Math.random() - 0.5).join('');
        this.setOutput(shuffled);
    },

     copyOutput() {
         const output = this.getOutput();
         if (!output.value) {
             alert('没有结果可以复制 🤔');
             return;
         }
         output.select();
         document.execCommand('copy');
         alert('已复制到剪贴板 ✨');
     },

    getInput() {
        return document.querySelector('#sort-content .input').value;
    },

    getOutput() {
        return document.querySelector('#sort-content .output');
    },

    setOutput(value) {
        this.getOutput().value = value;
        this.updateCharCount();
    },

    updateCharCount() {
        const input = this.getInput();
        const inputTotal = input.length;
        const inputNoSpace = input.replace(/[\s\r\n]+/g, '').length;
        const inputCounter = document.querySelector('#sort-content .input').nextElementSibling;
        inputCounter.querySelector('.total').textContent = inputTotal;
        inputCounter.querySelector('.no-space').textContent = inputNoSpace;

        const output = this.getOutput().value;
        const outputTotal = output.length;
        const outputNoSpace = output.length; // Output has no spaces
        const outputCounter = this.getOutput().nextElementSibling;
        outputCounter.querySelector('.total').textContent = outputTotal;
        outputCounter.querySelector('.no-space').textContent = outputNoSpace;
    }
};


const textCropper = {
    crop() {
        const originalText = this.getOriginalText();
        const charactersToCrop = this.getCharactersToCrop();

        if (!charactersToCrop) {
             this.setOutput(originalText); // If no crop chars, output original
             alert("请输入需要裁剪的字符。");
             return;
        }

        const escapedChars = charactersToCrop.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`[${escapedChars}]`, 'g');
        const result = originalText.replace(regex, '');

        this.setOutput(result);
    },

     copyOutput() {
         const output = document.querySelector('#crop-content .output');
          if (!output.value) {
              alert('没有结果可以复制 🤔');
              return;
          }
         output.select();
         document.execCommand('copy');
         alert('已复制到剪贴板 ✨');
     },

    getOriginalText() {
        return document.querySelector('#crop-content .input:nth-of-type(1)').value;
    },

    getCharactersToCrop() {
        return document.querySelectorAll('#crop-content .input')[1].value;
    },

    setOutput(value) {
        document.querySelector('#crop-content .output').value = value;
        this.updateCharCount();
    },

    updateCharCount() {
        const originalText = this.getOriginalText();
        const originalTotal = originalText.length;
        const originalNoSpace = originalText.replace(/[\s\r\n]+/g, '').length;
        const originalCounter = document.querySelector('#crop-content .input:nth-of-type(1)').nextElementSibling;
        originalCounter.querySelector('.total').textContent = originalTotal;
        originalCounter.querySelector('.no-space').textContent = originalNoSpace;

        const cropChars = this.getCharactersToCrop();
        const cropTotal = cropChars.length;
        const cropNoSpace = cropChars.replace(/[\s\r\n]+/g, '').length;
        const cropCounter = document.querySelectorAll('#crop-content .input')[1].nextElementSibling;
        cropCounter.querySelector('.total').textContent = cropTotal;
        cropCounter.querySelector('.no-space').textContent = cropNoSpace;

        const output = document.querySelector('#crop-content .output').value;
        const outputTotal = output.length;
        const outputNoSpace = output.replace(/[\s\r\n]+/g, '').length;
        const outputCounter = document.querySelector('#crop-content .output').nextElementSibling;
        outputCounter.querySelector('.total').textContent = outputTotal;
        outputCounter.querySelector('.no-space').textContent = outputNoSpace;
    }
};

// Text Comparer
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
        // updateCharCount is called within setters
    },

    getText1() {
        return document.querySelector('#compare-content .input:nth-of-type(1)').value;
    },

    getText2() {
        return document.querySelectorAll('#compare-content .input')[1].value;
    },

    setCommonChars(value) {
        document.querySelectorAll('#compare-content .output')[0].value = value;
        this.updateCharCount(); // Call update on setting value
    },

    setOnlyInText1(value) {
        document.querySelectorAll('#compare-content .output')[1].value = value;
        this.updateCharCount(); // Call update on setting value
    },

    setOnlyInText2(value) {
        document.querySelectorAll('#compare-content .output')[2].value = value;
        this.updateCharCount(); // Call update on setting value
    },

    updateCharCount() {
        // Text 1 Counter
        const text1 = this.getText1();
        const text1Total = text1.length;
        const text1NoSpace = text1.replace(/[\s\r\n]+/g, '').length;
        const text1Counter = document.querySelector('#compare-content .input:nth-of-type(1)').nextElementSibling;
        text1Counter.querySelector('.total').textContent = text1Total;
        text1Counter.querySelector('.no-space').textContent = text1NoSpace;

        // Text 2 Counter
        const text2 = this.getText2();
        const text2Total = text2.length;
        const text2NoSpace = text2.replace(/[\s\r\n]+/g, '').length;
        const text2Counter = document.querySelectorAll('#compare-content .input')[1].nextElementSibling;
        text2Counter.querySelector('.total').textContent = text2Total;
        text2Counter.querySelector('.no-space').textContent = text2NoSpace;

        // Output Counters
        const outputs = document.querySelectorAll('#compare-content .output');
        outputs.forEach((output) => {
            const total = output.value.length;
            const noSpace = total; // Output has no spaces
            const counter = output.nextElementSibling;
             // Check if counter exists before updating
             if(counter && counter.classList.contains('char-counter')) {
                 counter.querySelector('.total').textContent = total;
                 counter.querySelector('.no-space').textContent = noSpace;
             }
        });
    }
};


// START: Half/Full Width Converter Object (Modified)
const widthConverter = {
    // NEW: Convert to Full Width
    convertToFull() {
        const input = this.getInput();
        let output = '';
        for (let i = 0; i < input.length; i++) {
            const charCode = input.charCodeAt(i);
            if (charCode === 32) { // Half-width space
                output += '　'; // Full-width space
            } else if (charCode >= 33 && charCode <= 126) { // Printable ASCII
                output += String.fromCharCode(charCode + 65248); // Apply offset
            } else {
                output += input[i]; // Keep others as is
            }
        }
        this.setOutput(output);
    },

    // NEW: Convert to Half Width
    convertToHalf() {
        const input = this.getInput();
        let output = '';
        for (let i = 0; i < input.length; i++) {
            const charCode = input.charCodeAt(i);
            if (charCode === 12288) { // Full-width space
                output += ' '; // Half-width space
            } else if (charCode >= 65281 && charCode <= 65374) { // Full-width ASCII range
                output += String.fromCharCode(charCode - 65248); // Apply offset
            } else {
                output += input[i]; // Keep others as is
            }
        }
        this.setOutput(output);
    },

    copyOutput() {
        const output = this.getOutput();
         if (!output.value) {
             alert('没有结果可以复制 🤔');
             return;
         }
        output.select();
        document.execCommand('copy');
        alert('已复制到剪贴板 ✨');
    },

    getInput() {
        return document.querySelector('#width-content .input').value;
    },

    getOutput() {
        return document.querySelector('#width-content .output');
    },

    setOutput(value) {
        this.getOutput().value = value;
        this.updateCharCount(); // Update counts when output is set
    },

    updateCharCount() {
        const input = this.getInput();
        const inputTotal = input.length;
        const inputNoSpace = input.replace(/[\s\r\n　]+/g, '').length; // Include full-width space
        const inputCounter = document.querySelector('#width-content .input').nextElementSibling;
        inputCounter.querySelector('.total').textContent = inputTotal;
        inputCounter.querySelector('.no-space').textContent = inputNoSpace;

        const output = this.getOutput().value;
        const outputTotal = output.length;
        const outputNoSpace = output.replace(/[\s\r\n　]+/g, '').length; // Include full-width space
        const outputCounter = this.getOutput().nextElementSibling;
        outputCounter.querySelector('.total').textContent = outputTotal;
        outputCounter.querySelector('.no-space').textContent = outputNoSpace;
    }
};
// END: Half/Full Width Converter Object (Modified)


window.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const savedTab = localStorage.getItem('activeTextPixieTab') || 'vertical';

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            const activeContent = document.getElementById(`${tabName}-content`);
             if (activeContent) {
                 activeContent.classList.add('active');
             }

            localStorage.setItem('activeTextPixieTab', tabName);

             if (tabName === 'font') {
                 fontTester.updatePreview();
                 // Trigger font loading if not already loaded and tab becomes active?
                 // Might be better to keep the manual button click.
             }
        });

        // Set initial active tab
        if (button.getAttribute('data-tab') === savedTab) {
            button.classList.add('active');
            const activeContent = document.getElementById(`${savedTab}-content`);
             if (activeContent) {
                 activeContent.classList.add('active');
             }
        } else {
            button.classList.remove('active');
             const content = document.getElementById(`${button.getAttribute('data-tab')}-content`);
             if (content) {
                 content.classList.remove('active');
             }
        }
    });

    // Initialize Font Tester
    fontTester.init();

    // --- Add input listeners for character counters ---
    // Helper function to add listener and initial update
    const setupCounter = (selector, handler) => {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('input', handler);
            handler(); // Initial update
        } else {
             console.warn(`Counter setup failed: Element not found for selector "${selector}"`);
        }
    };
     const setupMultiCounter = (selector, handler) => {
         const elements = document.querySelectorAll(selector);
         if (elements.length > 0) {
             elements.forEach(el => el.addEventListener('input', handler));
             handler(); // Initial update (call once)
         } else {
              console.warn(`Multi-counter setup failed: No elements found for selector "${selector}"`);
         }
     };

    setupCounter('#vertical-content .input', verticalConverter.updateCharCount.bind(verticalConverter));
    setupCounter('#frequency-content .input', () => {
        frequencyAnalyzer.updateCharCount();
        // Also reset unique count if input changes before analysis
        frequencyAnalyzer.updateUniqueCharCount(0);
    });
    // No counter update needed for SJIS input listener
    setupCounter('#sort-content .input', textSorter.updateCharCount.bind(textSorter));
    setupMultiCounter('#crop-content .input', textCropper.updateCharCount.bind(textCropper));
    setupMultiCounter('#compare-content .input', textComparer.updateCharCount.bind(textComparer));
    setupCounter('#width-content .input', widthConverter.updateCharCount.bind(widthConverter));


     // Initial preview update for font tester if it's the active tab
     if (document.getElementById('font-content')?.classList.contains('active')) {
         fontTester.updatePreview();
     }

     // Initial unique char count display for frequency analyzer
     if (document.getElementById('frequency-content')?.classList.contains('active')) {
         // Call analyze to potentially show count if there's initial text, or just set up the element
         frequencyAnalyzer.updateUniqueCharCount(0); // Initialize display element even if count is 0
     }


});

// Add helper functions or utilities if needed at the end
// e.g., function debounce(func, wait) { ... }

 