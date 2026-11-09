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

// ---------- 中/日文切换 ----------
(function(){
  var KEY = 'kamiaso-lang';
  var btns = [].slice.call(document.querySelectorAll('.lang-btn'));
  if(!btns.length) return;
  var cur = localStorage.getItem(KEY) || 'cn';

  function apply(lang){
    cur = lang;
    btns.forEach(function(b){ b.classList.toggle('on', b.dataset.lang === lang); });
    document.querySelectorAll('.bi').forEach(function(el){
      var v = lang === 'jp' ? (el.getAttribute('data-jp') || '') : (el.getAttribute('data-cn') || '');
      if(v) el.textContent = v;
    });
    localStorage.setItem(KEY, lang);
  }
  btns.forEach(function(b){
    b.addEventListener('click', function(){ apply(b.dataset.lang); });
  });
  apply(cur);
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
