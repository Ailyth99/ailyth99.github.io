document.addEventListener('DOMContentLoaded', () => {
    // 语言切换功能
    const langSwitch = () => {
        const buttons = document.querySelectorAll('.lang-btn');
        const contents = document.querySelectorAll('[lang]');
        
        // 设置初始状态
        const setInitialLang = () => {
            const savedLang = localStorage.getItem('preferredLang') || 'ja';
            const targetBtn = document.querySelector(`[data-lang="${savedLang}"]`);
            if (targetBtn) {
                targetBtn.click();
            }
        };

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                // 保存语言选择
                localStorage.setItem('preferredLang', button.dataset.lang);
                
                // 移除所有active类
                buttons.forEach(btn => btn.classList.remove('active'));
                contents.forEach(content => {
                    content.classList.remove('active');
                    content.style.display = 'none'; // 确保内容完全隐藏
                });
                
                // 添加新的active类
                button.classList.add('active');
                const targetContent = document.querySelector(`[lang="${button.dataset.lang}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    targetContent.style.display = 'block';
                }
            });
        });

        // 初始化语言设置
        setInitialLang();
    };

    // 响应式布局调整
    const adjustLayout = () => {
        const langSwitch = document.querySelector('.lang-switch');
        const wikiNav = document.querySelector('.wiki-nav');
        
        const adjustPosition = () => {
            if (window.innerWidth <= 768) {
                // 移动端布局
                langSwitch.style.position = 'relative';
                langSwitch.style.top = '0';
                langSwitch.style.right = '0';
                langSwitch.style.marginBottom = '20px';
                wikiNav.style.marginTop = '10px';
            } else {
                // 桌面端布局
                langSwitch.style.position = 'absolute';
                langSwitch.style.top = '20px';
                langSwitch.style.right = '20px';
                langSwitch.style.marginBottom = '0';
                wikiNav.style.marginTop = '0';
            }
        };

        // 初始调整
        adjustPosition();
        
        // 监听窗口大小变化
        window.addEventListener('resize', adjustPosition);
    };

    // 初始化所有功能
    langSwitch();
    adjustLayout();
});
