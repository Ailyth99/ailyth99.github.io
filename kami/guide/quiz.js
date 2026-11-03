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
