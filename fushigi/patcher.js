/* =========================================================
   不可思议汉化组 — 在线打补丁（自动 / 手动）
   依赖：HashCalculator.js、BinFile.js、RomPatcher.js + 各格式模块
   所有处理在本地内存完成，文件不会上传。
   ========================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- 补丁源 ---------------- */
  var MS = 'https://modelscope.cn/datasets/flyheadko/TRANSLATE/resolve/master/';
  var GH = 'https://github.com/EiliaLan/fushigi_patcher/releases/download/1.0/';

  /* 支持自动匹配的整盘 CRC32 -> 平台 / 成品名 / 补丁地址（src 主源，back 备用源） */
  var TARGETS = {
    /* NDS 不可思议游戏DS */
    '991E4757': { key: 'nds', label: 'NDS', out: 'Fushigi Yuugi DS (CHINESE).nds',
                  src: [MS + 'FushigiYuugiDS.patch?view=false'],
                  back: [GH + 'FushigiYuugiDS.patch'],
                  game: '不可思议游戏DS' },
    /* PS2 不可思议游戏 朱雀异闻（限定版 DC1A0D1E 会在内存里归一化成这一版后再匹配） */
    'D1CE410B': { key: 'ps2', label: 'PS2', out: 'Fushigi Yuugi Suzaku Ibun (CHINESE).iso',
                  src: [MS + 'SUZAKU_PS2.PATCH?view=false'],
                  back: [GH + 'SUZAKU_PS2.PATCH'],
                  game: '不可思议游戏 朱雀异闻' },
    /* PS2 不可思议游戏 玄武开传外传 镜之巫女（限定版 FA881391 同上自动归一化） */
    '6FD8DFF6': { key: 'ps2', label: 'PS2', out: 'Fushigi Yuugi Kagami no Miko (CHINESE).iso',
                  src: [MS + 'Fushigi%20Yuugi%20-%20Genbu%20Kaiden%20Gaiden%20-%20Kagami%20no%20Miko%20(Japan)_patch.xdelta?view=false'],
                  back: [GH + 'Fushigi.Yuugi.-.Genbu.Kaiden.Gaiden.-.Kagami.no.Miko.Japan._patch.xdelta'],
                  game: '不可思议游戏 玄武开传外传 镜之巫女' },
    /* PSP 不可思议游戏 玄武开传外传 镜之巫女 */
    '0D68AF2E': { key: 'psp', label: 'PSP', out: 'Fushigi Yuugi Kagami no Miko PSP (CHINESE).iso',
                  src: [MS + 'PSP_Fushigi%20Yuugi%20-%20Genbu%20Kaiden%20Gaiden%20-%20Kagami%20no%20Miko_patch.xdelta?view=false'],
                  back: [GH + 'PSP_Fushigi.Yuugi.-.Genbu.Kaiden.Gaiden.-.Kagami.no.Miko_patch.xdelta'],
                  game: '不可思议游戏 玄武开传外传 镜之巫女' }
  };
  function targetFor(crc) {
    return TARGETS[crc] || (window.FushigiContent && window.FushigiContent.targets[crc]);
  }

  /* 同源变体：网上流传的 dump 有时被清过几段数据，与标准原版差几十到几百字节。
     补丁按标准原版做，这类 ROM 直接打会失败。命中就在内存里补回差异字节，
     磁盘文件不动，也不为每个变种单独做补丁。 */
  var FIXES = {
    '13D8B937': {
      label: '8004110 发行版',
      to: '991E4757',
      writes: [
        [0x33C, 'C6823BE5C3986F0B597546574B7056F6F2D09E45'],
        [0x378, '1787623EE8DD012815F73B46BE5C52378DC986109FCB1FB81DC3615CE6C410FA9DE2C76B494504A8'],
        [0xF80, '3D917C31D940557F7C1EC6A10EA841BB5B41083AE83EB0CC64754658F26E2E79397324F2330502663426A43B0D8CB0B1F49865B671F9625FC2C6A9547A1B22CB836684F88AF7FD5B45BB38FEC42CB9AC114792A25C23A3C60FE44B78FEA82B4CC81CF5B8345BB11E38D84B691C0EA996A2254778F0AA5ECAFB8B2686D719E490']
      ]
    }
  };

  /* ---------------- 元素 ---------------- */
  var elLog = $('pLog');
  var elSt = $('pSt');
  var elProg = $('pProg');
  var elProgBar = elProg.querySelector('i');
  var elRes = $('pRes');
  var elSlot = $('pSlot');
  var elSlotT = $('pSlotT');
  var elSlotS = $('pSlotS');
  var elSlotR = $('pSlotR');
  var elBar = $('pBar');
  var elRun = $('pRun');

  var S = { rom: null, pat: null, out: null, name: '' };
  var AUTO = { busy: false, done: false };
  var mode = 'auto';

  /* ---------------- 小工具 ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  function size(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(2) + ' MB';
    return (n / 1073741824).toFixed(3) + ' GB';
  }
  function crcHex(u8) {
    try { return HashCalculator.crc32(u8.buffer).toString(16).toUpperCase().padStart(8, '0'); }
    catch (e) { return null; }
  }
  function crc32(u8) {
    var h = crcHex(u8);
    return h === null ? 'n/a' : '0x' + h;
  }
  function log(msg, cls) {
    var t = new Date().toTimeString().slice(0, 8);
    elLog.insertAdjacentHTML('beforeend',
      '<span class="' + (cls || '') + '">[' + t + '] ' + esc(msg) + '</span>\n');
    elLog.scrollTop = elLog.scrollHeight;
  }
  function status(msg, cls) {
    elSt.textContent = msg;
    elSt.className = 'p-st' + (cls ? ' ' + cls : '');
  }
  function setSlot(cls, t, s, retry) {
    elSlot.className = 'p-slot ' + cls;
    elSlotT.textContent = t;
    elSlotS.textContent = s || '';
    elSlotR.hidden = !retry;
  }
  function setPct(p) {
    elProgBar.style.width = p + '%';
    var b = elProg.querySelector('.pct');
    if (!b) { b = document.createElement('div'); b.className = 'pct'; elProg.appendChild(b); }
    b.textContent = Math.round(p) + '%';
  }

  function unmatchedRom() {
    S.pat = null;
    AUTO.done = false;
    var state = window.FushigiContent && window.FushigiContent.state;
    $('dRom').classList.toggle('bad', state !== 'loading');
    if (state === 'loading') {
      setSlot('wait on', '正在加载游戏信息…', '加载完成后自动匹配补丁', false);
      status('游戏信息正在加载，请稍等…');
    } else if (state === 'error') {
      setSlot('fail', '游戏信息未加载', '请在游戏列表下方重新加载，或使用手动模式', false);
      status('更多游戏信息加载失败，请点游戏列表下方的「重新加载」，或改用手动模式', 'err');
    } else {
      setSlot('fail', '未匹配到补丁', '换一个原版镜像试试', false);
      log('没有匹配到补丁，可切到「手动模式」自行选择', 'err');
      status('这个镜像没有匹配到补丁，请切换到手动模式自行选择补丁文件', 'err');
    }
  }

  function catalogChanged() {
    if (mode !== 'auto' || !S.rom || S.out || AUTO.busy || AUTO.done) return;
    var matched = !!targetFor(S.rom.crc);
    $('mRom').textContent = size(S.rom.bytes.length);
    if (matched) {
      $('mRom').insertAdjacentHTML('beforeend', '  ·  <span class="pass">版本验证通过</span>');
      $('dRom').classList.remove('bad');
      autopatch();
    } else {
      if (!window.FushigiContent || window.FushigiContent.state !== 'loading') {
        $('mRom').insertAdjacentHTML('beforeend', '  ·  <span class="fail">未匹配到补丁</span>');
      }
      unmatchedRom();
      refresh();
    }
  }

  /* ---------------- 文件读取（分块，避开 >2GiB 的 Blob 限制） ---------------- */
  var CHUNK = 96 * 1024 * 1024;
  function readBig(f, tick, done, fail) {
    var u8;
    try { u8 = new Uint8Array(f.size); }
    catch (e) { fail('内存不足，装不下 ' + size(f.size) + ' 的文件'); return; }
    var off = 0;
    (function next() {
      if (off >= f.size) { done(u8); return; }
      var end = Math.min(off + CHUNK, f.size);
      var rd = new FileReader();
      rd.onerror = function () { fail('读取时出错（文件可能被占用）'); };
      rd.onload = function () {
        try { u8.set(new Uint8Array(rd.result), off); }
        catch (e) { fail('内存不足（' + (e && e.message) + '）'); return; }
        off = end;
        if (tick) tick(off, f.size);
        next();
      };
      rd.readAsArrayBuffer(f.slice(off, end));
    })();
  }

  /* ---------------- 文件头识别（只看 magic，不看扩展名） ---------------- */
  var MAGICS = [
    { m: 'PATCH', n: 'IPS' },
    { m: 'UPS1', n: 'UPS' },
    { m: 'APS10', n: 'APS (N64)' },
    { m: 'APS1', n: 'APS (GBA)' },
    { m: 'BPS1', n: 'BPS' },
    { m: 'NINJA2', n: 'RUP' },
    { m: 'PPF', n: 'PPF' },
    { m: 'BSDIFF40', n: 'BDF (bsdiff)' },
    { m: 'PMSR', n: 'PMSR' },
    { m: 'Yay0', n: 'PMSR / Yay0' }
  ];
  function head(b, n) {
    var s = '';
    for (var i = 0; i < n && i < b.length; i++) {
      if (b[i] < 0x20 || b[i] > 0x7e) return null;
      s += String.fromCharCode(b[i]);
    }
    return s;
  }
  function identify(b) {
    if (b.length >= 3 && b[0] === 0xd6 && b[1] === 0xc3 && b[2] === 0xc4) {
      return { name: 'VCDIFF (xdelta)', flags: b.length > 3 ? b[3] : 0 };
    }
    for (var i = 0; i < MAGICS.length; i++) {
      if (head(b, MAGICS[i].m.length) === MAGICS[i].m) return { name: MAGICS[i].n, flags: 0 };
    }
    return { name: null, flags: 0 };
  }

  /* ---------------- 变体还原 / PS2 版次归一化 ---------------- */
  function tryFix(u8, hx) {
    var f = FIXES[hx];
    if (!f) return null;
    var undo = [], bytes = 0;
    for (var k = 0; k < f.writes.length; k++) {
      var off = f.writes[k][0], hex = f.writes[k][1], n = hex.length >> 1;
      if (off + n > u8.length) return null;
      undo.push([off, u8.slice(off, off + n)]);
      for (var i = 0; i < n; i++) u8[off + i] = parseInt(hex.substr(i * 2, 2), 16);
      bytes += n;
    }
    if (crcHex(u8) !== f.to) {
      for (var j = 0; j < undo.length; j++) u8.set(undo[j][1], undo[j][0]);
      return null;
    }
    return { crc: f.to, label: f.label, bytes: bytes };
  }

  /* 头部 CRC32：只算前 limit 字节，避免为了认版本去扫 2GB */
  function headHex(u8, limit) {
    try {
      return HashCalculator.crc32(u8.slice(0, limit).buffer)
        .toString(16).toUpperCase().padStart(8, '0');
    } catch (e) { return null; }
  }
  function normOf(hx) {
    if (typeof NORMS === 'undefined') return null;
    for (var i = 0; i < NORMS.length; i++) if (NORMS[i].alt === hx) return NORMS[i];
    return null;
  }
  /* 就地按规则改写，返回可用于回滚的原始字节 */
  function normApply(u8, e) {
    var r = e.rules, undo = [], i, k, x, o, n, v, hex;
    for (i = 0; i < r.length; i++) {
      x = r[i]; o = x.o;
      n = x.h ? (x.h.length >> 1) : x.n;
      undo.push([o, u8.slice(o, o + n)]);
      if (x.x !== undefined) {
        v = parseInt(x.x, 16);
        for (k = 0; k < n; k++) u8[o + k] ^= v;
      } else if (x.b !== undefined) {
        v = parseInt(x.b, 16);
        for (k = 0; k < n; k++) u8[o + k] = v;
      } else {
        hex = x.h;
        for (k = 0; k < n; k++) u8[o + k] = parseInt(hex.substr(k * 2, 2), 16);
      }
    }
    return undo;
  }
  function normUndo(u8, undo) {
    for (var i = 0; i < undo.length; i++) u8.set(undo[i][1], undo[i][0]);
  }

  /* ---------------- 拖放 / 选择 ---------------- */
  function bind(dropId, inputId, key, nameId, metaId) {
    var drop = $(dropId);
    var input = $(inputId);

    drop.addEventListener('click', function (ev) {
      if (ev.target !== input) input.click();
    });
    input.addEventListener('change', function () { if (input.files[0]) take(input.files[0]); });
    ['dragenter', 'dragover'].forEach(function (e) {
      drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (e) {
      drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (ev) {
      if (ev.dataTransfer.files[0]) take(ev.dataTransfer.files[0]);
    });

    function take(f) {
      var metaEl = $(metaId);

      metaEl.textContent = '';
      if (key === 'rom') {
        S.out = null;
        elRes.classList.remove('on');
        elBar.classList.remove('hide');
        elSlot.classList.remove('hide');
        if (mode === 'auto') setSlot('wait on', '正在验证 ROM/镜像…', '读取文件并计算整盘校验值', false);
      }

      readBig(f, function (got, total) {
        metaEl.textContent = '读取中 ' + Math.round(got / total * 100) + '%…';
      }, function (u8) {
        var info = identify(u8);
        var hx = crcHex(u8);
        var orig = hx;
        var fix = null;

        if (key === 'rom' && hx && !targetFor(hx)) {
          fix = tryFix(u8, hx);
          if (fix) {
            hx = fix.crc;
          }
        }

        if (key === 'rom' && hx && !targetFor(hx)) {
          var ne = normOf(hx);
          if (ne) {
            if (u8.length !== ne.size) {
              log('镜像版本不符，无法继续', 'err');
            } else {
              var undo = normApply(u8, ne);
              if (headHex(u8, ne.limit) !== ne.head) {
                normUndo(u8, undo);
                log('镜像校验未通过，文件未改动', 'err');
              } else {
                hx = ne.base;
                fix = { label: ne.label, to: ne.base, bytes: 0 };
              }
            }
          }
        }

        S[key] = { name: f.name, bytes: u8, fmt: info.name, crc: hx };
        S.out = null;
        $(nameId).textContent = f.name;
        metaEl.textContent = size(u8.length) +
          (key === 'pat' ? '  ·  ' + (info.name || '未知格式') : '');

        var matched = !!(hx && targetFor(hx));

        if (key === 'rom') {
          if (matched) {
            metaEl.insertAdjacentHTML('beforeend', '  ·  <span class="pass">版本验证通过</span>');
            drop.classList.remove('bad');
          } else if (mode === 'auto') {
            /* 自动模式必须认出是哪个补丁，认不出就不能往下走 */
            if (!window.FushigiContent || window.FushigiContent.state !== 'loading') {
              metaEl.insertAdjacentHTML('beforeend', '  ·  <span class="fail">未匹配到补丁</span>');
            }
            unmatchedRom();
          } else {
            metaEl.insertAdjacentHTML('beforeend', '  ·  <span class="pass">手动模式</span>');
            drop.classList.remove('bad');
          }
        }

        drop.classList.add('filled');
        log('已选择：' + f.name);

        if (key === 'rom' && matched && mode === 'auto') autopatch();
        if (key === 'pat' && info.name === null) {
          log('补丁文件无法识别', 'warn');
        }
        refresh();
      }, function (msg) {
        metaEl.textContent = '';
        log('读取失败：' + msg, 'err');
        status('文件读取失败：' + msg, 'err');
        if (key === 'rom') setSlot('fail', '读取失败', msg, false);
      });
    }
  }

  /* ---------------- 自动获取补丁 ---------------- */
  function autopatch() {
    if (AUTO.busy) return;
    var t = S.rom && S.rom.crc ? targetFor(S.rom.crc) : null;
    if (!t) {
      unmatchedRom();
      return;
    }
    var PIECES = (t.src || []).slice();
    var BACK = t.back || [];
    if (!PIECES.length) {
      setSlot('fail', '补丁源未配置', '该平台还没有补丁地址', false);
      return;
    }

    AUTO.busy = true;
    AUTO.done = false;
    S.pat = null;
    S.out = null;
    elRun.disabled = true;
    elProg.classList.add('on');
    setPct(0);
    setSlot('wait on', '正在获取补丁…', '准备中', false);
    status('正在获取 ' + t.label + ' 补丁，请稍等片刻…');
    elLog.textContent = '';

    var total = 0, got = 0, chunks = [];

    function bump() {
      var p = total > 0 ? got / total : 0;
      setPct(Math.min(100, Math.round(p * 100)));
      elSlotS.textContent = '已加载 ' + size(got) + ' / ' + size(total || 0);
    }

    /* 单址下载；失败时若还有备用源就重来一次 */
    function pull(u, alt, i) {
      var base = got;
      return fetch(u, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var rd = r.body && r.body.getReader ? r.body.getReader() : null;
        if (!rd) {
          return r.arrayBuffer().then(function (ab) {
            chunks[i] = new Uint8Array(ab);
            got += ab.byteLength;
            bump();
          });
        }
        var parts = [], len = 0;
        return (function pump() {
          return rd.read().then(function (res) {
            if (res.done) {
              var outb = new Uint8Array(len), off = 0;
              parts.forEach(function (c) { outb.set(c, off); off += c.length; });
              chunks[i] = outb;
              return;
            }
            parts.push(res.value);
            len += res.value.length;
            got += res.value.length;
            bump();
            return pump();
          });
        })();
      }).catch(function (e) {
        if (!alt) throw e;
        got = base;
        bump();
        status('主源不可用，正在从备用源获取补丁…');
        return pull(alt, null, i);
      });
    }

    /* 先用 HEAD 探一遍，主源不通就换成备用地址 */
    Promise.all(PIECES.map(function (u, i) {
      return fetch(u, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        total += parseInt(r.headers.get('content-length') || '0', 10) || 0;
      }).catch(function () {
        var alt = BACK[i];
        if (!alt) return;
        return fetch(alt, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
          if (!r.ok) return;
          total += parseInt(r.headers.get('content-length') || '0', 10) || 0;
          PIECES[i] = alt;
        }).catch(function () { /* 备用源 HEAD 也失败，下载阶段再试 */ });
      });
    })).then(function () {
      if (!total) total = PIECES.length;
      bump();
      return Promise.all(PIECES.map(function (u, i) {
        var alt = BACK[i] && BACK[i] !== u ? BACK[i] : null;
        return pull(u, alt, i);
      }));
    }).then(function () {
      var n = 0;
      chunks.forEach(function (c) { if (c) n += c.length; });
      var all = new Uint8Array(n), off = 0;
      chunks.forEach(function (c) { if (c) { all.set(c, off); off += c.length; } });

      var info = identify(all);
      S.pat = { name: 'patch', bytes: all, fmt: info.name };
      AUTO.busy = false;
      AUTO.done = true;

      elProg.classList.remove('on');
      setSlot('done', '补丁已就绪，正在应用补丁', '准备完成', false);
      log('补丁已获取', 'ok');

      if (mode === 'auto') {
        status('补丁就绪，正在自动打补丁，请勿关闭页面…');
        setTimeout(applyPatch, 60);
      } else {
        status('补丁就绪，可以开始打补丁了');
      }
      refresh();
    }).catch(function (e) {
      AUTO.busy = false;
      elProg.classList.remove('on');
      setSlot('fail', '补丁获取失败', '点右侧重试', true);
      log('补丁获取失败', 'err');
      status('补丁获取失败，可点「重新获取」重试，或改用手动模式', 'err');
      refresh();
    });
  }

  /* ---------------- 模式 ---------------- */
  function setMode(m) {
    if (m === mode) return;
    if (S.out) {
      log('已生成汉化版，如需重来请先点「重置」', 'warn');
      return;
    }
    mode = m;
    $('pMAuto').classList.toggle('on', m === 'auto');
    $('pMMan').classList.toggle('on', m === 'man');
    $('dPat').classList.toggle('hide', m === 'auto');
    elSlot.classList.remove('hide');

    if (m === 'auto') {
      S.pat = null;
      S.out = null;
      AUTO.done = false;
      $('nPat').textContent = '';
      $('mPat').textContent = '';
      $('dPat').classList.remove('filled');
      $('fPat').value = '';
      setSlot('on', '等待 ROM/镜像', '选择原版 ROM/镜像 后自动获取补丁', false);
      if (S.rom) autopatch();
    } else {
      elProg.classList.remove('on');
      AUTO.busy = false;
      setSlot('on', '手动模式', '请同时选择原版 ROM/镜像 和补丁文件', false);
      if (S.rom) log('已切换到手动模式');
    }
    refresh();
  }

  /* ---------------- 应用 ---------------- */
  function romOk() {
    return !!(S.rom && S.rom.crc && targetFor(S.rom.crc));
  }
  function canRun() {
    if (!S.rom || !S.pat || AUTO.busy) return false;
    /* 自动模式必须版本命中；手动模式只要求补丁自带校验 */
    return mode === 'auto' ? romOk() : true;
  }
  function refresh() {
    elRun.disabled = !canRun();
  }

  function applyPatch() {
    if (!S.rom || !S.pat) return;

    elRun.disabled = true;
    elProg.classList.add('on');
    setPct(0);
    status('正在处理，请勿关闭页面…');

    setTimeout(function () {
      try {
        var romFile = new BinFile(S.rom.bytes);
        romFile.fileName = S.rom.name;
        var patFile = new BinFile(S.pat.bytes);
        patFile.fileName = S.pat.name;

        var patch = RomPatcher.parsePatchFile(patFile);
        if (!patch) throw new Error('Invalid patch file');

        var t0 = performance.now();
        var out = RomPatcher.applyPatch(romFile, patch, { requireValidation: true });
        var dt = (performance.now() - t0) / 1000;

        S.out = out._u8array;
        S.name = outName();

        log('补丁应用完成', 'ok');

        $('pName').textContent = S.name;
        $('pMeta').textContent = size(S.out.length) + '  ·  用时 ' + dt.toFixed(1) + ' 秒';
        var sh = $('pSaveHint');
        if (sh) sh.textContent = '保存前请确认目标磁盘至少有 ' +
          Math.max(1, Math.ceil(S.out.length / 1073741824 * 2)) + 'GB 空余空间';
        elRes.classList.add('on');
        elBar.classList.add('hide');
        elSlot.classList.add('hide');
        status('补丁应用成功，可以保存了', 'ok');
      } catch (e) {
        var msg = String((e && e.message) || e);
        log('补丁应用失败', 'err');
        if (/secondary decompressor|deltaIndicator|not implemented/i.test(msg)) {
          status('这个补丁浏览器解不了，请改用本地补丁工具', 'err');
        } else {
          status('应用失败，请确认镜像版本，或改用本地补丁工具', 'err');
        }
      } finally {
        elProg.classList.remove('on');
        refresh();
      }
    }, 30);
  }

  function outName() {
    var t = S.rom && S.rom.crc ? targetFor(S.rom.crc) : null;
    if (t && t.out) return t.out;
    var n = S.rom ? S.rom.name : 'rom.bin';
    var m = n.match(/(\.[^.]+)$/);
    return n.replace(/(\.[^.]+)$/, '') + '_汉化' + (m ? m[1] : '.bin');
  }

  /* ---------------- 保存 ---------------- */
  function writeAll(w, u8, onStep) {
    var CH = 8 * 1024 * 1024, off = 0;
    return (function step() {
      if (off >= u8.length) return Promise.resolve();
      var end = Math.min(off + CH, u8.length);
      var part = u8.slice(off, end);
      return w.write(part).then(function () {
        off = end;
        if (onStep) onStep(off / u8.length);
        return step();
      });
    })();
  }

  var sbWrap = $('pSbWrap');
  var sbProg = $('pSbProg').querySelector('i');
  var sbPct = $('pSbPct');
  function saveBar(on, p) {
    sbWrap.classList.toggle('on', on);
    if (p !== undefined) {
      sbProg.style.width = Math.round(p * 100) + '%';
      sbPct.textContent = Math.round(p * 100) + '%';
    }
  }

  var MOBILE = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh|Mac OS X/.test(navigator.userAgent));
  var INAPP = /MicroMessenger|QQ\/|Weibo|BiliApp|baiduboxapp|AlipayClient|DingTalk/i.test(navigator.userAgent);

  function shareFile() {
    return new Promise(function (resolve) {
      var f;
      try { f = new File([S.out], S.name, { type: 'application/octet-stream' }); }
      catch (e) { resolve('no'); return; }
      if (!navigator.share || !navigator.canShare || !navigator.canShare({ files: [f] })) {
        resolve('no'); return;
      }
      navigator.share({ files: [f], title: S.name }).then(function () {
        resolve('ok');
      }).catch(function (e) {
        resolve(e && e.name === 'AbortError' ? 'cancel' : 'no');
      });
    });
  }

  function anchorDownload(okMsg) {
    var hint = $('pSaveHint');
    var url = URL.createObjectURL(new Blob([S.out]));
    var framed = false;
    try { framed = window.top !== window.self; } catch (e) { framed = true; }

    if (!framed) {
      try {
        var a = document.createElement('a');
        a.href = url;
        a.download = S.name;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        log('已开始下载', 'ok');
        status('已开始下载，请留意浏览器下载列表', 'ok');
        if (hint) hint.textContent = okMsg || '文件将保存到浏览器默认下载目录';
      } catch (e) {
        window.open(url, '_blank');
        status('已在新页面开始下载', 'ok');
      }
    } else {
      window.open(url, '_blank');
      status('已在新页面开始下载', 'ok');
      if (hint) hint.textContent = '文件已在新页面开始下载，请留意浏览器下载列表';
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function downloadDirect() {
    if (!S.out) return;
    var hint = $('pSaveHint');

    if (MOBILE) {
      if (INAPP) {
        log('内置浏览器无法下载', 'warn');
        status('请点右上角「…」→「在浏览器打开」后再下载', 'err');
        if (hint) hint.textContent = '请点右上角「…」→「在浏览器打开」后重试';
        return;
      }
      status('正在准备文件，稍后会弹出系统面板…');
      shareFile().then(function (r) {
        if (r === 'ok') { status('已通过系统面板保存', 'ok'); return; }
        if (r === 'cancel') { status('已取消保存'); return; }
        anchorDownload('已开始下载，请到「文件」App 或浏览器下载列表里查看');
      });
      return;
    }
    anchorDownload();
  }

  function saveAs() {
    if (!S.out) return;
    var hint = $('pSaveHint');
    var canPicker = false;
    try { canPicker = !!(window.showSaveFilePicker && window.top === window.self); }
    catch (e) { canPicker = false; }

    if (!canPicker) { downloadDirect(); return; }

    var exM = S.name.match(/\.[^.]+$/);
    var ex = exM ? exM[0].toLowerCase() : '.bin';
    window.showSaveFilePicker({
      suggestedName: S.name,
      types: [{ description: '汉化版游戏', accept: { 'application/octet-stream': [ex] } }]
    }).then(function (h) {
      return h.createWritable();
    }).then(function (w) {
      status('正在写入文件，请勿关闭页面…');
      saveBar(true, 0);
      return writeAll(w, S.out, function (p) { saveBar(true, p); })
        .then(function () { return w.close(); });
    }).then(function () {
      saveBar(false);
      status('汉化版游戏已保存', 'ok');
      if (hint) hint.textContent = '文件已保存到指定位置';
    }).catch(function (e) {
      saveBar(false);
      if (e && e.name === 'AbortError') { status('已取消保存'); return; }
      downloadDirect();
    });
  }

  /* 环境提示：手机端隐藏「另存为」（浏览器没这个能力） */
  (function envHint() {
    var hint = $('pSaveHint');
    if (MOBILE) {
      var b2 = $('pSave');
      if (b2) b2.style.display = 'none';
    }
    if (!hint) return;
    if (INAPP) hint.textContent = '当前在 App 内置浏览器中，点右上角「…」→「在浏览器打开」后再下载';
    else if (MOBILE) hint.textContent = '手机会弹出系统面板，选「存储到文件 / 下载」保存';
    else hint.textContent = '直接下载进浏览器默认目录；另存为可自选位置';
  })();

  /* ---------------- 重置 ---------------- */
  function reset() {
    S = { rom: null, pat: null, out: null, name: '' };
    AUTO.busy = false;
    AUTO.done = false;
    ['nRom', 'mRom', 'nPat', 'mPat'].forEach(function (id) { $(id).textContent = ''; });
    $('fRom').value = '';
    $('fPat').value = '';
    $('dRom').classList.remove('filled', 'bad');
    $('dPat').classList.remove('filled');
    elProg.classList.remove('on');
    setPct(0);
    elBar.classList.remove('hide');
    elSlot.classList.remove('hide');
    elRes.classList.remove('on');
    saveBar(false);
    setSlot('on', '等待 ROM/镜像',
      mode === 'auto' ? '选择原版 ROM/镜像 后自动获取补丁' : '请同时选择原版 ROM/镜像 和补丁文件', false);
    elLog.textContent = '';
    status('选择原版 ROM/镜像 后开始  ·  文件不会上传服务器，全部在本地完成');
    refresh();
    log('已重置');
  }

  /* ---------------- 事件绑定 ---------------- */
  document.addEventListener('fushigi:content-loading', catalogChanged);
  document.addEventListener('fushigi:content-ready', catalogChanged);
  document.addEventListener('fushigi:content-error', catalogChanged);
  $('pMAuto').addEventListener('click', function () { setMode('auto'); });
  $('pMMan').addEventListener('click', function () { setMode('man'); });
  elSlotR.addEventListener('click', function () { if (mode === 'auto' && S.rom) autopatch(); });
  elRun.addEventListener('click', applyPatch);
  $('pDl').addEventListener('click', downloadDirect);
  $('pSave').addEventListener('click', saveAs);
  $('pRst').addEventListener('click', reset);

  /* ---------------- 本地补丁工具下载：主源 -> GitHub 备用 -> 报错 ---------------- */
  var elDl = $('pLocal');
  var elDlMsg = $('pLocalMsg');
  var dlBusy = false;

  function dlSay(msg, cls) {
    if (!elDlMsg) return;
    elDlMsg.textContent = msg || '';
    elDlMsg.className = 'pl-msg' + (cls ? ' ' + cls : '');
  }

  /* 探测单个地址：先拿真实状态码，被 CORS 挡住时只判断域名是否可达 */
  function dlProbe(url) {
    function once(opt, ms) {
      return new Promise(function (res) {
        var ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var tm = setTimeout(function () { if (ac) ac.abort(); res(false); }, ms);
        fetch(url, Object.assign({ cache: 'no-store', signal: ac ? ac.signal : undefined }, opt))
          .then(function (r) {
            clearTimeout(tm);
            if (opt.mode === 'no-cors') return res(true);
            var bad = r.status === 403 || r.status === 404 || r.status === 410;
            res(!bad && (r.ok || r.status === 206 || r.status === 416));
          })
          .catch(function () { clearTimeout(tm); res(false); });
      });
    }
    return once({ method: 'GET', headers: { Range: 'bytes=0-0' } }, 5000).then(function (ok) {
      if (ok) return true;
      return once({ method: 'HEAD', mode: 'no-cors' }, 4000);
    });
  }

  function dlFail() {
    if (!elDlMsg) return;
    elDlMsg.className = 'pl-msg err';
    elDlMsg.innerHTML = '两个下载源都连不上，请稍后重试，或手动打开 ' +
      '<a href="' + elDl.href + '" target="_blank" rel="noopener">主源</a> / ' +
      '<a href="' + elDl.dataset.alt + '" target="_blank" rel="noopener">备用源</a>。';
  }

  if (elDl && elDl.dataset.alt) {
    elDl.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (dlBusy) return;
      dlBusy = true;
      dlSay('正在检查下载源…');
      dlProbe(elDl.href).then(function (ok) {
        if (ok) {
          dlBusy = false;
          dlSay('');
          location.href = elDl.href;
          return null;
        }
        dlSay('主下载源不可用，正在切换备用源…');
        return dlProbe(elDl.dataset.alt).then(function (ok2) {
          dlBusy = false;
          if (ok2) {
            dlSay('已切换到 GitHub 备用源', 'ok');
            location.href = elDl.dataset.alt;
          } else {
            dlFail();
          }
        });
      });
    });
  }

  bind('dRom', 'fRom', 'rom', 'nRom', 'mRom');
  bind('dPat', 'fPat', 'pat', 'nPat', 'mPat');

  setSlot('on', '等待 ROM/镜像', '选择原版 ROM/镜像 后自动获取补丁', false);
  refresh();
})();
