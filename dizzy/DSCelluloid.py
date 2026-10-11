import wx
import struct
import os
import argparse
import sys
import traceback
import json
from PIL import Image

try:
    import ndspy.lz10
    NDSPY_AVAILABLE = True
except ImportError:
    NDSPY_AVAILABLE = False

# ==========================================
# 核心底层逻辑 (支持 NCBR/Bitmap 模式)
# ==========================================
def smart_decompress(data):
    if data and data[0] == 0x10 and NDSPY_AVAILABLE:
        try: return ndspy.lz10.decompress(data)
        except: return data
    return data

def find_block(data, magics):
    if len(data) < 0x10: return -1
    h_sz = struct.unpack_from('<H', data, 0x0C)[0]
    n_b = struct.unpack_from('<H', data, 0x0E)[0]
    off = h_sz
    for _ in range(n_b):
        if off + 8 > len(data): break
        m = data[off : off+4]
        if m in magics: return off
        try:
            b_sz = struct.unpack_from('<I', data, off+4)[0]
            off += b_sz
        except: break
    return -1

def get_obj_dims(sh, sz):
    d = {(0,0):(8,8),(0,1):(16,16),(0,2):(32,32),(0,3):(64,64),(1,0):(16,8),(1,1):(32,8),(1,2):(32,16),(1,3):(64,32),(2,0):(8,16),(2,1):(8,32),(2,2):(16,32),(2,3):(32,64)}
    return d.get((sh, sz), (8,8))

def cvt(v):
    # Nitro BGR555 -> RGBA8888 by bit replication (matches ndspy output)
    r, g, b = v & 0x1F, (v >> 5) & 0x1F, (v >> 10) & 0x1F
    return ((r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2), 255)

def check_is_bitmap(ncgr_d, b_c):
    """检测是否为 NCBR (Bitmap/Linear 模式)"""
    if b_c == -1 or len(ncgr_d) < b_c + 24: return False
    # 根据 NDS 标准，type 字段位于 RAHC + 8 + 0x0C (即 +20)
    type_val = struct.unpack_from('<I', ncgr_d, b_c + 20)[0]
    return type_val == 1

def set_px(t_d, t_idx, x, y, c_i, b8, is_bitmap=False, obj_w=0):
    if is_bitmap:
        # NCBR 线性位图寻址
        if b8:
            off = t_idx * 64 + y * obj_w + x
            if off < len(t_d): t_d[off] = c_i
        else:
            off = t_idx * 32 + (y * obj_w + x) // 2
            if off < len(t_d):
                b = t_d[off]
                if x % 2 == 0: t_d[off] = (b & 0xF0) | (c_i & 0xF)
                else: t_d[off] = (b & 0x0F) | ((c_i & 0xF) << 4)
    else:
        # NCGR 标准图块寻址
        if b8:
            off = t_idx * 64 + y * 8 + x
            if off < len(t_d): t_d[off] = c_i
        else:
            off = t_idx * 32 + y * 4 + (x // 2)
            if off < len(t_d):
                b = t_d[off]
                if x % 2 == 0: t_d[off] = (b & 0xF0) | (c_i & 0xF)
                else: t_d[off] = (b & 0x0F) | ((c_i & 0xF) << 4)

def get_px(t_d, t_idx, x, y, b8, is_bitmap=False, obj_w=0):
    if is_bitmap:
        # NCBR 线性位图寻址
        if b8:
            off = t_idx * 64 + y * obj_w + x
            return t_d[off] if off < len(t_d) else 0
        else:
            off = t_idx * 32 + (y * obj_w + x) // 2
            if off < len(t_d):
                b = t_d[off]
                return (b & 0xF) if x % 2 == 0 else (b >> 4)
            return 0
    else:
        # NCGR 标准图块寻址
        if b8:
            off = t_idx * 64 + y * 8 + x
            return t_d[off] if off < len(t_d) else 0
        else:
            off = t_idx * 32 + y * 4 + (x // 2)
            if off < len(t_d):
                b = t_d[off]
                return (b & 0xF) if x % 2 == 0 else (b >> 4)
            return 0

def set_raw_px(t_m, byte_off, x, y, val, b8, is_bitmap=False, obj_w=0):
    if is_bitmap:
        if b8:
            off = byte_off + y * obj_w + x
            if off < len(t_m): t_m[off] = val & 0xFF
        else:
            off = byte_off + (y * obj_w + x) // 2
            if off < len(t_m):
                b = t_m[off]
                if x % 2 == 0: t_m[off] = (b & 0xF0) | (val & 0xF)
                else: t_m[off] = (b & 0x0F) | ((val & 0xF) << 4)
    else:
        if b8:
            off = byte_off + y * 8 + x
            if off < len(t_m): t_m[off] = val & 0xFF
        else:
            off = byte_off + y * 4 + (x // 2)
            if off < len(t_m):
                b = t_m[off]
                if x % 2 == 0: t_m[off] = (b & 0xF0) | (val & 0xF)
                else: t_m[off] = (b & 0x0F) | ((val & 0xF) << 4)

def get_raw_px(t_m, byte_off, x, y, b8, is_bitmap=False, obj_w=0):
    if is_bitmap:
        if b8:
            off = byte_off + y * obj_w + x
            return t_m[off] if off < len(t_m) else 0
        else:
            off = byte_off + (y * obj_w + x) // 2
            if off < len(t_m):
                b = t_m[off]
                return (b & 0xF) if x % 2 == 0 else (b >> 4)
            return 0
    else:
        if b8:
            off = byte_off + y * 8 + x
            return t_m[off] if off < len(t_m) else 0
        else:
            off = byte_off + y * 4 + (x // 2)
            if off < len(t_m):
                b = t_m[off]
                return (b & 0xF) if x % 2 == 0 else (b >> 4)
            return 0

def parse_cell(ncer_d, c_idx):
    b = find_block(ncer_d, (b'CEBK', b'KBEC'))
    if b == -1: return [], 0, 0, 0, 0, 32
    n_c = struct.unpack_from('<H', ncer_d, b + 8)[0]
    b_attr = struct.unpack_from('<H', ncer_d, b + 10)[0]
    m_mode = struct.unpack_from('<I', ncer_d, b + 16)[0]
    c_off = struct.unpack_from('<I', ncer_d, b + 12)[0]
    base, p_sz = b + 8 + c_off, 16 if (b_attr == 1) else 8
    o_base = base + (n_c * p_sz)
    curr = base + (c_idx * p_sz)
    n_o = struct.unpack_from('<H', ncer_d, curr)[0]
    o_off = struct.unpack_from('<I', ncer_d, curr + 4)[0]
    o_d = ncer_d[o_base+o_off : o_base+o_off+n_o*6]
    boundary = 32 << (m_mode if m_mode < 4 else 0)
    # Per-cell OBJ VRAM transfer: every cell relocates its tiles to its own
    # source offset in the character data. Ignoring it makes all cells render
    # as the first one.
    cb, src = b + 8, 0
    tran = struct.unpack_from('<I', ncer_d, cb + 12)[0]
    if tran not in (0, 0xFFFFFFFF):
        ent = struct.unpack_from('<I', ncer_d, cb + tran + 4)[0]
        pos = cb + tran + ent + c_idx * 8
        if pos + 4 <= len(ncer_d): src = struct.unpack_from('<I', ncer_d, pos)[0]
    objs, mX, mY, MX, MY = [], 9999, 9999, -9999, -9999
    for i in range(n_o):
        a0, a1, a2 = struct.unpack_from('<HHH', o_d, i * 6)
        y, sh, b8 = (((a0 & 0xFF) ^ 0x80) - 0x80), (a0 >> 14) & 3, (a0 >> 13) & 1
        x, sz, fx, fy = (((a1 & 0x1FF) ^ 0x100) - 0x100), (a1 >> 14) & 3, (a1 >> 12) & 1, (a1 >> 13) & 1
        cid, pid = a2 & 0x3FF, (a2 >> 12) & 0xF
        w, h = get_obj_dims(sh, sz)
        if x < mX: mX = x
        if y < mY: mY = y
        if x + w > MX: MX = x + w
        if y + h > MY: MY = y + h
        objs.append({'x':x,'y':y,'w':w,'h':h,'fx':fx,'fy':fy,'pid':pid,'addr_bytes':cid*boundary+src,'b8':b8})
    return objs, mX, mY, MX, MY, boundary

# ==========================================
# 标准模式导出与导入
# ==========================================
def cmd_export(nclr_p, ncgr_p, ncer_p, pal_base_id=0, parent_d=None, log=print):
    try:
        log("\n[--- STANDARD EXPORT STARTED ---]")
        with open(nclr_p, 'rb') as f: nclr = smart_decompress(f.read())
        with open(ncgr_p, 'rb') as f: ncgr = smart_decompress(f.read())
        with open(ncer_p, 'rb') as f: ncer = smart_decompress(f.read())
        b_p = find_block(nclr, (b'PLTT', b'TTLP'))
        pal_raw = nclr[b_p + 8 + struct.unpack_from('<I', nclr, b_p + 8 + 0x0C)[0] :]
        pal = [cvt(v) for v in [struct.unpack_from('<H', pal_raw, i*2)[0] for i in range(len(pal_raw)//2)]]
        
        b_chr = find_block(ncgr, (b'CHAR', b'RAHC'))
        b8_g = (struct.unpack_from('<I', ncgr, b_chr + 8 + 0x04)[0] == 4)
        is_bitmap = check_is_bitmap(ncgr, b_chr)
        t_d = ncgr[b_chr + 8 + struct.unpack_from('<I', ncgr, b_chr + 8 + 0x14)[0] :]
        n_c = struct.unpack_from('<H', ncer, find_block(ncer, (b'CEBK', b'KBEC')) + 8)[0]
        
        log(f"[*] Graphics Type: {'NCBR (Linear Bitmap)' if is_bitmap else 'NCGR (Tiled)'}")
        
        ncgr_basename = os.path.splitext(os.path.basename(ncgr_p))[0]
        out_d = os.path.join(parent_d if parent_d else os.path.dirname(ncgr_p), f"{ncgr_basename}_exported_cells")
        os.makedirs(out_d, exist_ok=True)
        
        exported = 0
        for cid in range(n_c):
            objs, mX, mY, MX, MY, _ = parse_cell(ncer, cid)
            if MX <= mX: continue
            img = Image.new('RGBA', (MX - mX, MY - mY), (0,0,0,0)); pix = img.load()
            for o in reversed(objs):
                is8 = o['b8'] if o['b8'] else b8_g
                ts = 64 if is8 else 32
                pal_offset = (pal_base_id + o['pid']) * (256 if is8 else 16)
                st = o['addr_bytes'] // ts
                
                # 遍历逻辑拆分：NCBR使用全局坐标系，NCGR使用局部切块坐标系
                if is_bitmap:
                    for py in range(o['h']):
                        for px in range(o['w']):
                            # 线性寻址，仅提供起始偏移
                            rX, rY = (o['w']-1-px) if o['fx'] else px, (o['h']-1-py) if o['fy'] else py
                            ci = get_px(t_d, st, px, py, is8, True, o['w'])
                            if ci > 0 and ci + pal_offset < len(pal): 
                                pix[o['x']+rX-mX, o['y']+rY-mY] = pal[ci + pal_offset]
                else:
                    for ty in range(o['h'] // 8):
                        for tx in range(o['w'] // 8):
                            tid = st + ty * (o['w'] // 8) + tx
                            for py in range(8):
                                for px in range(8):
                                    rX, rY = (o['w']-1-(tx*8+px)) if o['fx'] else (tx*8+px), (o['h']-1-(ty*8+py)) if o['fy'] else (ty*8+py)
                                    ci = get_px(t_d, tid, px, py, is8, False, 0)
                                    if ci > 0 and ci + pal_offset < len(pal): 
                                        pix[o['x']+rX-mX, o['y']+rY-mY] = pal[ci + pal_offset]
            img.save(os.path.join(out_d, f"cell_{cid:03d}.png"))
            exported += 1
        log(f"[*] Processed {exported}/{n_c} cells.")
        log(f"[+] EXPORT COMPLETED: {out_d}")
    except Exception: log(f"[-] Export Error:\n{traceback.format_exc()}")

def cmd_import(edit_d, nclr_p, ncgr_p, ncer_p, pal_base_id=0, do_lz10=False, lock_threshold=15, out_ncgr="new.NCGR", log=print):
    try:
        log("\n[--- STANDARD IN-PLACE IMPORT STARTED ---]")
        with open(nclr_p, 'rb') as f: nclr = smart_decompress(f.read())
        with open(ncgr_p, 'rb') as f: ncgr = smart_decompress(f.read())
        with open(ncer_p, 'rb') as f: ncer = smart_decompress(f.read())
        b_c = find_block(ncgr, (b'CHAR', b'RAHC'))
        b8_g = (struct.unpack_from('<I', ncgr, b_c + 8 + 0x04)[0] == 4)
        is_bitmap = check_is_bitmap(ncgr, b_c)
        g_o = struct.unpack_from('<I', ncgr, b_c + 8 + 0x14)[0]
        d_s = struct.unpack_from('<I', ncgr, b_c + 8 + 0x10)[0]
        t_m = bytearray(ncgr[b_c + 8 + g_o : b_c + 8 + g_o + d_s]); orig_t_m = bytearray(t_m)
        b_p = find_block(nclr, (b'PLTT', b'TTLP'))
        pal_raw = nclr[b_p + 8 + struct.unpack_from('<I', nclr, b_p + 8 + 0x0C)[0] :]
        pal = [cvt(v) for v in [struct.unpack_from('<H', pal_raw, i*2)[0] for i in range(len(pal_raw)//2)]]
        
        log(f"[*] BitDepth: {'8bpp' if b8_g else '4bpp'}. Mode: {'Linear(NCBR)' if is_bitmap else 'Tiled(NCGR)'}")
        
        tile_usage = {}
        n_c_total = struct.unpack_from('<H', ncer, find_block(ncer, (b'CEBK', b'KBEC')) + 8)[0]
        for cid in range(n_c_total):
            objs, _, _, _, _, _ = parse_cell(ncer, cid)
            for o in objs:
                ts = 64 if (o['b8'] if o['b8'] else b8_g) else 32
                st = o['addr_bytes'] // ts
                num = (o['w'] * o['h']) // 64 if is_bitmap else (o['w']//8)*(o['h']//8)
                for t in range(st, st+num): tile_usage[t] = tile_usage.get(t, 0) + 1
        locked_bg = {t for t, count in tile_usage.items() if count > lock_threshold}
        
        written_pix = set(); processed = 0
        for cid in range(n_c_total):
            png = os.path.join(edit_d, f"cell_{cid:03d}.png")
            if not os.path.exists(png): continue
            img = Image.open(png).convert('RGBA'); pix = img.load()
            objs, mX, mY, MX, MY, _ = parse_cell(ncer, cid)
            
            cell_modified = 0
            for o in reversed(objs): 
                is8 = o['b8'] if o['b8'] else b8_g
                ts = 64 if is8 else 32
                po, plen = (pal_base_id + o['pid']) * (256 if is8 else 16), (256 if is8 else 16)
                st = o['addr_bytes'] // ts
                
                # 背景锁保护判定，基于起始位置粗略判定
                if st in locked_bg: continue
                
                if is_bitmap:
                    for py in range(o['h']):
                        for px in range(o['w']):
                            if (st, px, py) in written_pix: continue
                            rX, rY = (o['w']-1-px) if o['fx'] else px, (o['h']-1-py) if o['fy'] else py
                            cX, cY = o['x'] + rX - mX, o['y'] + rY - mY
                            if 0 <= cX < img.width and 0 <= cY < img.height:
                                col = pix[cX, cY]
                                if col[3] > 128:
                                    inherited = False
                                    orig_v = get_px(orig_t_m, st, px, py, is8, True, o['w'])
                                    if orig_v > 0 and (orig_v + po) < len(pal):
                                        oc = pal[orig_v + po]
                                        if (col[0]-oc[0])**2 + (col[1]-oc[1])**2 + (col[2]-oc[2])**2 <= 9:
                                            set_px(t_m, st, px, py, orig_v, is8, True, o['w']); inherited = True
                                    if not inherited:
                                        b_d, best = 999999, 1
                                        for p_i in range(1, plen):
                                            idx = po + p_i
                                            if idx >= len(pal): break
                                            d = (col[0]-pal[idx][0])**2 + (col[1]-pal[idx][1])**2 + (col[2]-pal[idx][2])**2
                                            if d < b_d: b_d, best = d, p_i
                                        set_px(t_m, st, px, py, best, is8, True, o['w'])
                                    cell_modified += 1
                                else: set_px(t_m, st, px, py, 0, is8, True, o['w'])
                                written_pix.add((st, px, py))
                else:
                    for ty in range(o['h'] // 8):
                        for tx in range(o['w'] // 8):
                            tid = st + ty * (o['w'] // 8) + tx
                            if tid in locked_bg: continue
                            for py in range(8):
                                for px in range(8):
                                    if (tid, px, py) in written_pix: continue
                                    rX, rY = (o['w']-1-(tx*8+px)) if o['fx'] else (tx*8+px), (o['h']-1-(ty*8+py)) if o['fy'] else (ty*8+py)
                                    cX, cY = o['x'] + rX - mX, o['y'] + rY - mY
                                    if 0 <= cX < img.width and 0 <= cY < img.height:
                                        col = pix[cX, cY]
                                        if col[3] > 128:
                                            inherited = False
                                            orig_v = get_px(orig_t_m, tid, px, py, is8, False, 0)
                                            if orig_v > 0 and (orig_v + po) < len(pal):
                                                oc = pal[orig_v + po]
                                                if (col[0]-oc[0])**2 + (col[1]-oc[1])**2 + (col[2]-oc[2])**2 <= 9:
                                                    set_px(t_m, tid, px, py, orig_v, is8, False, 0); inherited = True
                                            if not inherited:
                                                b_d, best = 999999, 1
                                                for p_i in range(1, plen):
                                                    idx = po + p_i
                                                    if idx >= len(pal): break
                                                    d = (col[0]-pal[idx][0])**2 + (col[1]-pal[idx][1])**2 + (col[2]-pal[idx][2])**2
                                                    if d < b_d: b_d, best = d, p_i
                                                set_px(t_m, tid, px, py, best, is8, False, 0)
                                            cell_modified += 1
                                        else: set_px(t_m, tid, px, py, 0, is8, False, 0)
                                        written_pix.add((tid, px, py))
            log(f"[*] Cell {cid:03d}: Updated {cell_modified} pixels.")
            processed += 1
            
        final = bytearray(ncgr); final[b_c+8+g_o : b_c+8+g_o+d_s] = t_m
        if do_lz10 and NDSPY_AVAILABLE: final = ndspy.lz10.compress(final)
        d = os.path.dirname(os.path.abspath(out_ncgr))
        if d and not os.path.isdir(d): os.makedirs(d)
        with open(out_ncgr, 'wb') as f: f.write(final)
        log(f"[+] IMPORT COMPLETED: {processed} cells injected.")
    except Exception: log(f"[-] Import Error:\n{traceback.format_exc()}")

# ==========================================
# OBJ 模块 (同步更新为双轨制)
# ==========================================
def cmd_obj_export(nclr_p, ncgr_p, ncer_p, cell_id, mode, out_p, log=print):
    try:
        log(f"\n[--- OBJ MODE EXPORT (Cell {cell_id}) ---]")
        with open(nclr_p, 'rb') as f: nclr = smart_decompress(f.read())
        with open(ncgr_p, 'rb') as f: ncgr = smart_decompress(f.read())
        with open(ncer_p, 'rb') as f: ncer = smart_decompress(f.read())
        
        b_p, b_c = find_block(nclr, (b'PLTT', b'TTLP')), find_block(ncgr, (b'CHAR', b'RAHC'))
        pal_raw = nclr[b_p + 8 + struct.unpack_from('<I', nclr, b_p + 8 + 0x0C)[0] :]
        pal = [cvt(v) for v in [struct.unpack_from('<H', pal_raw, i*2)[0] for i in range(len(pal_raw)//2)]]
        
        b8_g = (struct.unpack_from('<I', ncgr, b_c+8+4)[0] == 4)
        is_bitmap = check_is_bitmap(ncgr, b_c)
        g_o = struct.unpack_from('<I', ncgr, b_c+8+20)[0]
        t_d = ncgr[b_c + 8 + g_o :]

        objs, mX, mY, MX, MY, _ = parse_cell(ncer, cell_id)
        if len(objs) == 0:
            log("[-] Cell is empty or does not exist."); return

        ncgr_dir = os.path.dirname(ncgr_p)
        ncgr_basename = os.path.splitext(os.path.basename(ncgr_p))[0]

        if mode == 0: # 模式 1: PNG + JSON
            out_base = os.path.join(ncgr_dir, f"{ncgr_basename}_cell_{cell_id:03d}_obj")
            img = Image.new('RGBA', (MX - mX, MY - mY), (0,0,0,0))
            pix = img.load()
            meta = []
            
            for i, o in enumerate(objs):
                is8 = o['b8'] if o['b8'] else b8_g
                ts = 64 if is8 else 32
                po = o['pid'] * (256 if is8 else 16)
                meta.append({'rx': o['x']-mX, 'ry': o['y']-mY, 'w': o['w'], 'h': o['h'], 
                             'addr_bytes': o['addr_bytes'], 'pid': o['pid'], 'b8': is8, 'fx': o['fx'], 'fy': o['fy']})
                
                if is_bitmap:
                    for py in range(o['h']):
                        for px in range(o['w']):
                            val = get_raw_px(t_d, o['addr_bytes'], px, py, is8, True, o['w'])
                            rX, rY = (o['w']-1-px) if o['fx'] else px, (o['h']-1-py) if o['fy'] else py
                            if val > 0 and val + po < len(pal):
                                pix[(o['x']-mX) + rX, (o['y']-mY) + rY] = pal[val + po]
                else:
                    for ty in range(o['h'] // 8):
                        for tx in range(o['w'] // 8):
                            byte_off = o['addr_bytes'] + (ty * (o['w'] // 8) + tx) * ts
                            for py in range(8):
                                for px in range(8):
                                    val = get_raw_px(t_d, byte_off, px, py, is8, False, 0)
                                    rX, rY = (o['w']-1-(tx*8+px)) if o['fx'] else (tx*8+px), (o['h']-1-(ty*8+py)) if o['fy'] else (ty*8+py)
                                    if val > 0 and val + po < len(pal):
                                        pix[(o['x']-mX) + rX, (o['y']-mY) + rY] = pal[val + po]
            
            img.save(f"{out_base}.png")
            with open(f"{out_base}.json", 'w') as f: json.dump(meta, f, indent=2)
            log(f"[+] Exported to: {out_base}.png and .json")

        else: # 模式 2: Folder
            out_dir = os.path.join(ncgr_dir, f"{ncgr_basename}_cell_{cell_id:03d}_OBJs")
            os.makedirs(out_dir, exist_ok=True)
            for i, o in enumerate(objs):
                is8 = o['b8'] if o['b8'] else b8_g
                ts = 64 if is8 else 32
                po = o['pid'] * (256 if is8 else 16)
                img = Image.new('RGBA', (o['w'], o['h']), (0,0,0,0))
                pix = img.load()
                
                if is_bitmap:
                    for py in range(o['h']):
                        for px in range(o['w']):
                            val = get_raw_px(t_d, o['addr_bytes'], px, py, is8, True, o['w'])
                            if val > 0 and val + po < len(pal):
                                pix[px, py] = pal[val + po]
                else:
                    for ty in range(o['h'] // 8):
                        for tx in range(o['w'] // 8):
                            byte_off = o['addr_bytes'] + (ty * (o['w'] // 8) + tx) * ts
                            for py in range(8):
                                for px in range(8):
                                    val = get_raw_px(t_d, byte_off, px, py, is8, False, 0)
                                    if val > 0 and val + po < len(pal):
                                        pix[tx*8+px, ty*8+py] = pal[val + po]
                img.save(os.path.join(out_dir, f"obj_{i:02d}.png"))
            log(f"[+] Exported {len(objs)} OBJ PNGs to: {out_dir}")

    except Exception: log(f"[-] OBJ Export Error:\n{traceback.format_exc()}")

def cmd_obj_import(import_src, nclr_p, ncgr_p, ncer_p, cell_id, mode, out_ncgr, do_lz10=False, log=print):
    try:
        log(f"\n[--- OBJ MODE IMPORT (Cell {cell_id}) ---]")
        if not os.path.exists(import_src):
            log(f"[-] ERROR: Source path does not exist: {import_src}"); return

        with open(nclr_p, 'rb') as f: nclr = smart_decompress(f.read())
        with open(ncgr_p, 'rb') as f: ncgr = smart_decompress(f.read())
        
        b_c = find_block(ncgr, (b'CHAR', b'RAHC'))
        is_bitmap = check_is_bitmap(ncgr, b_c)
        g_o = struct.unpack_from('<I', ncgr, b_c + 8 + 0x14)[0]
        d_s = struct.unpack_from('<I', ncgr, b_c + 8 + 0x10)[0]
        t_m = bytearray(ncgr[b_c + 8 + g_o : b_c + 8 + g_o + d_s])
        
        b_p = find_block(nclr, (b'PLTT', b'TTLP'))
        pal_raw = nclr[b_p + 8 + struct.unpack_from('<I', nclr, b_p + 8 + 0x0C)[0] :]
        pal = [cvt(v) for v in [struct.unpack_from('<H', pal_raw, i*2)[0] for i in range(len(pal_raw)//2)]]
        
        processed_objs = 0
        if mode == 0: # PNG + JSON
            base_name = os.path.splitext(import_src)[0]
            json_file = f"{base_name}.json"
            png_file = f"{base_name}.png"
            if not os.path.exists(json_file) or not os.path.exists(png_file):
                log("[-] ERROR: Required .json or .png file not found."); return
                
            with open(json_file, 'r') as f: meta = json.load(f)
            img = Image.open(png_file).convert('RGBA'); pix = img.load()
            
            for o in meta:
                is8, ts = o['b8'], (64 if o['b8'] else 32)
                po, plen = o['pid'] * (256 if is8 else 16), (256 if is8 else 16)
                
                if is_bitmap:
                    for py in range(o['h']):
                        for px in range(o['w']):
                            rX = (o['w']-1-px) if o.get('fx') else px
                            rY = (o['h']-1-py) if o.get('fy') else py
                            col = pix[o['rx'] + rX, o['ry'] + rY]
                            
                            if col[3] < 128: val = 0
                            else:
                                best, b_d = 0, 999999
                                for p_i in range(1, plen):
                                    if p_i + po >= len(pal): break
                                    c = pal[p_i + po]
                                    d = (col[0]-c[0])**2 + (col[1]-c[1])**2 + (col[2]-c[2])**2
                                    if d < b_d: b_d, best = d, p_i
                                val = best
                            set_raw_px(t_m, o['addr_bytes'], px, py, val, is8, True, o['w'])
                else:
                    for ty in range(o['h'] // 8):
                        for tx in range(o['w'] // 8):
                            byte_off = o['addr_bytes'] + (ty * (o['w'] // 8) + tx) * ts
                            for py in range(8):
                                for px in range(8):
                                    rX = (o['w']-1-(tx*8+px)) if o.get('fx') else (tx*8+px)
                                    rY = (o['h']-1-(ty*8+py)) if o.get('fy') else (ty*8+py)
                                    col = pix[o['rx'] + rX, o['ry'] + rY]
                                    
                                    if col[3] < 128: val = 0
                                    else:
                                        best, b_d = 0, 999999
                                        for p_i in range(1, plen):
                                            if p_i + po >= len(pal): break
                                            c = pal[p_i + po]
                                            d = (col[0]-c[0])**2 + (col[1]-c[1])**2 + (col[2]-c[2])**2
                                            if d < b_d: b_d, best = d, p_i
                                        val = best
                                    set_raw_px(t_m, byte_off, px, py, val, is8, False, 0)
                processed_objs += 1
                
        else: # Folder
            with open(ncer_p, 'rb') as f: ncer = smart_decompress(f.read())
            b8_g = (struct.unpack_from('<I', ncgr, b_c + 8 + 0x04)[0] == 4)
            objs, _, _, _, _, _ = parse_cell(ncer, cell_id)
            for i, o in enumerate(objs):
                p_path = os.path.join(import_src, f"obj_{i:02d}.png")
                if not os.path.exists(p_path): continue
                
                img = Image.open(p_path).convert('RGBA'); pix = img.load()
                is8 = o['b8'] if o['b8'] else b8_g
                ts, po, plen = (64 if is8 else 32), o['pid'] * (256 if is8 else 16), (256 if is8 else 16)
                
                if is_bitmap:
                    for py in range(o['h']):
                        for px in range(o['w']):
                            col = pix[px, py]
                            if col[3] < 128: val = 0
                            else:
                                best, b_d = 0, 999999
                                for p_i in range(1, plen):
                                    if p_i + po >= len(pal): break
                                    c = pal[p_i + po]
                                    d = (col[0]-c[0])**2 + (col[1]-c[1])**2 + (col[2]-c[2])**2
                                    if d < b_d: b_d, best = d, p_i
                                val = best
                            set_raw_px(t_m, o['addr_bytes'], px, py, val, is8, True, o['w'])
                else:
                    for ty in range(o['h'] // 8):
                        for tx in range(o['w'] // 8):
                            byte_off = o['addr_bytes'] + (ty * (o['w'] // 8) + tx) * ts
                            for py in range(8):
                                for px in range(8):
                                    col = pix[tx*8+px, ty*8+py]
                                    if col[3] < 128: val = 0
                                    else:
                                        best, b_d = 0, 999999
                                        for p_i in range(1, plen):
                                            if p_i + po >= len(pal): break
                                            c = pal[p_i + po]
                                            d = (col[0]-c[0])**2 + (col[1]-c[1])**2 + (col[2]-c[2])**2
                                            if d < b_d: b_d, best = d, p_i
                                        val = best
                                    set_raw_px(t_m, byte_off, px, py, val, is8, False, 0)
                processed_objs += 1

        final = bytearray(ncgr); final[b_c + 8 + g_o : b_c + 8 + g_o + d_s] = t_m
        if do_lz10 and NDSPY_AVAILABLE: final = ndspy.lz10.compress(final)
        d = os.path.dirname(os.path.abspath(out_ncgr))
        if d and not os.path.isdir(d): os.makedirs(d)
        with open(out_ncgr, 'wb') as f: f.write(final)
        log(f"[+] COMPLETED: Injected {processed_objs} OBJs into {out_ncgr}.")
    except Exception: log(f"[-] OBJ Import Error:\n{traceback.format_exc()}")

# ==========================================
# GUI 实现
# ==========================================
class CellFrame(wx.Frame):
    def __init__(self):
        super().__init__(None, title="DSCelluloid v8.6 (Linear Bitmap Edition)", size=(750, 780))
        panel = wx.Panel(self); vbox = wx.BoxSizer(wx.VERTICAL); self.notebook = wx.Notebook(panel)
        
        self.tab_ex = wx.Panel(self.notebook)
        self.tab_im = wx.Panel(self.notebook)
        self.tab_obj = wx.Panel(self.notebook)
        
        self.notebook.AddPage(self.tab_ex, "Standard Export")
        self.notebook.AddPage(self.tab_im, "Standard Import")
        self.notebook.AddPage(self.tab_obj, "OBJ Surgery")
        
        vbox.Add(self.notebook, 1, wx.EXPAND | wx.ALL, 5)
        self.log_txt = wx.TextCtrl(panel, style=wx.TE_MULTILINE | wx.TE_READONLY)
        font = wx.Font(10, wx.FONTFAMILY_TELETYPE, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_NORMAL)
        self.log_txt.SetFont(font)
        vbox.Add(wx.StaticText(panel, label="Execution Logs:"), 0, wx.LEFT, 10)
        vbox.Add(self.log_txt, 1, wx.EXPAND | wx.ALL, 10)
        
        self.last = {}
        self.setup_ex(); self.setup_im(); self.setup_obj()
        panel.SetSizer(vbox); self.Center()

    def log(self, msg): 
        self.log_txt.AppendText(msg + "\n")
        self.log_txt.ShowPosition(self.log_txt.GetLastPosition())

    def add_p(self, parent, sizer, row, label, wildcard, is_dir=False, is_save=False):
        sizer.Add(wx.StaticText(parent, label=label), pos=(row, 0), flag=wx.ALIGN_CENTER_VERTICAL|wx.ALL, border=5)
        t = wx.TextCtrl(parent); sizer.Add(t, pos=(row, 1), flag=wx.EXPAND|wx.ALL, border=5)
        b = wx.Button(parent, label="...")
        b.Bind(wx.EVT_BUTTON, lambda e: self.on_browse(t, is_dir, is_save, wildcard))
        sizer.Add(b, pos=(row, 2), flag=wx.ALL, border=5); return t

    def auto_fill(self, trigger, path):
        groups = [
            [self.ex_clr, self.ex_cgr, self.ex_cer],
            [self.im_clr, self.im_cgr, self.im_cer],
            [self.obj_clr, self.obj_cgr, self.obj_cer]
        ]
        target_group = None
        for g in groups:
            if trigger in g: target_group = g; break
        if not target_group: return
        
        base = os.path.splitext(path)[0]
        exts = {0:['.NCLR','.nclr','.RLCN','.rlcn'], 1:['.NCGR','.ncgr','.RGCN','.rgcn','.NCBR','.ncbr'], 2:['.NCER','.ncer','.RECN','.recn']}
        for i, ctrl in enumerate(target_group):
            if ctrl == trigger: continue
            for ex in exts[i]:
                if os.path.exists(base + ex): ctrl.SetValue(base+ex); break

        # Auto-prefill output NCGR path on Import / OBJ pages
        out = self.im_out if trigger is self.im_cgr else (self.obj_out_ncgr if trigger is self.obj_cgr else None)
        if out is not None:
            stem, ext = os.path.splitext(os.path.basename(path))
            tgt = os.path.join(os.path.dirname(path), "NEW", stem + ext)
            if not out.GetValue() or out.GetValue() == self.last.get(id(out)): out.SetValue(tgt)
            self.last[id(out)] = tgt

    def on_browse(self, txt, is_dir, is_save, wildcard):
        if is_dir:
            with wx.DirDialog(self, "Select Dir") as d:
                if d.ShowModal() == wx.ID_OK: txt.SetValue(d.GetPath())
        else:
            style = wx.FD_SAVE | wx.FD_OVERWRITE_PROMPT if is_save else wx.FD_OPEN | wx.FD_FILE_MUST_EXIST
            with wx.FileDialog(self, "Select File", wildcard=wildcard, style=style) as d:
                if d.ShowModal() == wx.ID_OK: 
                    txt.SetValue(d.GetPath())
                    if not is_save: self.auto_fill(txt, d.GetPath())

    def on_obj_browse_import(self, event):
        mode = self.obj_radio.GetSelection()
        if mode == 0: 
            with wx.FileDialog(self, "Select PNG Image", wildcard="PNG Image|*.png", style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST) as d:
                if d.ShowModal() == wx.ID_OK: self.obj_import_src.SetValue(d.GetPath())
        else: 
            with wx.DirDialog(self, "Select Directory containing OBJ PNGs") as d:
                if d.ShowModal() == wx.ID_OK: self.obj_import_src.SetValue(d.GetPath())

    def setup_ex(self):
        gs = wx.GridBagSizer(5, 5)
        self.ex_clr = self.add_p(self.tab_ex, gs, 0, "NCLR:", "Palette|*.NCLR;*.nclr;*.RLCN;*.rlcn")
        self.ex_cgr = self.add_p(self.tab_ex, gs, 1, "NCGR/NCBR:", "Graphics|*.NCGR;*.ncgr;*.RGCN;*.rgcn;*.NCBR;*.ncbr")
        self.ex_cer = self.add_p(self.tab_ex, gs, 2, "NCER:", "Cell|*.NCER;*.ncer;*.RECN;*.recn")
        self.ex_pal = wx.SpinCtrl(self.tab_ex, value='0', min=0, max=255)
        gs.Add(wx.StaticText(self.tab_ex, label="Pal Offset:"), pos=(3, 0), flag=wx.ALL, border=5); gs.Add(self.ex_pal, pos=(3, 1), flag=wx.ALL, border=5)
        gs.AddGrowableCol(1)
        btn = wx.Button(self.tab_ex, label="Run Export (Auto saves to Graphics directory)")
        btn.Bind(wx.EVT_BUTTON, lambda e: cmd_export(self.ex_clr.GetValue(), self.ex_cgr.GetValue(), self.ex_cer.GetValue(), self.ex_pal.GetValue(), None, self.log))
        gs.Add(btn, pos=(4, 0), span=(1, 3), flag=wx.EXPAND|wx.ALL, border=10); self.tab_ex.SetSizer(gs)

    def setup_im(self):
        gs = wx.GridBagSizer(5, 5)
        self.im_png = self.add_p(self.tab_im, gs, 0, "PNG Dir (Modified):", "", is_dir=True)
        self.im_clr = self.add_p(self.tab_im, gs, 1, "Orig NCLR:", "Palette|*.NCLR;*.nclr;*.RLCN;*.rlcn")
        self.im_cgr = self.add_p(self.tab_im, gs, 2, "Orig NCGR/NCBR:", "Graphics|*.NCGR;*.ncgr;*.RGCN;*.rgcn;*.NCBR;*.ncbr")
        self.im_cer = self.add_p(self.tab_im, gs, 3, "Orig NCER:", "Cell|*.NCER;*.ncer;*.RECN;*.recn")
        self.im_thresh = wx.SpinCtrl(self.tab_im, value='15', min=1, max=999)
        gs.Add(wx.StaticText(self.tab_im, label="Lock Threshold:"), pos=(4, 0), flag=wx.ALL, border=5); gs.Add(self.im_thresh, pos=(4, 1), flag=wx.ALL, border=5)
        self.im_lz10 = wx.CheckBox(self.tab_im, label="LZ10 Compress Output")
        gs.Add(self.im_lz10, pos=(5, 1), flag=wx.ALL, border=5)
        self.im_out = self.add_p(self.tab_im, gs, 6, "Save Graphics As:", "Graphics|*.NCGR;*.ncgr;*.RGCN;*.rgcn;*.NCBR;*.ncbr", is_save=True)
        gs.AddGrowableCol(1); btn = wx.Button(self.tab_im, label="Run Standard Import")
        btn.Bind(wx.EVT_BUTTON, lambda e: cmd_import(self.im_png.GetValue(), self.im_clr.GetValue(), self.im_cgr.GetValue(), self.im_cer.GetValue(), 0, self.im_lz10.GetValue(), self.im_thresh.GetValue(), self.im_out.GetValue(), self.log))
        gs.Add(btn, pos=(7, 0), span=(1, 3), flag=wx.EXPAND|wx.ALL, border=10); self.tab_im.SetSizer(gs)

    def setup_obj(self):
        gs = wx.GridBagSizer(5, 5)
        self.obj_clr = self.add_p(self.tab_obj, gs, 0, "NCLR:", "Palette|*.NCLR;*.nclr;*.RLCN;*.rlcn")
        self.obj_cgr = self.add_p(self.tab_obj, gs, 1, "NCGR/NCBR:", "Graphics|*.NCGR;*.ncgr;*.RGCN;*.rgcn;*.NCBR;*.ncbr")
        self.obj_cer = self.add_p(self.tab_obj, gs, 2, "NCER:", "Cell|*.NCER;*.ncer;*.RECN;*.recn")
        
        self.obj_cid = wx.SpinCtrl(self.tab_obj, value='85', min=0, max=9999)
        gs.Add(wx.StaticText(self.tab_obj, label="Target Cell ID:"), pos=(3, 0), flag=wx.ALIGN_CENTER_VERTICAL|wx.ALL, border=5)
        gs.Add(self.obj_cid, pos=(3, 1), flag=wx.ALL, border=5)
        
        self.obj_radio = wx.RadioBox(self.tab_obj, label="Operation Mode", choices=["Mode 1: Assembled PNG + JSON", "Mode 2: Isolated PNGs Folder"], majorDimension=1)
        gs.Add(self.obj_radio, pos=(4, 0), span=(1, 3), flag=wx.ALL | wx.EXPAND, border=5)
        
        btn_ex = wx.Button(self.tab_obj, label="Run OBJ Export (Auto-saves to Graphics dir)")
        btn_ex.Bind(wx.EVT_BUTTON, lambda e: cmd_obj_export(self.obj_clr.GetValue(), self.obj_cgr.GetValue(), self.obj_cer.GetValue(), self.obj_cid.GetValue(), self.obj_radio.GetSelection(), None, self.log))
        gs.Add(btn_ex, pos=(5, 0), span=(1, 3), flag=wx.EXPAND|wx.ALL, border=5)
        
        gs.Add(wx.StaticText(self.tab_obj, label="Import Source:"), pos=(6, 0), flag=wx.ALIGN_CENTER_VERTICAL|wx.ALL, border=5)
        self.obj_import_src = wx.TextCtrl(self.tab_obj)
        gs.Add(self.obj_import_src, pos=(6, 1), flag=wx.EXPAND|wx.ALL, border=5)
        btn_browse_im = wx.Button(self.tab_obj, label="...")
        btn_browse_im.Bind(wx.EVT_BUTTON, self.on_obj_browse_import)
        gs.Add(btn_browse_im, pos=(6, 2), flag=wx.ALL, border=5)
        
        self.obj_lz10 = wx.CheckBox(self.tab_obj, label="LZ10 Compress on Import")
        gs.Add(self.obj_lz10, pos=(7, 1), flag=wx.ALL, border=5)
        
        self.obj_out_ncgr = self.add_p(self.tab_obj, gs, 8, "Save Graphics As:", "Graphics|*.NCGR;*.ncgr;*.RGCN;*.rgcn;*.NCBR;*.ncbr", is_save=True)
        
        gs.AddGrowableCol(1)
        btn_im = wx.Button(self.tab_obj, label="Run OBJ Import")
        btn_im.Bind(wx.EVT_BUTTON, lambda e: cmd_obj_import(self.obj_import_src.GetValue(), self.obj_clr.GetValue(), self.obj_cgr.GetValue(), self.obj_cer.GetValue(), self.obj_radio.GetSelection(), self.obj_out_ncgr.GetValue(), self.obj_lz10.GetValue(), self.log))
        gs.Add(btn_im, pos=(9, 0), span=(1, 3), flag=wx.EXPAND|wx.ALL, border=10)
        
        self.tab_obj.SetSizer(gs)

if __name__ == "__main__":
    app = wx.App(); CellFrame().Show(); app.MainLoop()