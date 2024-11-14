const loadFontsBtn = document.getElementById('loadFontsBtn');
const fontSelect = document.getElementById('fontSelect');
const testInput = document.getElementById('testInput');
const preview = document.getElementById('preview');
const fontSize = document.getElementById('fontSize');
const fontColor = document.getElementById('fontColor');
const fontControls = document.querySelector('.font-controls');
const fontSizeDisplay = document.getElementById('fontSizeDisplay');

loadFontsBtn.addEventListener('click', async () => {
    if ('queryLocalFonts' in window) {
        try {
            loadFontsBtn.disabled = true;
            loadFontsBtn.textContent = '正在加载字体...';
            
            const fonts = await window.queryLocalFonts();
            const uniqueFonts = new Set(fonts.map(font => font.family));
            
            fontSelect.innerHTML = ''; // 清空现有选项
            uniqueFonts.forEach(fontFamily => {
                const option = document.createElement('option');
                option.value = fontFamily;
                option.textContent = fontFamily;
                fontSelect.appendChild(option);
            });

            // 显示字体选择框和控制面板
            fontSelect.style.display = 'block';
            fontControls.style.display = 'block';
            loadFontsBtn.textContent = '字体加载完成！';
            updatePreview();
        } catch (err) {
            console.error('获取字体失败:', err);
            loadFontsBtn.textContent = '加载失败，请重试';
            loadFontsBtn.disabled = false;
        }
    } else {
        alert('浏览器不支持字体访问API');
    }
});

// 监听所有可能触发预览更新的事件
fontSelect.addEventListener('change', updatePreview);
testInput.addEventListener('input', updatePreview);
fontSize.addEventListener('input', (e) => {
    fontSizeDisplay.textContent = `${e.target.value}px`;
    updatePreview();
});
fontColor.addEventListener('input', updatePreview);

function updatePreview() {
    const selectedFont = fontSelect.value;
    const testText = testInput.value;
    const size = fontSize.value;
    const color = fontColor.value;

    preview.style.fontFamily = selectedFont;
    preview.style.fontSize = `${size}px`;
    preview.style.color = color;
    preview.textContent = testText;
}