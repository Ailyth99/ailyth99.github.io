// 转换主函数
function convertCode() {
    const input = document.getElementById('input').value;
    const keepEmptyLines = document.getElementById('keepEmptyLines').checked;
    const keepComments = document.getElementById('keepComments').checked;
    const autoDetect = document.getElementById('autoDetect').checked;
    
    const lines = input.split('\n').map(x => x.trim());
    let prevCode = [];
    let output = [];
    
    // 解密用的XOR密钥
    const xorKeys = [
        [0xa6, 0x96, 0x01, 0x82],
        [0xd9, 0x3b, 0x1b, 0xcc]
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = toHalfWidth(lines[i]);
        const prevIs2Line = prevCode.length && /^(30[56]0|[456])/.test(prevCode[0]);
        let code = [];

        // 处理非代码行
        if (!/^[0-9A-F]{8}\s+[0-9A-F]{8}$/i.test(line)) {
            if (lines[i] === '' && keepEmptyLines) {
                output.push('');
            } else if (keepComments) {
                output.push(`// ${lines[i]}`);
            }
            prevCode = [];
            continue;
        }

        // 自动检测代码类型并解密
        if (autoDetect && /^[0-7ADEF][01]/i.test(prevIs2Line ? lines[i-1] : line)) {
            code = line.toUpperCase().split(/\s+/);
        } else {
            code = decryptCode(line, xorKeys);
        }

        prevCode = [...code];

        // 处理两行类型的代码
        if (prevIs2Line) {
            output.push(`patch=1,EE,${code[0]},extended,${code[1]}`);
            prevCode = [];
            continue;
        }

        // 根据代码类型进行转换
        switch (code[0][0]) {
            case '3':
                // PAR和PS2rd的模式指定号差1，需要修正
                code[0] = (parseInt(code[0], 16) - 0x00100000).toString(16).toUpperCase();
                output.push(`patch=1,EE,${code[0]},extended,${code[1]}`);
                break;
            case 'A':
                // 补丁代码使用word类型
                output.push(`patch=1,EE,0${code[0].slice(-7)},word,${code[1]}`);
                break;
            case 'F':
                // Master Code (hook)代码注释掉
                output.push(`// ${code.join(' ')}`);
                break;
            default:
                // 其他类型都使用extended
                output.push(`patch=1,EE,${code[0]},extended,${code[1]}`);
                break;
        }
    }

    // 确保最后有一个空行
    if (output[output.length - 1] !== '') {
        output.push('');
    }

    document.getElementById('output').value = output.join('\n');
}

// 解密PAR代码
function decryptCode(code, xorKeys) {
    let result = '';
    const parts = code.split(/\s+/);
    
    for (let i = 0; i < 2; i++) {
        const hex = parseInt(parts[i], 16);
        for (let j = 0; j < 4; j++) {
            let byte = (hex >>> ((3 - j) * 8)) & 0xff;
            byte = (byte - xorKeys[i][(j + 1) & 3]) ^ xorKeys[i][j];
            result += ('00' + (byte >>> 0).toString(16)).slice(-2);
        }
        if (i === 0) result += ' ';
    }
    
    return result.toUpperCase().split(' ');
}

// 全角转半角
function toHalfWidth(str) {
    return str
        .replace(/[\t ]/g, ' ')
        .replace(/[０-９ａ-ｆＡ-Ｆ：]/g, c => 
            String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}