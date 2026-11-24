import struct, zlib

def read_png(fn):
    d=open(fn,'rb').read(); pos=8; idat=b''
    w=h=bd=ct=0
    while pos<len(d):
        ln=struct.unpack('>I',d[pos:pos+4])[0]
        typ=d[pos+4:pos+8].decode('latin1')
        data=d[pos+8:pos+8+ln]
        if typ=='IHDR':
            w,h,bd,ct=struct.unpack('>I',data[0:4])[0],struct.unpack('>I',data[4:8])[0],data[8],data[9]
        elif typ=='IDAT':
            idat+=data
        pos+=12+ln
    return w,h,bd,ct,zlib.decompress(idat)

def decode(raw,w,h,ct):
    bpp={0:1,2:3,3:1,4:2,6:4}[ct]
    stride=w*bpp
    out=bytearray()
    prev=bytearray(stride)
    p=0
    for y in range(h):
        f=raw[p]; p+=1
        line=bytearray(raw[p:p+stride]); p+=stride
        for i in range(stride):
            a=line[i-bpp] if i>=bpp else 0
            b=prev[i]
            c=prev[i-bpp] if i>=bpp else 0
            if f==1: line[i]=(line[i]+a)&255
            elif f==2: line[i]=(line[i]+b)&255
            elif f==3: line[i]=(line[i]+(a+b)//2)&255
            elif f==4:
                pp=a+b-c; pa=abs(pp-a); pb=abs(pp-b); pc=abs(pp-c)
                pr=a if(pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        out+=line
        prev=line
    return bytes(out)

def write_png(fn,w,h,pix_rgba,ct):
    # pix_rgba: 每行带 filter 0 字节的裸数据
    def chunk(typ,data):
        c=struct.pack('>I',len(data))+typ.encode()+data
        c+=struct.pack('>I',zlib.crc32(typ.encode()+data)&0xffffffff)
        return c
    ihdr=struct.pack('>IIBBBBB',w,h,8,ct,0,0,0)
    comp=zlib.compress(pix_rgba,9)
    return b'\x89PNG\r\n\x1a\n'+chunk('IHDR',ihdr)+chunk('IDAT',comp)+chunk('IEND',b'')

# 1. 读原始 900x127 图
w,h,bd,ct,raw=read_png('logo_title.png')
pix=decode(raw,w,h,ct)
bpp={6:4,2:3,4:2,0:1,3:1}[ct]

# 2. 定位 Logo 范围（之前已算出 x:0~234，y:0~126）
x0,x1,y0,y1 = 0,234,0,126

# 3. 裁剪 + 去黑，输出每行带 filter 0 的新数据
pad=4
cx0=max(0,x0-pad); cx1=min(w-1,x1+pad)
cy0=max(0,y0-pad); cy1=min(h-1,y1+pad)
nw=cx1-cx0+1; nh=cy1-cy0+1

out=bytearray()
for y in range(cy0,cy1+1):
    out.append(0)  # filter type 0 (None)
    for x in range(cx0,cx1+1):
        i=(y*w+x)*bpp
        r,g,b,a=pix[i],pix[i+1],pix[i+2],pix[i+3]
        if r<40 and g<40 and b<40:
            r=g=b=a=0   # 黑色转透明
        out += bytes([r,g,b,a])

open('logo_clean.png','wb').write(write_png('logo_clean.png',nw,nh,bytes(out),ct))
print('完成: logo_clean.png', nw, 'x', nh, '文件字节', len(out))
