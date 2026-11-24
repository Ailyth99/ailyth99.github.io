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

w,h,bd,ct,raw=read_png('logo_clean.png')
pix=decode(raw,w,h,ct)
bpp={6:4}[ct]
from collections import Counter
colors=Counter(); opaque=0; semi=0; transparent=0
for i in range(0,len(pix),bpp):
    r,g,b,a=pix[i],pix[i+1],pix[i+2],pix[i+3]
    if a==0: transparent+=1
    elif a==255: opaque+=1; colors[(r//32,g//32,b//32)]+=1
    else: semi+=1
print('total',w*h,'transparent',transparent,'semi',semi,'opaque',opaque)
for c,n in colors.most_common(18):
    r,g,b=c; print('  rgb≈(%d,%d,%d)  %d'%(r*32,g*32,b*32,n))
