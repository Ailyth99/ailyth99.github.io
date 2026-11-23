日常修改 content.json，刷新网页即可读取更新。

- games：游戏信息；versions 通过 patchId 关联补丁。
- patches：补丁地址、输出文件名、版本和说明。
- guides：攻略入口；gameIds 关联游戏，默认沿用游戏标题、图片和介绍。
- news：顶部公告，显示日期最新的一条。
- order 控制排序，enabled: false 隐藏内容；CRC32 写成 8 位字符串。

不思议游戏保持原有 HTML 和特殊补丁逻辑。本站图片、攻略路径相对于 fushigi/。
本地预览：在网站根目录执行 python -m http.server 8000 --bind 127.0.0.1，打开 http://127.0.0.1:8000/fushigi/。
