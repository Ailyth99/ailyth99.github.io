const verticalConverter = {
    convert() {
        const input = this.getInput();
        const format = document.querySelector('input[name="verticalFormat"]:checked').value;
        let output;

        if (format === 'single_line') {
            // 去掉换行符和所有空格
            output = input.replace(/\n/g, ' ').replace(/\s+/g, '').trim();
        } else {
            // 竖排转换
            output = input.replace(/\s+/g, '').split('').join('\n');
        }

        this.setOutput(output);
        this.updateCharCount();
    },

    copyOutput() {
        const output = this.getOutput();
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
    },

    updateCharCount() {
        const input = document.querySelector('#vertical-content .input').value;
        const total = input.length;
        const noSpace = input.replace(/\s+/g, '').length;
        
        const counter = document.querySelector('#vertical-content .char-counter');
        counter.querySelector('.total').textContent = total;
        counter.querySelector('.no-space').textContent = noSpace;
    }
};


const frequencyAnalyzer = {
    analyze() {
        const input = this.getInput();
        const charMap = new Map();
        
        
        input.replace(/\s+/g, '').split('').forEach(char => {
            charMap.set(char, (charMap.get(char) || 0) + 1);
        });

        
        const format = document.querySelector('input[name="frequencyFormat"]:checked').value;
        let results;

        if (format === 'with_count') {
            // 转换成数组并排序
            results = [...charMap.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([char, count]) => `${char},${count}`)
                .join('\n');
        } else {
            // 只输出字符
            results = [...charMap.keys()]
                .sort((a, b) => charMap.get(b) - charMap.get(a)) // 按出现次数排序
                .join('\n');
            
            
            const uniqueCharsCount = charMap.size;
            
            
            const outputArea = document.querySelector('#frequency-content .output');
            let charTypeCounter = document.querySelector('#frequency-content .char-type-counter');
            
            if (!charTypeCounter) {
                
                charTypeCounter = document.createElement('div');
                charTypeCounter.className = 'char-type-counter';
                outputArea.parentNode.insertBefore(charTypeCounter, outputArea.nextSibling);
            }
            
            // 更新显示内容
            charTypeCounter.textContent = `包含字符种类：${uniqueCharsCount}`;
        }

        this.setOutput(results);
        this.updateCharCount();
    },

    copyOutput() {
        const output = this.getOutput();
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
    },

    updateCharCount() {
        const input = document.querySelector('#frequency-content .input').value;
        const total = input.length;
        const noSpace = input.replace(/\s+/g, '').length;
        
        const counter = document.querySelector('#frequency-content .char-counter');
        counter.querySelector('.total').textContent = total;
        counter.querySelector('.no-space').textContent = noSpace;
    }
};

// SHIFT-JIS 转换器
const sjisConverter = {
    convert() {
        const input = this.getInput();
        const format = document.querySelector('input[name="sjisFormat"]:checked').value;
        const unmatchedChars = new Set();
        const results = [];

        // 逐字转换
        for (const char of input) {
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
            } else if (char.trim()) {
                unmatchedChars.add(char);
            }
        }

        // 设置转换结果
        this.setOutput(results.join('\n'));
        
        
        const debugOutput = Array.from(unmatchedChars).join('');
        this.setDebugOutput(debugOutput);
    },

    copyOutput() {
        const output = this.getOutput();
        output.select();
        document.execCommand('copy');
        alert('已复制到剪贴板 ✨');
    },

    getInput() {
        return document.querySelector('#sjis-content .input').value;
    },

    getOutput() {
        return document.querySelector('#sjis-content .output');
    },

    setOutput(value) {
        this.getOutput().value = value;
    },

    setDebugOutput(value) {
        document.querySelector('#sjis-content .debug-output').value = value;
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
        this.fontControls = document.querySelector('.font-controls');
        this.fontSizeDisplay = document.getElementById('fontSizeDisplay');

        this.bindEvents();
    },

    bindEvents() {
        this.loadFontsBtn.addEventListener('click', async () => {
            if ('queryLocalFonts' in window) {
                try {
                    this.loadFontsBtn.disabled = true;
                    this.loadFontsBtn.textContent = '正在加载字体...';
                    
                    const fonts = await window.queryLocalFonts();
                    const uniqueFonts = new Set(fonts.map(font => font.family));
                    
                    this.fontSelect.innerHTML = '';
                    uniqueFonts.forEach(fontFamily => {
                        const option = document.createElement('option');
                        option.value = fontFamily;
                        option.textContent = fontFamily;
                        this.fontSelect.appendChild(option);
                    });

                    this.fontSelect.style.display = 'block';
                    this.fontControls.style.display = 'block';
                    this.loadFontsBtn.textContent = '字体加载完成！';
                    this.updatePreview();
                } catch (err) {
                    console.error('获取字体失败:', err);
                    this.loadFontsBtn.textContent = '加载失败，请重试';
                    this.loadFontsBtn.disabled = false;
                }
            } else {
                alert('浏览器不支持字体访问API');
            }
        });

        this.fontSelect.addEventListener('change', () => this.updatePreview());
        this.testInput.addEventListener('input', () => this.updatePreview());
        this.fontSize.addEventListener('input', (e) => {
            this.fontSizeDisplay.textContent = `${e.target.value}px`;
            this.updatePreview();
        });
        this.fontColor.addEventListener('input', () => this.updatePreview());
    },

    updatePreview() {
        const selectedFont = this.fontSelect.value;
        const testText = this.testInput.value;
        const size = this.fontSize.value;
        const color = this.fontColor.value;

        this.preview.style.fontFamily = selectedFont;
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

         
        const cleanInput = input.replace(/[\r\n]+/g, '');

        switch (method) {
            case 'alphabetical':
                output = cleanInput.split('').sort((a, b) => a.localeCompare(b)).join('');
                break;
            case 'frequency':
                const charMap = new Map();
                cleanInput.replace(/\s+/g, '').split('').forEach(char => {
                    charMap.set(char, (charMap.get(char) || 0) + 1);
                });
                output = [...charMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([char]) => char)
                    .join('');
                break;
            case 'unicode':
                output = cleanInput.split('').sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join('');
                break;
        }

        this.setOutput(output);
        this.updateCharCount();
    },

    shuffle() {
        const input = this.getInput();
        
        const cleanInput = input.replace(/[\r\n]+/g, '');
        const shuffled = cleanInput.split('').sort(() => Math.random() - 0.5).join('');
        this.setOutput(shuffled);
        this.updateCharCount();
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
        // 更新输入框字符计数
        const input = document.querySelector('#sort-content .input').value;
        const inputTotal = input.length;
        const inputNoSpace = input.replace(/\s+/g, '').length;
        
        const inputCounter = document.querySelector('#sort-content .input').nextElementSibling;
        inputCounter.querySelector('.total').textContent = inputTotal;
        inputCounter.querySelector('.no-space').textContent = inputNoSpace;

        // 更新输出框字符计数
        const output = this.getOutput().value;
        const outputTotal = output.length;
        const outputNoSpace = output.replace(/\s+/g, '').length;
        
        const outputCounter = this.getOutput().nextElementSibling;
        outputCounter.querySelector('.total').textContent = outputTotal;
        outputCounter.querySelector('.no-space').textContent = outputNoSpace;
    }
};


const textCropper = {
    crop() {
        const originalText = this.getOriginalText();
        const charactersToCrop = this.getCharactersToCrop();
        
        const regex = new RegExp(`[${charactersToCrop}]`, 'g');
        const result = originalText.replace(regex, '').trim();
        
        this.setOutput(result);
    },

    getOriginalText() {
        return document.querySelector('#crop-content .input').value;
    },

    getCharactersToCrop() {
        return document.querySelectorAll('#crop-content .input')[1].value;
    },

    setOutput(value) {
        document.querySelector('#crop-content .output').value = value;
        this.updateCharCount();
    },

    updateCharCount() {
        
        const originalText = document.querySelector('#crop-content .input').value;
        const originalTotal = originalText.length;
        const originalNoSpace = originalText.replace(/\s+/g, '').length;
        
        const originalCounter = document.querySelector('#crop-content .input').nextElementSibling;
        originalCounter.querySelector('.total').textContent = originalTotal;
        originalCounter.querySelector('.no-space').textContent = originalNoSpace;

        
        const cropChars = document.querySelectorAll('#crop-content .input')[1].value;
        const cropTotal = cropChars.length;
        const cropNoSpace = cropChars.replace(/\s+/g, '').length;
        
        const cropCounter = document.querySelectorAll('#crop-content .input')[1].nextElementSibling;
        cropCounter.querySelector('.total').textContent = cropTotal;
        cropCounter.querySelector('.no-space').textContent = cropNoSpace;

        
        const output = document.querySelector('#crop-content .output').value;
        const outputTotal = output.length;
        const outputNoSpace = output.replace(/\s+/g, '').length;
        
        const outputCounter = document.querySelector('#crop-content .output').nextElementSibling;
        outputCounter.querySelector('.total').textContent = outputTotal;
        outputCounter.querySelector('.no-space').textContent = outputNoSpace;
    }
};

// 文字比较器
const textComparer = {
    compare() {
        const text1 = this.getText1();
        const text2 = this.getText2();

        const set1 = new Set(text1);
        const set2 = new Set(text2);

        const commonChars = [...set1].filter(char => set2.has(char)).join('');
        const onlyInText1 = [...set1].filter(char => !set2.has(char)).join('');
        const onlyInText2 = [...set2].filter(char => !set1.has(char)).join('');

        this.setCommonChars(commonChars);
        this.setOnlyInText1(onlyInText1);
        this.setOnlyInText2(onlyInText2);
    },

    getText1() {
        return document.querySelector('#compare-content .input').value;
    },

    getText2() {
        return document.querySelectorAll('#compare-content .input')[1].value;
    },

    setCommonChars(value) {
        document.querySelectorAll('#compare-content .output')[0].value = value;
        this.updateCharCount();
    },

    setOnlyInText1(value) {
        document.querySelectorAll('#compare-content .output')[1].value = value;
        this.updateCharCount();
    },

    setOnlyInText2(value) {
        document.querySelectorAll('#compare-content .output')[2].value = value;
        this.updateCharCount();
    },

    updateCharCount() {
        
        const text1 = document.querySelector('#compare-content .input').value;
        const text1Total = text1.length;
        const text1NoSpace = text1.replace(/\s+/g, '').length;
        
        const text1Counter = document.querySelector('#compare-content .input').nextElementSibling;
        text1Counter.querySelector('.total').textContent = text1Total;
        text1Counter.querySelector('.no-space').textContent = text1NoSpace;

        
        const text2 = document.querySelectorAll('#compare-content .input')[1].value;
        const text2Total = text2.length;
        const text2NoSpace = text2.replace(/\s+/g, '').length;
        
        const text2Counter = document.querySelectorAll('#compare-content .input')[1].nextElementSibling;
        text2Counter.querySelector('.total').textContent = text2Total;
        text2Counter.querySelector('.no-space').textContent = text2NoSpace;

        
        const outputs = document.querySelectorAll('#compare-content .output');
        outputs.forEach((output, index) => {
            const total = output.value.length;
            const noSpace = output.value.replace(/\s+/g, '').length;
            
            const counter = output.nextElementSibling;
            counter.querySelector('.total').textContent = total;
            counter.querySelector('.no-space').textContent = noSpace;
        });
    }
};


window.addEventListener('DOMContentLoaded', () => {
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            
            button.classList.add('active');
            document.getElementById(`${tabName}-content`).classList.add('active');
        });
    });

    
    fontTester.init();
    
    
    document.querySelector('#vertical-content .input').addEventListener('input', () => {
        verticalConverter.updateCharCount();
    });
    
    
    document.querySelector('#frequency-content .input').addEventListener('input', () => {
        frequencyAnalyzer.updateCharCount();
    });
    
    
    document.querySelector('#sort-content .input').addEventListener('input', () => {
        textSorter.updateCharCount();
    });
    
    
    document.querySelectorAll('#crop-content .input').forEach(input => {
        input.addEventListener('input', () => {
            textCropper.updateCharCount();
        });
    });
    
    
    document.querySelectorAll('#compare-content .input').forEach(input => {
        input.addEventListener('input', () => {
            textComparer.updateCharCount();
        });
    });
    
    
    verticalConverter.updateCharCount();
    frequencyAnalyzer.updateCharCount();
    textSorter.updateCharCount();
    textCropper.updateCharCount();
    textComparer.updateCharCount();
});