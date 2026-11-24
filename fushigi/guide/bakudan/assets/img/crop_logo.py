import struct, zlib

def read_png(fn):
    d = open(fn,'rb').read()
    pos = 8
    idat = b''
    w=h=bd=ct=None
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]
        typ = d[pos+4:pos+8].decode('latin1')
        data = d[pos+8:pos+8+ln]
        if typ == 'IHDR':
            w = struct.unpack('>I', data[0:4])[0]
            h = struct.unpack('>I', data[4:8])[0]
            bd = data[8]; ct = data[9]
        elif typ == 'IDAT':
            idat += data
        pos += 12 + ln
    raw = zlib.decompress(idat)
    return w,h,bd,ct,raw

def decode(raw, w, h, ct):
    bpp = {0:1, 2:3, 3:1, 4:2, 6:4}[ct]
    stride = w*bpp
    out = bytearray()
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        for i in range(stride):
            a = line[i-bpp] if i>=bpp else 0
            b = prev[i]
            c = prev[i-bpp] if i>=bpp else 0
            if f==1: line[i]=(line[i]+a)&255
            elif f==2: line[i]=(line[i]+b)&255
            elif f==3: line[i]=(line[i]+(a+b)//2)&255
            elif f==4:
                pp=a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        out += line
        prev = line
    return bytes(out)

w,h,bd,ct,raw = read_png('logo_title.png')
pix = decode(raw, w, h, ct)
bpp = {6:4, 2:3, 4:2, 0:1, 3:1}[ct]

# 计算每列非透明/非黑像素数
colmask = []
for x in range(w):
    cnt = 0
    for y in range(h):
        i = (y*w+x)*bpp
        r,g,b,a = pix[i],pix[i+1],pix[i+2],pix[i+3]
        if a > 10 and (r+g+b) > 30:
            cnt += 1
    colmask.append(cnt)

# 找内容分段
segs = []
start = None
for x in range(w):
    if colmask[x] > 0 and start is None:
        start = x
    elif colmask[x] == 0 and start is not None:
        segs.append((start, x-1)); start = None
if start is not None:
    segs.append((start, w-1))
print('内容分段(列):', segs)

# 裁剪 Logo 区域 x:0~234，同时找纵向边界
x0, x1 = 0, 234
rowmask = []
for y in range(h):
    cnt = 0
    for x in range(x0, x1+1):
        i = (y*w+x)*bpp
        r,g,b,a = pix[i],pix[i+1],pix[i+2],pix[i+3]
        if a > 10 and (r+g+b) > 30:
            cnt += 1
    rowmask.append(cnt)
nz = [y for y in range(h) if rowmask[y] > 0]
y0, y1 = min(nz), max(nz)
print('Logo 纵向范围:', y0, y1)

# 裁剪并输出 (带少量边距)
pad_x, pad_y = 4, 4
cx0 = max(0, x0-pad_x); cx1 = min(w-1, x1+pad_x)
cy0 = max(0, y0-pad_y); cy1 = min(h-1, y1+pad_y)
nw = cx1-cx0+1; nh = cy1-cy0+1
out = bytearray()
for y in range(cy0, cy1+1):
    out.append(0)  # filter type 0
    for x in range(cx0, cx1+1):
        i = (y*w+x)*bpp
        out += pix[i:i+bpp]

def write_png(fn, w, h, raw, ct):
    def chunk(typ, data):
        c = struct.pack('>I', len(data)) + typ.encode() + data
        c += struct.pack('>I', zlib.crc32(typ.encode()+data)&0xffffffff)
        return c
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, ct, 0, 0, 0)
    comp = zlib.compress(bytes(out), 9)
    return sig + chunk('IHDR', ihdr) + chunk('IDAT', comp) + chunk('IEND', b'')

open('logo_clean.png','wb').write(write_png('logo_clean.png', nw, nh, bytes(out), ct))
print('已输出 logo_clean.png', nw, 'x', nh)
