import os
import re

def convert_charset(directory):
    # 编译正则表达式模式，不区分大小写
    charset_pattern = re.compile(r'(charset=)(x-sjis|shift-jis)', re.IGNORECASE)
    
    # 递归遍历目录
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.htm', '.html')):
                file_path = os.path.join(root, file)
                
                # 读取文件内容
                try:
                    with open(file_path, 'r', encoding='shift_jis') as f:
                        content = f.read()
                    
                    # 检查并替换charset
                    if charset_pattern.search(content):
                        new_content = charset_pattern.sub(r'\1UTF-8', content)
                        
                        # 写回文件
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"已处理: {file_path}")
                except Exception as e:
                    print(f"处理文件时出错 {file_path}: {str(e)}")

# 使用示例
directory = r"PS2_dev"
convert_charset(directory)