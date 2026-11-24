import struct, zlib

def read_png(fn):
    d = open(fn,'rb').read()
    pos = 8; idat = b''
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]
        typ = d[pos+4:pos+8].decode('latin1')
        data = d[pos+8:pos+8+ln]
        if typ == 'IHDR':
            w = struct.unpack('>I', data[0:4])[0]; h = struct.unpack('>I', data[4:8])[0]
            bd = data[8]; ct = data[9]
        elif typ == 'IDAT':
            idat += data
        pos += 12 + ln
    return w,h,bd,ct,zlib.decompress(idat)

def decode(raw,w,h,ct):
    bpp={0:1,2:3,3:1,4:2,6:4}[ct]; stride=w*bpp
    out=bytearray(); prev=bytearray(stride); p=0
    for y in range(h):
        f=raw[p]; p+=1
        line=bytearray(raw[p:p+stride]); p+=stride
        for i in range(stride):
            a=line[i-bpp] if i>=bpp else 0
            b=prev[i]; c=prev[i-bpp] if i>=bpp else 0
            if f==1: line[i]=(line[i]+a)&255
            elif f==2: line[i]=(line[i]+b)&255
            elif f==3: line[i]=(line[i]+(a+b)//2)&255
            elif f==4:
                pp=a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        out+=line; prev=line
    return bytes(out)

def write_png(fn,w,h,pix,ct):
    def chunk(typ,data):
        c=struct.pack('>I',len(data))+typ.encode()+data
        c+=struct.pack('>I',zlib.crc32(typ.encode()+data)&0xffffffff)
        return c
    ihdr=struct.pack('>IIBBBBB',w,h,8,ct,0,0,0)
    comp=zlib.compress(pix,9)
    return b'\x89PNG\r\n\x1a\n'+chunk('IHDR',ihdr)+chunk('IDAT',comp)+chunk('IEND',b'')

w,h,bd,ct,raw = read_png('logo_clean.png')
pix = bytearray(decode(raw,w,h,ct))
bpp = {6:4,2:3,4:2,0:1,3:1}[ct]

# 黑色(接近黑)像素转透明
changed = 0
for i in range(0, len(pix), bpp):
    r,g,b,a = pix[i],pix[i+1],pix[i+2],pix[i+3]
    # 判定为黑：RGB都低
    if r < 40 and g < 40 and b < 40:
        pix[i]=0; pix[i+1]=0; pix[i+2]=0; pix[i+3]=0
        changed += 1
print('转透明像素数:', changed, '/', len(pix)//bpp)

open('logo_clean.png','wb').write(write_png('logo_clean.png',w,h,bytes(pix),ct))
print('已写回 logo_clean.png', w, 'x', h)
