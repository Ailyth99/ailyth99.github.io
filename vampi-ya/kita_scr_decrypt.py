import sys,os

#文本数据块结构，文本文件位于SCR目录。
#0x00 - 0x2F (共48字节): 一串shift jis编码的日文明文,可能不会在游戏显示,可能只是某种标识
#如果文本长度不足48字节，则用全角空格 (0x8140) 填充
#0x30 - 0x3F (共16字节): 解密密钥区，这是用于解密该数据块的16字节密钥，每个文本块都不一样
#0x40 - 块结尾: 加密数据区，这是实际需要解密的游戏脚本和文本内容
#然后填充0x00，直到填满到下个扇区开始（0x800的倍数）
#解密函数
#核心解密方法非常简单，就是 加密字节 - 秘钥字节 = 实际字节
#16个秘钥字节按顺序使用，用完了再次从第一个字节开始循环。
def decrypt_block(data_block):
    if len(data_block) < 0x40:
        return None

    key = data_block[0x30:0x40]  #秘钥就是每个文本块第四行的16字节。
    encrypted_data = data_block[0x40:]
    decrypted_data = bytearray()
    
    key_len = len(key)
    if key_len == 0:
        return encrypted_data

    for i in range(len(encrypted_data)):
        decrypted_byte = (encrypted_data[i] - key[i % key_len]) & 0xFF
        decrypted_data.append(decrypted_byte)
        
    return decrypted_data




#找到scr*00.bin里面的文本块


def process_file(input_path, output_dir):

    try:
        with open(input_path, 'rb') as f:
            content = f.read()
    except IOError as e:
        print(f"Error reading file {input_path}: {e}")
        return

    file_name = os.path.basename(input_path)
    base_name, _ = os.path.splitext(file_name)
    content_len = len(content)
    
    cursor = 0
    while cursor < content_len:
        # 找到每个文本块的起始点
        block_start = -1
        search_pos = cursor
        while search_pos < content_len:
            ##发现连续四个0x00表示该文本块结束，进入0x00填充部分。
            if search_pos % 0x800 == 0:
                if (search_pos + 4 <= content_len) and (content[search_pos:search_pos+4] != b'\x00\x00\x00\x00'):
                    block_start = search_pos
                    break # Found the start
            
            #检查扇区起始点，PS2扇区大小0x800字节=2048字节
            search_pos = (search_pos // 0x800 + 1) * 0x800
        
        if block_start == -1:
            break

        block_end = content.find(b'\x00\x00\x00\x00', block_start)
        
        if block_end == -1:
            block_end = content_len

        # STEP 3: Extract the precise block data.
        block_data = content[block_start:block_end]

        if block_data:
            decrypted_content = decrypt_block(block_data)
            
            if decrypted_content is not None:
                output_filename = f"{base_name}_offset_{block_start:08X}.dec"
                output_path = os.path.join(output_dir, output_filename)
                try:
                    with open(output_path, 'wb') as f_out:
                        f_out.write(decrypted_content)
                    print(f"Processed block at offset 0x{block_start:X} -> {output_path} (Size: {len(block_data)} bytes)")
                except IOError as e:
                    print(f"Error writing file {output_path}: {e}")
        cursor = block_end

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python decrypt_scr.py <path_to_scr_file.bin>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    
    if not os.path.isfile(input_file):
        print(f"Error: File not found at {input_file}")
        sys.exit(1)
    
    base_name_for_dir = os.path.splitext(os.path.basename(input_file))[0]
    
    output_directory = f"{base_name_for_dir}_output"
    
    os.makedirs(output_directory, exist_ok=True)
    print(f"Outputting decrypted files to: ./{output_directory}/")
    
    process_file(input_file, output_directory)