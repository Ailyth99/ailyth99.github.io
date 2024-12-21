// 竖排转换器
const verticalConverter = {
    convert() {
        const input = this.getInput();
        const output = input.replace(/\s+/g, '').split('').join('\n');
        this.setOutput(output);
        this.updateCharCount();
    },

    copyOutput() {
        const output = this.getOutput();
        output.select();
        document.execCommand('copy');
        alert('Copied to clipboard ✨');
    },

    getInput() {
        const input = document.querySelector('#vertical-content .input');
        input.addEventListener('input', () => this.updateCharCount());
        return input.value;
    },

    getOutput() {
        return document.querySelector('#vertical-content .output');
    },

    setOutput(value) {
        this.getOutput().value = value;
    },

    updateCharCount() {
        const input = this.getInput();
        const total = input.length;
        const noSpace = input.replace(/\s+/g, '').length;
        
        const counter = document.querySelector('#vertical-content .char-counter');
        counter.querySelector('.total').textContent = total;
        counter.querySelector('.no-space').textContent = noSpace;
    }
};

window.frequencyAnalyzer = {
    analyze() {
        const input = this.getInput();
        const charMap = new Map();
        
        // 统计每个字符出现的次数
        input.replace(/\s+/g, '').split('').forEach(char => {
            charMap.set(char, (charMap.get(char) || 0) + 1);
        });

        // 转换成数组并排序
        const sortedResult = [...charMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([char, count]) => `${char},${count}`)
            .join('\n');

        this.setOutput(sortedResult);
        this.updateCharCount();
    },

    copyOutput() {
        const output = this.getOutput();
        output.select();
        document.execCommand('copy');
        alert('Copied to clipboard ✨');
    },

    getInput() {
        const input = document.querySelector('#frequency-content .input');
        input.addEventListener('input', () => this.updateCharCount());
        return input.value;
    },

    getOutput() {
        return document.querySelector('#frequency-content .output');
    },

    setOutput(value) {
        this.getOutput().value = value;
    },

    updateCharCount() {
        const input = this.getInput();
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
        
        // 设置未匹配字符
        const debugOutput = Array.from(unmatchedChars).join('');
        this.setDebugOutput(debugOutput);
    },

    copyOutput() {
        const output = this.getOutput();
        output.select();
        document.execCommand('copy');
        alert('Copied to clipboard ✨');
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

// 字体测试器
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
                    this.loadFontsBtn.textContent = 'Loading Fonts...';
                    
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
                    this.loadFontsBtn.textContent = 'Fonts Loaded!';
                    this.updatePreview();
                } catch (err) {
                    console.error('获取字体失败:', err);
                    this.loadFontsBtn.textContent = 'Load Failed, Retry';
                    this.loadFontsBtn.disabled = false;
                }
            } else {
                alert('Browser does not support Font Access API');
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

// 初始化所有功能
document.addEventListener('DOMContentLoaded', () => {
    // Tab 切换功能
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-content`).classList.add('active');
        });
    });

    // 初始化字体测试器
    fontTester.init();

    // 初始化字符计数
    verticalConverter.updateCharCount();
    frequencyAnalyzer.updateCharCount();
});