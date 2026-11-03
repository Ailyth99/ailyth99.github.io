# -*- coding: utf-8 -*-
"""
build.py —— 神々の悪戯 攻略站 构建脚本
------------------------------------------------
用法:  python build.py
  读取 攻略.md + quiz.json
  生成 index.html + quiz-data.js
纯标准库，无第三方依赖。
"""
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
MD_PATH = os.path.join(HERE, "攻略.md")
QUIZ_PATH = os.path.join(HERE, "quiz.json")
OUT_HTML = os.path.join(HERE, "index.html")
OUT_QUIZ = os.path.join(HERE, "quiz-data.js")
OUT_CSS = os.path.join(HERE, "style.css")
OUT_APP = os.path.join(HERE, "app.js")
OUT_QUIZJS = os.path.join(HERE, "quiz.js")

# 页脚访问统计小图标
VISITOR = ("https://visitor-badge.laobi.icu/badge?page_id=kamigamiguideraw.visitor-badge"
         "&left_text=%E7%A5%9E%20%20%20%E3%81%AE%20%E5%AD%90"
         "&left_color=%23f4aa0b&right_color=%23ababab&logo=vercel&height=25")

# 大区块 → 独立页面文件名（未列出的区块自动分配 pageN.html）
PAGE_FILE = {
    "基本信息": "index.html",
    "攻略限制与推荐顺序": "limits.html",
    "角色路线": "routes.html",
    "箱庭模式": "hakoniwa.html",
}
# 页面副标题
PAGE_SUB = {
    "基本信息": "游戏概要 · 声优阵容 · 系统说明",
    "攻略限制与推荐顺序": "解锁条件 · 推荐攻略顺序",
    "角色路线": "8 名攻略对象 · 逐选项流程",
    "箱庭模式": "EPISODE 组合一览",
    "题库使用说明": "400 题神话问答 · 搜索与自测",
}

# 题库分类映射：文件索引 → 神话体系
CAT_MAP = {"00": "greek", "01": "japan", "02": "norse", "03": "egypt"}
CAT_NAME = {"greek": "希腊", "japan": "日本", "norse": "北欧", "egypt": "埃及"}

# 中文题面已脱离日文原意的题（原为「读音题」本地化改写，日文原文保留读音题）：
# 站点上不显示日文原题行，避免中/日文题面互相矛盾。
NO_JP_IDS = {536, 537, 539, 540}


# ================================================================ Markdown

def parse_md(text):
    text = re.sub(r"^\s*<!--.*?-->\s*", "", text, flags=re.S)
    meta = {}
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, flags=re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        text = text[m.end():]
    return meta, text


def split_sections(text):
    sections, cur = [], {"title": None, "lines": []}
    for ln in text.splitlines():
        if ln.startswith("# ") and not ln.startswith("## "):
            sections.append(cur)
            cur = {"title": ln[2:].strip(), "lines": []}
        else:
            cur["lines"].append(ln)
    sections.append(cur)
    return sections


def parse_blocks(lines):
    blocks, i, n = [], 0, len(lines)
    while i < n:
        raw, s = lines[i], lines[i].strip()
        if not s:
            i += 1
            continue
        # 建站提示行不上页面
        if s.startswith("内容编辑于"):
            i += 1
            continue
        if s == "---":
            blocks.append(("hr", None)); i += 1; continue
        if raw.startswith("### "):
            blocks.append(("h3", raw[4:].strip())); i += 1; continue
        if raw.startswith("## "):
            blocks.append(("h2", raw[3:].strip())); i += 1; continue
        if s.startswith("|"):
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(lines[i].strip()); i += 1
            blocks.append(("table", rows)); continue
        if raw.startswith("> "):
            q = []
            while i < n and lines[i].startswith("> "):
                q.append(lines[i][2:].strip()); i += 1
            blocks.append(("quote", q)); continue
        if raw.startswith("- "):
            items = []
            while i < n:
                l2 = lines[i]
                if l2.startswith("- "):
                    items.append({"text": l2[2:].strip(), "subs": []}); i += 1
                elif l2.startswith("  ") and l2.strip().startswith("- ") and items:
                    items[-1]["subs"].append(l2.strip()[2:].strip()); i += 1
                else:
                    break
            blocks.append(("list", items)); continue
        p = [s]; i += 1
        while i < n:
            l2 = lines[i]; t2 = l2.strip()
            if (not t2 or t2 == "---" or l2.startswith(("#", "|", "> ", "- "))
                    or (l2.startswith("  ") and t2.startswith("- "))):
                break
            p.append(t2); i += 1
        blocks.append(("para", " ".join(p)))
    return blocks


def esc(s):
    return html.escape(s, quote=False)


def inline(s):
    s = esc(s)
    s = s.replace("&lt;br&gt;", "<br>")          # 允许 md 内用 <br> 手动换行
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)",
               r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    return s


def render_table(rows):
    def cells(r):
        return [c.strip() for c in r.strip().strip("|").split("|")]

    head = cells(rows[0])
    body = [cells(r) for r in rows[1:] if not re.fullmatch(r"\|?[\s:|-]+\|?", r)]
    out = ['<div class="tbl-wrap"><table><thead><tr>']
    out += [f"<th>{inline(c)}</th>" for c in head]
    out.append("</tr></thead><tbody>")
    for r in body:
        out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)


# ================================================================ 角色路线

META_PAT = re.compile(r"^(CV|神话|解锁|结局|共通)\s*[:：]\s*(.*)$")


def step_html(t, idx):
    """返回 (class, html, new_idx)"""
    t = t.strip()
    if t.startswith("★"):
        return ("save", f'<div class="step save"><span class="ic">💾</span>'
                        f'<span>{esc(t[1:].strip())}</span></div>', idx)
    if t.startswith("【分歧】"):
        body = t[len("【分歧】"):].strip()
        parts = re.split(r"→|->", body)
        if len(parts) >= 2 and re.search(r"(END|ED|結局|结局|OVER)", body):
            cond, dest = "→".join(parts[:-1]).strip(), parts[-1].strip()
            cls = "end-b" if "OVER" in dest else ("end-a" if "恋爱" in dest else "end-f")
            return ("branch-end", f'<div class="step branch"><span class="ic">↩</span>'
                                  f'<span>{esc(cond)}</span><span class="arr">➜</span>'
                                  f'<span class="badge {cls}">{esc(dest)}</span></div>', idx)
        return ("branch", f'<div class="step branch"><span class="ic">↩</span>'
                          f'<span>{esc(body)}</span></div>', idx)
    if t.startswith("【答题】"):
        body = t[len("【答题】"):].strip()
        return ("quiz", f'<div class="step qhint"><span class="ic">✎</span>'
                        f'<span>MYTHOLOGY QUIZ · {esc(body)}</span></div>', idx)
    parts = re.split(r"→|->", t)
    if len(parts) >= 2 and re.search(r"(END|ED|結局|结局|OVER)", t):
        cond, dest = "→".join(parts[:-1]).strip(), parts[-1].strip()
        cls = "end-b" if ("GAME OVER" in dest or "OVER" in dest) else \
              ("end-a" if "恋爱" in dest else "end-f")
        return ("end", f'<div class="step ending {cls}"><span class="cond">{esc(cond)}</span>'
                       f'<span class="arr">➜</span><span class="badge">{esc(dest)}</span></div>', idx)
    idx += 1
    return ("choice", f'<div class="step choice"><span class="num">{idx}</span>'
                      f'<span class="txt">{esc(t)}</span></div>', idx)


ROUTE_COLORS = {"希腊": "greek", "北欧": "norse", "日本": "japan", "埃及": "egypt"}

# 角色徽章用字（避免「阿波罗」「阿努比斯」同为「阿」）
BADGE = {"阿波罗": "波", "哈迪斯": "哈", "月人": "月", "尊": "尊",
         "巴德尔": "巴", "洛基": "洛", "阿努比斯": "努", "托特": "托"}

# 攻略对象立绘（无图的角色回退为徽章字）
CHAR_IMG = {"月人": "assets/char-tsukito.jpg", "阿波罗": "assets/char-apollo.jpg",
            "阿努比斯": "assets/char-anubis.jpg", "巴德尔": "assets/char-balder.jpg",
            "哈迪斯": "assets/char-hades.jpg", "洛基": "assets/char-loki.jpg",
            "托特": "assets/char-thoth.jpg", "尊": "assets/char-takeru.jpg"}


def badge_char(name):
    return BADGE.get(name, name[0])


def char_panel(name, blocks):
    meta, desc, body = {}, [], []
    idx = 0
    for b in blocks:
        if b[0] == "list":
            for it in b[1]:
                m = META_PAT.match(it["text"])
                if m:
                    meta[m.group(1)] = m.group(2).strip()
                else:
                    _, h, idx = step_html(it["text"], idx)
                    body.append(h)
        elif b[0] == "quote":
            desc.extend(b[1])
        elif b[0] == "h3":
            body.append(f'<h4 class="chap">{esc(b[1])}</h4>')
    cat = meta.get("神话", "")
    cls = ROUTE_COLORS.get(cat, "greek")
    img = CHAR_IMG.get(name)
    if img:
        face = f'<img class="route-face" src="{img}" alt="{esc(name)}">'
    else:
        face = f'<span class="route-face-txt">{esc(badge_char(name))}</span>'
    head = (f'<div class="route-head cat-{cls}">'
            f'<div class="route-badge">{face}</div>'
            f'<div><h3>{esc(name)}</h3>'
            f'<div class="route-meta">'
            + (f'<span>CV {esc(meta["CV"])}</span>' if meta.get("CV") else "")
            + (f'<span class="dot">·</span>{esc(cat)}神话' if cat else "")
            + (f'<span class="dot">·</span>{esc(meta["解锁"])}' if meta.get("解锁") else "")
            + "</div></div></div>")
    extra = ""
    if meta.get("结局") or meta.get("共通"):
        extra = '<div class="route-tags">'
        if meta.get("结局"):
            extra += f'<span class="rt">{esc(meta["结局"])}</span>'
        if meta.get("共通"):
            extra += f'<span class="rt">{esc(meta["共通"])}</span>'
        extra += "</div>"
    d = "".join(f"<p>{inline(x)}</p>" for x in desc)
    core = head + extra + (f'<div class="route-desc">{d}</div>' if d else "") + \
        f'<div class="timeline">{"".join(body)}</div>'
    if img:
        side = (f'<div class="route-side">'
                f'<img class="route-portrait zoomable" src="{img}" '
                f'alt="{esc(name)}立绘" title="点击查看大图" loading="lazy"></div>')
        return f'<div class="route-cols"><div class="route-main">{core}</div>{side}</div>', idx
    return core, idx


# ================================================================ 题库转换

def build_quiz():
    data = json.load(open(QUIZ_PATH, encoding="utf-8"))
    out = []
    for f in data:
        base = os.path.basename(f["file"]).replace(".dat", "")      # 4quiz00 / tfquiz00
        key = re.sub(r"[^0-9]", "", base)[-2:]                       # 00..03
        cat = CAT_MAP.get(key, "greek")
        typ = "tf" if base.startswith("tfquiz") else "choice"
        for e in f["entries"]:
            q = "".join(x["jp"] for x in e["question"]).strip()
            qcn = "".join(x["cn"] for x in e["question"]).strip()
            if typ == "tf":
                # 判断题：answers[0] 是 ○ 或 ×（正确答案），其余为空
                correct = (e["answers"][0]["jp"] or "").strip()
                opts, optscn = ["○", "×"], ["○", "×"]
                ans = 0 if correct != "×" else 1
            else:
                opts = [a["jp"] for a in e["answers"]]
                optscn = [a["cn"] for a in e["answers"]]
                ans = 0
            item = {
                "id": e["id"], "cat": cat, "type": typ, "tier": e["tier"],
                "q": q, "qcn": qcn, "opts": opts, "optscn": optscn, "ans": ans,
            }
            if e["id"] in NO_JP_IDS:
                # 这几题是「读音题」的本地化改写：中文已换成语义题，
                # 日文原文仍是读音题，并列显示会互相矛盾，故站点上隐藏日文行。
                item["noj"] = 1
            out.append(item)
    out.sort(key=lambda x: x["id"])
    js = "window.QUIZ_DATA=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
    open(OUT_QUIZ, "w", encoding="utf-8").write(js)
    return len(out), {c: sum(1 for x in out if x["cat"] == c) for c in CAT_NAME}


# ================================================================ 样式 / 脚本

CSS = r"""
:root{
  --bg:#fbf6ea; --panel:rgba(255,255,255,.78); --panel2:rgba(255,255,255,.92);
  --line:#e3dbc4; --gold:#a97e2f; --gold-dim:#c2a061;
  --text:#43425e; --muted:#8b8ba1;
  --greek:#3e78b5; --norse:#2f8fa0; --japan:#c4524a; --egypt:#a97b2c;
  --purple:#7a64c0;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;color:var(--text);line-height:1.75;
  font-family:"Noto Serif SC","Source Han Serif SC","Yu Mincho",
    "Hiragino Mincho ProN","MS Mincho","SimSun",serif;
  background:#fbf6ea url("assets/top-bg.png") center top / cover no-repeat fixed;
}
a{color:var(--gold);text-decoration:none}
a:hover{color:#8a6420}
code{background:#f4edda;border:1px solid var(--line);border-radius:4px;
  padding:1px 6px;font-family:Consolas,monospace;font-size:.9em;color:#8a6420}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.center{text-align:center;color:var(--muted);letter-spacing:2px;margin:10px auto}
.sub{color:var(--purple);letter-spacing:3px;font-weight:normal;margin:22px 0 8px}
mark{background:rgba(240,200,110,.5);color:#6b4a12;border-radius:3px;padding:0 2px}

/* nav */
#topnav{position:sticky;top:0;z-index:60;background:rgba(253,250,241,.9);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.nav-inner{max-width:1120px;margin:0 auto;padding:10px 20px;display:flex;
  align-items:center;gap:16px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:9px;font-weight:bold;color:var(--gold);
  letter-spacing:3px}
.brand img{height:36px;display:block;
  filter:drop-shadow(0 1px 2px rgba(90,90,130,.3))}
.site-logo{height:82px;display:block;margin:6px auto 2px;
  filter:drop-shadow(0 3px 10px rgba(90,90,130,.28))}
.nav-links{display:flex;gap:2px;overflow-x:auto}
.nav-links a{color:var(--muted);padding:4px 11px;border-radius:18px;font-size:.9em;white-space:nowrap}
.nav-links a:hover{color:var(--text)}
.nav-links a.active{background:var(--purple);color:#fff}
.nav-links a.quiz-link{color:var(--gold);border:1px solid var(--gold-dim)}
.nav-links a.quiz-link.active{background:rgba(216,180,106,.28);color:#7a5a1e;border-color:var(--gold)}

/* 子页面页头 */
.page-head{text-align:center;padding:46px 20px 14px}
.page-head .kicker{color:var(--gold-dim);letter-spacing:8px;font-size:.72em}
.page-head h1{font-size:clamp(23px,3.6vw,34px);margin:10px 0 8px;letter-spacing:5px;
  color:var(--text);font-weight:bold}
.page-head h1::before,.page-head h1::after{content:"✦";color:var(--gold);
  font-size:.5em;vertical-align:middle;margin:0 14px;opacity:.75}
.page-head .subtitle{color:var(--muted);letter-spacing:2px;font-size:.92em;margin:0}
.page-body{padding:10px 0 8px}

/* 页面目录卡 */
.dir-title{text-align:center;color:var(--purple);letter-spacing:4px;font-size:1.05em;
  font-weight:normal;margin:34px 0 14px}
.dir-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(198px,1fr));
  gap:12px;max-width:900px;margin:0 auto 6px}
.dir-card{display:block;background:var(--panel);border:1px solid var(--line);
  border-radius:11px;padding:14px 18px;transition:all .15s}
.dir-card:hover{border-color:var(--gold-dim);background:rgba(255,255,255,.95);
  transform:translateY(-2px)}
.dir-card .t{color:var(--gold);letter-spacing:2px;font-size:1em;margin-bottom:3px}
.dir-card .d{color:var(--muted);font-size:.82em;line-height:1.55}

/* 上一页 / 下一页 */
.pager{display:flex;justify-content:space-between;gap:12px;max-width:900px;
  margin:34px auto 0;padding:16px 0 0;border-top:1px solid var(--line)}
.pager a{color:var(--gold);font-size:.9em;letter-spacing:1px;
  border:1px solid var(--line);border-radius:9px;padding:7px 16px;
  background:var(--panel);transition:all .15s}
.pager a:hover{border-color:var(--gold-dim);color:#8a6420}
.pager a.disabled{visibility:hidden}

/* hero */
.hero{text-align:center;padding:64px 20px 36px}
.hero .kicker{color:var(--gold-dim);letter-spacing:8px;font-size:.8em}
.hero h1{font-size:clamp(30px,5.6vw,54px);margin:14px 0 10px;letter-spacing:6px;
  background:linear-gradient(180deg,#caa24a,#a97e2f 55%,#7c5a1a);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 10px rgba(255,255,255,.8))}
.hero .subtitle{color:var(--muted);letter-spacing:2px;font-size:clamp(12px,1.8vw,16px)}
.chips{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:22px}
.chip{border:1px solid var(--line);color:var(--gold);border-radius:20px;
  padding:4px 15px;font-size:.85em;background:rgba(255,255,255,.75);letter-spacing:1px}

/* sections */
main section{padding:40px 0 8px}
.sec-head{text-align:center;margin-bottom:22px}
.sec-head h2{display:inline-block;font-size:clamp(21px,3.2vw,29px);letter-spacing:7px;
  margin:0;padding:0 14px;color:var(--text)}
.sec-head h2::before,.sec-head h2::after{content:"✦";color:var(--gold);
  font-size:.55em;vertical-align:middle;margin:0 12px;opacity:.8}
.note{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--gold);
  border-radius:8px;padding:13px 19px;color:var(--muted);font-size:.94em;margin:14px auto;max-width:900px}
.note p{margin:5px 0}

/* tables */
.tbl-wrap{overflow-x:auto;margin:16px auto;max-width:900px}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);
  border-radius:9px;overflow:hidden;font-size:.93em}
th{background:rgba(122,100,192,.1);color:#6c58b0;letter-spacing:2px;padding:10px 14px;
  border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}
td{padding:9px 14px;border-bottom:1px solid rgba(214,203,172,.7);vertical-align:top}
tr:last-child td{border-bottom:none}
td:first-child{white-space:nowrap;color:#3c3c55}
tr:hover td{background:rgba(216,180,106,.08)}

/* tabs */
.tabs{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;margin:20px 0 4px}
.tab{display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--panel);
  color:var(--muted);border:1px solid var(--line);border-radius:22px;
  padding:6px 16px 6px 7px;font-family:inherit;font-size:.97em;letter-spacing:1px;
  transition:all .15s}
.tab .b{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:.85em;font-weight:bold;color:#fff}
.tab:hover{color:var(--text);border-color:var(--gold-dim)}
.tab.active{background:rgba(122,100,192,.16);border-color:var(--purple);color:#4c3f86}
.tab.cat-greek .b{background:var(--greek)}
.tab.cat-norse .b{background:var(--norse)}
.tab.cat-japan .b{background:var(--japan)}
.tab.cat-egypt .b{background:var(--egypt)}
.panel{display:none;max-width:800px;margin:22px auto 0}
.panel.active{display:block;animation:fade .28s}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1}}

.route-head{display:flex;gap:14px;align-items:center;margin-bottom:10px}
.route-badge{width:52px;height:52px;border-radius:14px;flex:none;display:flex;
  align-items:center;justify-content:center;font-size:1.5em;font-weight:bold;color:#fff}
.cat-greek .route-badge{background:linear-gradient(135deg,#a9cdf5,#6f9fd6)}
.cat-norse .route-badge{background:linear-gradient(135deg,#c3e6ef,#86bccb)}
.cat-japan .route-badge{background:linear-gradient(135deg,#f0a49c,#cf6a61)}
.cat-egypt .route-badge{background:linear-gradient(135deg,#ecd39a,#c9a05a)}
.route-head h3{margin:0;font-size:1.5em;letter-spacing:4px;color:var(--gold)}
.route-meta{color:var(--muted);font-size:.86em;letter-spacing:1px}
.route-meta .dot{margin:0 6px;opacity:.6}
.route-tags{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px}
.rt{font-size:.8em;border:1px solid var(--line);border-radius:14px;padding:2px 12px;
  color:var(--gold);background:rgba(255,255,255,.7)}
.route-desc{border-left:2px solid var(--gold-dim);padding:2px 0 2px 14px;
  color:var(--muted);font-size:.93em;margin:10px 0 18px}
.route-desc p{margin:4px 0}

/* 立绘：页签头像 + 面板侧栏 + 放大查看 */
.tab{padding:5px 15px 5px 6px}
.tab .tb{width:30px;height:30px;border-radius:50%;overflow:hidden;flex:none;
  box-shadow:0 1px 4px rgba(60,50,90,.25);background:#fff}
.tab .tb img{width:100%;height:100%;object-fit:cover;object-position:50% 10%;
  transform:scale(1.12);transition:transform .2s}
.tab:hover .tb img{transform:scale(1.25)}
.tab.active .tb{box-shadow:0 0 0 2px var(--purple)}
.route-cols{display:flex;gap:22px;align-items:flex-start}
.route-main{flex:1;min-width:0}
.route-side{flex:none;width:215px;position:sticky;top:74px}
.route-portrait{width:100%;display:block;border-radius:16px;cursor:zoom-in;
  box-shadow:0 14px 34px rgba(60,50,90,.22);
  -webkit-mask-image:linear-gradient(#000 84%,rgba(0,0,0,0));
          mask-image:linear-gradient(#000 84%,rgba(0,0,0,0));
  transition:transform .22s}
.route-portrait:hover{transform:translateY(-4px)}
.route-badge{overflow:hidden}
.route-face{width:100%;height:100%;object-fit:cover;object-position:50% 8%;
  transform:scale(1.18)}
.route-face-txt{position:relative}
.lightbox{position:fixed;inset:0;z-index:99;background:rgba(35,28,58,.82);
  display:flex;align-items:center;justify-content:center;cursor:zoom-out;
  animation:lbIn .18s}
.lightbox img{max-width:88vw;max-height:92vh;border-radius:14px;
  box-shadow:0 24px 80px rgba(0,0,0,.55)}
.lightbox.out{opacity:0;transition:opacity .18s}
@keyframes lbIn{from{opacity:0}to{opacity:1}}
@media(max-width:700px){
  .route-cols{display:block}
  .route-side{float:right;width:132px;margin:0 0 10px 14px;position:static}
  .route-side::after{content:"";display:block;clear:both}
}

/* timeline */
.timeline{position:relative;padding-left:30px}
.timeline::before{content:"";position:absolute;left:9px;top:6px;bottom:6px;width:2px;
  background:linear-gradient(var(--gold-dim),var(--purple),var(--gold-dim))}
.chap{position:relative;margin:26px 0 12px;font-size:1.05em;letter-spacing:4px;
  color:var(--purple);font-weight:normal}
.chap:first-child{margin-top:0}
.chap::before{content:"◆";position:absolute;left:-27px;top:2px;color:var(--purple);font-size:.75em}
.step{position:relative;margin:0 0 7px;display:flex;gap:10px;align-items:baseline}
.step .num{flex:none;width:21px;height:21px;border-radius:50%;background:#fff;
  border:1px solid var(--line);color:var(--gold-dim);display:flex;align-items:center;
  justify-content:center;font-size:.7em;transform:translateY(4px)}
.step .txt{background:var(--panel);border:1px solid var(--line);border-radius:8px;
  padding:5px 15px;flex:1;font-size:.97em}
.step.save{margin:14px 0 8px}
.step.save .ic{position:absolute;left:-28px;font-size:.8em}
.step.save span:last-child{background:rgba(216,180,106,.16);border:1px solid rgba(185,134,59,.45);
  border-radius:8px;padding:5px 15px;color:#7a5a1e;flex:1;font-size:.92em}
.step.branch .ic{position:absolute;left:-27px;color:var(--purple)}
.step.branch>span:nth-child(2){background:rgba(122,100,192,.1);border:1px dashed rgba(122,100,192,.5);
  border-radius:8px;padding:5px 15px;color:#5d4b9e;flex:1;font-size:.92em}
.step.branch .arr{color:var(--muted);font-size:.8em}
.step.branch .badge{flex:none;border-radius:14px;padding:2px 13px;font-size:.82em;
  font-weight:bold;letter-spacing:1px}
.step.branch .badge.end-a{background:rgba(196,82,74,.12);border:1px solid #cf6a61;color:#b04a42}
.step.branch .badge.end-f{background:rgba(122,100,192,.12);border:1px solid var(--purple);color:#5d4b9e}
.step.branch .badge.end-b{background:rgba(120,120,120,.12);border:1px solid #999;color:#777}
.step.qhint .ic{position:absolute;left:-27px;color:var(--norse)}
.step.qhint span:last-child{color:var(--norse);font-size:.85em;letter-spacing:.5px}
.step.ending{margin-top:12px}
.step.ending .cond{background:var(--panel);border:1px solid var(--line);border-radius:8px;
  padding:5px 15px;flex:1;font-size:.95em}
.step.ending .arr{color:var(--muted);font-size:.8em}
.step.ending .badge{flex:none;border-radius:14px;padding:2px 13px;font-size:.82em;
  font-weight:bold;letter-spacing:1px}
.end-a .badge{background:rgba(196,82,74,.12);border:1px solid #cf6a61;color:#b04a42}
.end-f .badge{background:rgba(122,100,192,.12);border:1px solid var(--purple);color:#5d4b9e}
.end-b .badge{background:rgba(120,120,120,.12);border:1px solid #999;color:#777}

/* ============ 题库 ============ */
.quiz-bar{position:sticky;top:52px;z-index:40;background:rgba(253,250,241,.94);
  backdrop-filter:blur(10px);border:1px solid var(--line);border-radius:12px;
  padding:12px 14px;margin:16px auto 18px;max-width:1000px}
.q-search{display:flex;gap:10px;align-items:center}
.q-search input{flex:1;background:#fff;border:1px solid var(--line);border-radius:9px;
  color:var(--text);padding:9px 15px;font-family:inherit;font-size:1em;outline:none}
.q-search input::placeholder{color:#a9aec0}
.q-search input:focus{border-color:var(--gold-dim);box-shadow:0 0 0 3px rgba(185,134,59,.14)}
.q-search .icon{color:var(--gold-dim);font-size:1.1em}
.q-self{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.85em;
  border:1px solid var(--line);border-radius:9px;padding:7px 12px;cursor:pointer;white-space:nowrap}
.q-self input{accent-color:var(--purple)}
.q-filters{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center}
.fg{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.fg .lbl{color:var(--gold-dim);font-size:.78em;letter-spacing:1px;margin-right:2px}
.fchip{background:transparent;border:1px solid var(--line);color:var(--muted);
  border-radius:14px;padding:3px 12px;font-family:inherit;font-size:.82em;cursor:pointer;
  transition:all .12s}
.fchip:hover{color:var(--text);border-color:var(--gold-dim)}
.fchip.on{background:rgba(216,180,106,.22);border-color:var(--gold-dim);color:#7a5a1e}
.fchip.on.c-greek{background:rgba(62,120,181,.14);border-color:var(--greek);color:#2e5f92}
.fchip.on.c-norse{background:rgba(47,143,160,.14);border-color:var(--norse);color:#1f6d7a}
.fchip.on.c-japan{background:rgba(196,82,74,.14);border-color:var(--japan);color:#a03e37}
.fchip.on.c-egypt{background:rgba(169,123,44,.16);border-color:var(--egypt);color:#7c5a1a}
.q-stat{max-width:1000px;margin:0 auto 12px;color:var(--muted);font-size:.86em;
  display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
.q-stat b{color:var(--gold)}
.q-list{max-width:1000px;margin:0 auto;display:grid;gap:10px}
.qcard{background:var(--panel);border:1px solid var(--line);border-radius:11px;
  padding:13px 17px;content-visibility:auto;contain-intrinsic-size:220px}
.qcard:hover{border-color:#d8c9a4}
.qhead{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.qid{color:var(--gold-dim);font-size:.8em;font-family:Consolas,monospace}
.tag{font-size:.72em;border-radius:11px;padding:1px 9px;border:1px solid var(--line);color:var(--muted)}
.tag.cat-greek{color:var(--greek);border-color:rgba(62,120,181,.45);background:rgba(62,120,181,.08)}
.tag.cat-norse{color:var(--norse);border-color:rgba(47,143,160,.45);background:rgba(47,143,160,.08)}
.tag.cat-japan{color:var(--japan);border-color:rgba(196,82,74,.45);background:rgba(196,82,74,.08)}
.tag.cat-egypt{color:var(--egypt);border-color:rgba(169,123,44,.45);background:rgba(169,123,44,.08)}
.tag.tier{color:var(--gold);border-color:rgba(185,134,59,.4);letter-spacing:2px}
.qtext{font-size:1.02em;margin:2px 0 1px;line-height:1.6}
.qjp{color:var(--muted);font-size:.83em;margin-bottom:7px}
.opts{display:grid;gap:5px;margin-top:8px}
.opt{display:flex;gap:9px;align-items:baseline;border:1px solid transparent;
  border-radius:7px;padding:3px 10px;font-size:.93em;color:#55566e}
.opt .idx{color:var(--gold-dim);flex:none;font-size:.9em}
.opt .cn{color:var(--muted);font-size:.85em}
.opt .tick{margin-left:auto;color:#2f9e63;font-weight:bold;font-size:.9em}
.opt.ok{background:rgba(47,158,99,.1);border-color:rgba(47,158,99,.4)}
.opt.ok .jp{color:#20714a}
.q-ans{margin-top:8px;font-size:.95em}
.q-ans b{color:#2f9e63;font-size:1.15em;letter-spacing:2px}
body.selftest .qcard:not(.revealed) .opt.ok{background:transparent;border-color:transparent}
body.selftest .qcard:not(.revealed) .opt.ok .jp{color:#55566e}
body.selftest .qcard:not(.revealed) .tick{visibility:hidden}
body.selftest .qcard:not(.revealed) .q-ans{visibility:hidden}
body.selftest .qcard{cursor:pointer}
.q-empty{text-align:center;color:var(--muted);padding:40px 0}
.q-more{display:block;margin:18px auto 0;background:var(--panel);border:1px solid var(--line);
  color:var(--gold);border-radius:9px;padding:9px 30px;font-family:inherit;cursor:pointer}
.q-more:hover{border-color:var(--gold-dim)}

footer{margin-top:56px;padding:28px 20px 44px;text-align:center;
  border-top:1px solid var(--line);color:var(--muted);font-size:.86em}
footer p{margin:5px 0}
footer .visitor{display:block;margin:16px auto 0;height:25px;width:auto;
  border:0;vertical-align:middle}

/* ============ 飘雪（仿 kamiaso-anime.com） ============ */
#snowfall{position:fixed;inset:0;z-index:5;pointer-events:none;overflow:hidden}
#snowfall .fl{position:absolute;top:-70px;animation:fl-fall linear infinite}
#snowfall .fl img{display:block;animation:fl-sway ease-in-out infinite alternate}
@keyframes fl-fall{to{transform:translateY(115vh)}}
@keyframes fl-sway{
  from{transform:translateX(calc(var(--amp) * -1px)) rotate(-9deg)}
  to{transform:translateX(var(--amp)) rotate(9deg)}}
@media (prefers-reduced-motion:reduce){#snowfall{display:none}}

@media (max-width:640px){
  .quiz-bar{position:static}
  .tab{padding:5px 12px 5px 6px;font-size:.9em}
  .timeline{padding-left:24px}
}"""

APP_JS = r"""
// ---------- 角色路线页签（支持 #p0 深链） ----------
(function(){
  var tabs = [].slice.call(document.querySelectorAll('.tab'));
  if(!tabs.length) return;
  function activate(b){
    tabs.forEach(function(x){ x.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function(x){ x.classList.remove('active'); });
    b.classList.add('active');
    var p = document.getElementById('panel-' + b.dataset.p);
    if(p) p.classList.add('active');
  }
  tabs.forEach(function(b){
    b.addEventListener('click', function(){
      activate(b);
      if(history.replaceState) history.replaceState(null, '', '#' + b.dataset.p);
    });
  });
  var h = location.hash.replace('#','');
  if(h){
    var t = tabs.filter(function(x){ return x.dataset.p === h; })[0];
    if(t) activate(t);
  }
})();

// ---------- 立绘放大查看 ----------
(function(){
  document.addEventListener('click', function(e){
    var el = e.target;
    if(!(el.classList && el.classList.contains('zoomable'))) return;
    var ov = document.createElement('div');
    ov.className = 'lightbox';
    var im = document.createElement('img');
    im.src = el.src; im.alt = el.alt || '';
    ov.appendChild(im);
    function close(){
      ov.classList.add('out');
      setTimeout(function(){ ov.remove(); }, 180);
      document.removeEventListener('keydown', es);
    }
    function es(ev){ if(ev.key === 'Escape') close(); }
    ov.addEventListener('click', close);
    document.addEventListener('keydown', es);
    document.body.appendChild(ov);
  });
})();

// ---------- 飘雪（仿 kamiaso-anime.com） ----------
(function(){
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var layer=document.createElement('div');layer.id='snowfall';document.body.appendChild(layer);
  for(var i=0;i<14;i++){
    var fl=document.createElement('div');fl.className='fl';
    var img=document.createElement('img');img.src='assets/snow.png';img.alt='';
    var size=12+Math.random()*24;
    img.style.width=size+'px';img.style.height=size+'px';
    img.style.opacity=(.55+Math.random()*.4).toFixed(2);
    img.style.setProperty('--amp',Math.round(8+Math.random()*22));
    img.style.animationDuration=(2+Math.random()*2.5).toFixed(2)+'s';
    fl.style.left=(Math.random()*100).toFixed(2)+'%';
    fl.style.animationDuration=(9+Math.random()*11).toFixed(2)+'s';
    fl.style.animationDelay=(-Math.random()*20).toFixed(2)+'s';
    fl.appendChild(img);layer.appendChild(fl);
  }
})();
"""

QUIZ_JS = r"""
// ---------- 题库 ----------
(function(){
  var DATA = window.QUIZ_DATA || [];
  var PAGE = 60, shown = PAGE;
  var state = {q:'', cat:'all', type:'all', tier:'all'};
  var $list = document.getElementById('qList');
  var $stat = document.getElementById('qStat');
  if(!$list) return;

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function hl(s, terms){
    var out = esc(s);
    if(!terms.length) return out;
    var re = new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi');
    return out.replace(re, '<mark>$1</mark>');
  }
  function catName(c){return {greek:'希腊',norse:'北欧',japan:'日本',egypt:'埃及'}[c]||c;}
  var IDX = ['①','②','③','④'];

  function cardHTML(it, terms){
    var tier = ['★','★★','★★★'][it.tier] || '';
    var opts = '<div class="opts">' + it.opts.map(function(o,i){
      var cn = (it.optscn && it.optscn[i]) || '';
      var ok = (i === it.ans);
      var idx = (it.type === 'tf') ? '' : (IDX[i] || '');
      return '<div class="opt' + (ok ? ' ok' : '') + '">' +
        '<span class="idx">' + idx + '</span>' +
        '<span class="jp">' + hl(o, terms) + '</span>' +
        (cn && cn !== o ? '<span class="cn">' + hl(cn, terms) + '</span>' : '') +
        (ok ? '<span class="tick">✓</span>' : '') +
        '</div>';
    }).join('') + '</div>';
    return '<article class="qcard" data-cat="' + it.cat + '">' +
      '<div class="qhead">' +
        '<span class="qid">#' + it.id + '</span>' +
        '<span class="tag cat-' + it.cat + '">' + catName(it.cat) + '</span>' +
        '<span class="tag">' + (it.type==='tf'?'○× 判断':'四选一') + '</span>' +
        '<span class="tag tier">' + tier + '</span>' +
      '</div>' +
      '<div class="qtext">' + hl(it.qcn || it.q, terms) + '</div>' +
      (it.qcn && it.q && !it.noj ? '<div class="qjp">' + hl(it.q, terms) + '</div>' : '') +
      opts + '</article>';
  }

  function filtered(){
    var terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var arr = DATA.filter(function(it){
      if(state.cat !== 'all' && it.cat !== state.cat) return false;
      if(state.type !== 'all' && it.type !== state.type) return false;
      if(state.tier !== 'all' && String(it.tier) !== state.tier) return false;
      if(!terms.length) return true;
      var hay = (it.q + ' ' + it.qcn + ' ' + it.opts.join(' ') + ' ' +
                 it.optscn.join(' ') + ' ' + it.id).toLowerCase();
      return terms.every(function(t){ return hay.indexOf(t) >= 0; });
    });
    return {items: arr, terms: terms};
  }

  function render(reset){
    if(reset) shown = PAGE;
    var r = filtered(), items = r.items, terms = r.terms;
    var slice = items.slice(0, shown);
    $list.innerHTML = slice.length
      ? slice.map(function(it){ return cardHTML(it, terms); }).join('')
      : '<div class="q-empty">没有匹配的题目，换个关键词试试</div>';
    $stat.innerHTML = '<span>共 <b>' + DATA.length + '</b> 题 · 命中 <b>' +
      items.length + '</b> 题 · 显示 ' + Math.min(shown, items.length) + '</span>' +
      '<span>点击卡片可展开/收起答案</span>';
    if(items.length > shown){
      var btn = document.createElement('button');
      btn.className = 'q-more';
      btn.textContent = '加载更多（剩余 ' + (items.length - shown) + ' 题）';
      btn.onclick = function(){ shown += PAGE; render(false); };
      $list.appendChild(btn);
    }
  }

  // 搜索（防抖）
  var t = null;
  var input = document.getElementById('qSearch');
  if(input){
    input.addEventListener('input', function(){
      clearTimeout(t);
      t = setTimeout(function(){ state.q = input.value; render(true); }, 140);
    });
  }
  // 筛选
  document.querySelectorAll('.fchip[data-k]').forEach(function(b){
    b.addEventListener('click', function(){
      var k = b.dataset.k, v = b.dataset.v;
      state[k] = v;
      document.querySelectorAll('.fchip[data-k="' + k + '"]').forEach(function(x){
        x.classList.toggle('on', x.dataset.v === v);
      });
      render(true);
    });
  });
  // 自测模式
  var st = document.getElementById('qSelf');
  if(st){
    st.addEventListener('change', function(){
      document.body.classList.toggle('selftest', st.checked);
    });
  }
  // 点击卡片展开
  $list.addEventListener('click', function(e){
    if(!document.body.classList.contains('selftest')) return;
    var c = e.target.closest('.qcard');
    if(c) c.classList.toggle('revealed');
  });

  render(true);
})();
"""


def quiz_ui(counts):
    total = sum(counts.values())
    return f"""
<div class="quiz-bar">
  <div class="q-search">
    <span class="icon">🔍</span>
    <input id="qSearch" type="search" placeholder="搜索题目 / 选项关键词（支持中文·日文，空格分隔多个词）" autocomplete="off">
    <label class="q-self"><input type="checkbox" id="qSelf"> 自测模式</label>
  </div>
  <div class="q-filters">
    <span class="fg"><span class="lbl">神话</span>
      <button class="fchip on" data-k="cat" data-v="all">全部</button>
      <button class="fchip c-greek" data-k="cat" data-v="greek">希腊 {counts['greek']}</button>
      <button class="fchip c-norse" data-k="cat" data-v="norse">北欧 {counts['norse']}</button>
      <button class="fchip c-japan" data-k="cat" data-v="japan">日本 {counts['japan']}</button>
      <button class="fchip c-egypt" data-k="cat" data-v="egypt">埃及 {counts['egypt']}</button>
    </span>
    <span class="fg"><span class="lbl">题型</span>
      <button class="fchip on" data-k="type" data-v="all">全部</button>
      <button class="fchip" data-k="type" data-v="choice">四选一</button>
      <button class="fchip" data-k="type" data-v="tf">○× 判断</button>
    </span>
    <span class="fg"><span class="lbl">难度</span>
      <button class="fchip on" data-k="tier" data-v="all">全部</button>
      <button class="fchip" data-k="tier" data-v="0">★</button>
      <button class="fchip" data-k="tier" data-v="1">★★</button>
      <button class="fchip" data-k="tier" data-v="2">★★★</button>
    </span>
  </div>
</div>
<div class="q-stat" id="qStat">共 <b>{total}</b> 题</div>
<div class="q-list" id="qList"></div>
"""


# ================================================================ 组装

def build():
    text = open(MD_PATH, encoding="utf-8").read()
    meta, body = parse_md(text)
    sections = split_sections(body)
    n_quiz, counts = build_quiz()

    rendered = []
    for si, sec in enumerate(sections):
        title = sec["title"]
        if title is None:
            continue
        blocks = parse_blocks(sec["lines"])
        # 末段 `---` 之后的来源说明已由页脚统一输出，避免重复
        if si == len(sections) - 1 and any(b[0] == "hr" for b in blocks):
            hi = next(i for i, b in enumerate(blocks) if b[0] == "hr")
            blocks = blocks[:hi]
        inner = []

        if title == "角色路线":
            cur, cur_blocks, routes, intro = None, [], [], []
            for b in blocks:
                if b[0] == "h2":
                    if cur:
                        routes.append((cur, cur_blocks))
                    cur, cur_blocks = b[1], []
                elif cur is None:
                    intro.append(b)          # 仅第一个 ## 之前的说明
                else:
                    cur_blocks.append(b)
            if cur:
                routes.append((cur, cur_blocks))
            if intro:
                ih = ""
                for b in intro:
                    if b[0] == "quote":
                        ih += "".join(f"<p>{inline(x)}</p>" for x in b[1])
                    else:
                        ih += f"<p>{inline(b[1])}</p>"
                inner.append(f'<div class="note">{ih}</div>')
            tabs, panels = [], []
            for ri, (name, bs) in enumerate(routes):
                ph, cnt = char_panel(name, bs)
                cat = ROUTE_COLORS.get("希腊", "greek")
                m = META_PAT.search("\n".join(
                    it["text"] for b in bs if b[0] == "list" for it in b[1]) or "")
                # 取该角色的神话体系用于 tab 配色
                cat = "greek"
                for b in bs:
                    if b[0] == "list":
                        for it in b[1]:
                            mm = META_PAT.match(it["text"])
                            if mm and mm.group(1) == "神话":
                                cat = ROUTE_COLORS.get(mm.group(2).strip(), "greek")
                timg = CHAR_IMG.get(name)
                face = (f'<span class="tb"><img src="{timg}" alt=""></span>' if timg
                        else f'<span class="b">{esc(badge_char(name))}</span>')
                tabs.append(f'<button class="tab cat-{cat}{" active" if ri==0 else ""}" '
                            f'data-p="p{ri}">{face}'
                            f'{esc(name)}</button>')
                panels.append(f'<div class="panel" id="panel-p{ri}">{ph}</div>')
            inner.insert(1, '<div class="tabs">' + "".join(tabs) + "</div>")
            inner.append("".join(panels).replace('class="panel"', 'class="panel active"', 1))

        elif title.startswith("题库"):
            for b in blocks:
                if b[0] == "quote":
                    inner.append('<div class="note">'
                                 + "".join(f"<p>{inline(x)}</p>" for x in b[1])
                                 + "</div>")
                elif b[0] == "para":
                    inner.append(f"<p>{inline(b[1])}</p>")
            inner.append(quiz_ui(counts))

        else:
            for b in blocks:
                k = b[0]
                if k == "table":
                    inner.append(render_table(b[1]))
                elif k == "quote":
                    inner.append('<div class="note">'
                                 + "".join(f"<p>{inline(x)}</p>" for x in b[1])
                                 + "</div>")
                elif k == "list":
                    inner.append('<ul class="plain">'
                                 + "".join(f'<li>{inline(it["text"])}</li>' for it in b[1])
                                 + "</ul>")
                elif k == "para":
                    inner.append(f"<p class='center'>{inline(b[1])}</p>")
                elif k == "h3":
                    inner.append(f'<h3 class="sub">{inline(b[1])}</h3>')

        rendered.append((si, title, "".join(inner)))

    # ---------------- 分页：每个大区块 → 一个独立文件 ----------------
    pages = []
    for si, title, inner in rendered:
        if not inner.strip():
            continue
        is_quiz = title.startswith("题库")
        fname = "quiz.html" if is_quiz else PAGE_FILE.get(title, f"page{si}.html")
        pages.append({"title": title, "file": fname, "html": inner, "quiz": is_quiz})

    seen = set()
    for i, p in enumerate(pages):                       # 防止两区块撞同一文件名
        if p["file"] in seen:
            p["file"] = f"page{i}.html"
        seen.add(p["file"])

    site = meta.get("title", "攻略")

    def nav_html(cur_file):
        out = []
        for p in pages:
            cls = []
            if p["quiz"]:
                cls.append("quiz-link")
            if p["file"] == cur_file:
                cls.append("active")
            c = f' class="{" ".join(cls)}"' if cls else ""
            out.append(f'<a href="{p["file"]}"{c}>{esc(p["title"])}</a>')
        return "".join(out)

    chips = ('<span class="chip">Nintendo Switch / PSP</span>'
             '<span class="chip">女性向恋爱 ADV</span>'
             '<span class="chip">CERO D</span>'
             '<span class="chip">8 名攻略对象</span>'
             '<span class="chip">400 题神话题库</span>')

    # 首页目录卡
    dir_html = ""
    others = [p for p in pages if p["file"] != "index.html"]
    if others:
        cards = "".join(
            f'<a class="dir-card" href="{p["file"]}">'
            f'<div class="t">{esc(p["title"])}</div>'
            f'<div class="d">{esc(PAGE_SUB.get(p["title"], ""))}</div></a>'
            for p in others)
        dir_html = ('<section class="page-body"><div class="wrap">'
                    '<h3 class="dir-title">全部页面</h3>'
                    f'<div class="dir-grid">{cards}</div></div></section>')

    for i, p in enumerate(pages):
        cur, title = p["file"], p["title"]
        head = (f'<header class="hero" id="top">'
                f'<div class="kicker">KAMIGAMI NO ASOBI</div>'
                f'<img class="site-logo" src="assets/logo.png" '
                f'alt="神々の悪戯 -Ludere deorum-">'
                f'<p class="subtitle">{esc(meta.get("subtitle", ""))}</p>'
                f'<div class="chips">{chips}</div></header>') if cur == "index.html" else \
               (f'<header class="page-head">'
                f'<div class="kicker">KAMIGAMI NO ASOBI</div>'
                f'<h1>{esc(title)}</h1>'
                f'<p class="subtitle">{esc(PAGE_SUB.get(title, ""))}</p></header>')

        prev_p = pages[i - 1] if i > 0 else None
        next_p = pages[i + 1] if i < len(pages) - 1 else None
        left = (f'<a href="{prev_p["file"]}">← {esc(prev_p["title"])}</a>'
                if prev_p else '<a class="disabled">·</a>')
        right = (f'<a href="{next_p["file"]}">{esc(next_p["title"])} →</a>'
                 if next_p else '<a class="disabled">·</a>')
        pager = f'<div class="pager">{left}{right}</div>'

        scripts = '<script src="app.js"></script>'
        if p["quiz"]:
            scripts = ('<script src="quiz-data.js"></script>'
                       '<script src="quiz.js"></script>'
                       '<script src="app.js"></script>')

        page_title = esc(site) if cur == "index.html" else f'{esc(title)} · {esc(site)}'
        page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{page_title}</title>
<link rel="icon" type="image/png" href="assets/snow.png">
<link rel="stylesheet" href="style.css">
</head>
<body>
<nav id="topnav"><div class="nav-inner">
<a class="brand" href="index.html"><img src="assets/logo.png" alt="神々の悪戯"><span>攻略</span></a>
<div class="nav-links">{nav_html(cur)}</div>
</div></nav>
{head}
<main>
<section class="page-body"><div class="wrap">{p["html"]}</div></section>
{dir_html if cur == "index.html" else ""}
{pager}
</main>
<footer>
<p>数据来源：<a href="https://www.soregashi.work/entry/kamiaso-matome" target="_blank" rel="noopener">某の乙女ゲーム遊戯録</a> ／ <a href="https://choro-game.com/e/kamiaso-guide" target="_blank" rel="noopener">choro 攻略</a></p>
<p>题库：游戏内 QUIZ.dat 导出，共 {n_quiz} 题</p>
<img class="visitor" src="{VISITOR}" alt="访问统计" height="25" loading="lazy" referrerpolicy="no-referrer">
</footer>
{scripts}
</body>
</html>"""
        open(os.path.join(HERE, cur), "w", encoding="utf-8").write(page)

    # ---------------- 共享 CSS / JS ----------------
    open(OUT_CSS, "w", encoding="utf-8").write(CSS.strip() + "\n")
    open(OUT_APP, "w", encoding="utf-8").write(APP_JS.strip() + "\n")
    open(OUT_QUIZJS, "w", encoding="utf-8").write(QUIZ_JS.strip() + "\n")

    print("✔ 已生成 " + str(len(pages)) + " 个页面：")
    for p in pages:
        print(f"    {p['file']:<16} ← {p['title']}")
    print(f"✔ style.css / app.js / quiz.js 生成完成")
    print(f"✔ quiz-data.js 生成完成（{n_quiz} 题: "
          + " / ".join(f"{CAT_NAME[c]} {n}" for c, n in counts.items()) + "）")


if __name__ == "__main__":
    build()
