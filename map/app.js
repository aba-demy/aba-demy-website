(function () {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');

  var T = {}; window.TERMS.forEach(function (t) { T[t.id] = t; });
  var G = {}; window.GROUPS.forEach(function (g) { G[g.id] = g; });
  var C = {}; window.GROUPS.forEach(function (g) { g.clusters.forEach(function (c) { C[c.id] = c; }); });
  var P = window.PATHS;
  // open: set of expanded cluster ids on the main map (all closed at first, to keep the first view light)
  var st = { view: 'main', path: 0, sel: null, open: {}, rev: {}, tsel: {} };
  var SC = window.SCEN || [];
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
  function pathIndex(id) { if (!st.path) return 0; return P[st.path - 1].ids.indexOf(id) + 1; }
  function inPaths(id) { return P.filter(function (p) { return p.ids.indexOf(id) > -1; }).map(function (p) { return p.id; }); }
  function clusterTerms(cid) { return window.TERMS.filter(function (t) { return t.c === cid && t.id !== 'abc'; }); }
  function allClusterIds() { var a = []; window.GROUPS.forEach(function (g) { g.clusters.forEach(function (c) { a.push(c.id); }); }); return a; }

  function chip(id) {
    var t = T[id], n = pathIndex(id);
    var cls = 'chip g-' + t.g + (st.path ? (n ? ' inpath' : ' dim') : '');
    var badge = n ? '<span class="no">' + n + '</span>' : '';
    return '<button class="' + cls + '" data-go="' + id + '" aria-pressed="' + (st.sel === id && st.view === 'main') + '">' + badge +
      '<span class="a">' + esc(t.ar) + '</span><span class="en">' + esc(t.en) + '</span></button>';
  }

  function renderTabs() {
    var tabs = [['main', 'الخريطة الرئيسية']].concat(window.GROUPS.map(function (g) { return [g.id, g.ar]; }), [['sc', 'السيناريوهات']]);
    $('tabs').innerHTML = tabs.map(function (x) {
      return '<button class="tab" role="tab" data-view="' + x[0] + '" aria-selected="' + (st.view === x[0]) + '">' + esc(x[1]) + '</button>';
    }).join('');
  }

  function renderPaths() {
    var h = '<div class="paths-row"><span class="lbl">الممرات: اختر ممراً لترى كيف تترابط المصطلحات</span>' +
      '<button class="pbtn off" data-path="0" title="إيقاف الممر" aria-label="إيقاف الممر" aria-pressed="' + (st.path === 0) + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg></button>' +
      P.map(function (p) { return '<button class="pbtn" data-path="' + p.id + '" aria-pressed="' + (st.path === p.id) + '">' + p.id + '. ' + esc(p.short) + '</button>'; }).join('') + '</div>';
    if (st.path) {
      var p = P[st.path - 1];
      h += '<p class="pline"><b>' + esc(p.ar) + '</b>' + esc(p.line) + '</p><div class="strip">' +
        p.ids.map(function (id, i) {
          var t = T[id];
          return (i ? '<span class="ar-sep" aria-hidden="true">←</span>' : '') +
            '<button class="st g-' + t.g + '" data-go="' + id + '">' + (i + 1) + '. ' + esc(t.ar) + '</button>';
        }).join('') + '</div>';
    }
    $('paths').innerHTML = h;
  }

  function renderCluster(c) {
    var ts = clusterTerms(c.id), open = !!st.open[c.id];
    return '<div class="cl"><button class="clb" data-cl="' + c.id + '" aria-expanded="' + open + '"><span class="nm">' + esc(c.ar) +
      '<span class="en">' + esc(c.en) + '</span></span><span class="cnt">' + ts.length + '</span><span class="chev" aria-hidden="true">◀</span></button>' +
      (open ? '<div class="chips">' + ts.map(function (t) { return chip(t.id); }).join('') + '</div>' : '') + '</div>';
  }

  function renderMain() {
    var byG = function (gid) {
      var g = G[gid];
      return '<section class="grp g-' + gid + '"><h3>' + esc(g.ar) + '<small class="en">' + esc(g.en) + '</small></h3><p class="q">' + esc(g.q) + '</p>' +
        g.clusters.map(renderCluster).join('') + '</section>';
    };
    var abc = T.abc;
    var eids = window.TERMS.filter(function (t) { return t.g === 'e'; }).map(function (t) { return t.id; });
    var allOpen = allClusterIds().every(function (k) { return st.open[k]; });
    return '<div class="toolrow"><button data-toggleall="1">' + (allOpen ? 'إغلاق كل الفروع' : 'فتح كل الفروع') + '</button></div>' +
      '<div class="frame"><div class="frame-label">السلوك المهني والأخلاقيات<small class="en">Professional Conduct</small></div>' +
      '<div class="map">' + byG('p') + byG('s') +
      '<div class="center"><button class="cpill g-p" data-go="abc" aria-pressed="' + (st.sel === 'abc') + '"><b>' + esc(abc.ar) + '</b><span class="en">' + esc(abc.en) + '</span></button></div>' +
      byG('r') + byG('m') + '</div>' +
      '<div class="ecl g-e"><p class="cl-h">حدود الدور · <span class="en">Role Boundaries</span></p>' + eids.map(chip).join('') + '</div></div>';
  }

  function card(id) {
    var t = T[id], n = pathIndex(id);
    var cls = 'card g-' + t.g + (st.path && !n ? ' dim' : '');
    return '<article class="' + cls + '" id="t-' + id + '">' + (n ? '<span class="no">' + n + '</span>' : '') +
      '<h4>' + esc(t.ar) + '</h4><div class="en t">' + esc(t.en) + '</div>' +
      '<p class="lbl">التعريف</p><p>' + esc(t.def) + '</p>' +
      '<p class="lbl">مثال</p><p>' + esc(t.ex) + '</p>' +
      (t.note ? '<div class="note">' + esc(t.note) + '</div>' : '') +
      '<p class="lbl">يرتبط بـ</p><div class="links">' +
      t.to.map(function (o) { return '<button class="lk" data-go="' + o + '">' + esc(T[o].ar) + '</button>'; }).join('') + '</div></article>';
  }

  function renderGroup(gid) {
    var g = G[gid];
    return '<div class="gview g-' + gid + '"><h2>' + esc(g.ar) + ' <span class="en" style="font-size:15px;color:var(--muted);font-family:var(--font-body)">' + esc(g.en) + '</span></h2><p class="q">' + esc(g.q) + '</p>' +
      g.clusters.map(function (c) {
        var ids = window.TERMS.filter(function (t) { return t.c === c.id; }).map(function (t) { return t.id; });
        return '<h3 class="cl-title">' + esc(c.ar) + '<small class="en">' + esc(c.en) + '</small></h3><div class="cards">' + ids.map(card).join('') + '</div>';
      }).join('') + '</div>';
  }

  function schip(key, id) {
    var t = T[id];
    return '<button class="chip g-' + t.g + '" data-sct="' + key + '|' + id + '" aria-pressed="' + (st.tsel[key] === id) + '">' +
      '<span class="a">' + esc(t.ar) + '</span><span class="en">' + esc(t.en) + '</span></button>';
  }
  function tpanel(id) {
    var t = T[id], c = C[t.c];
    return '<div class="tpanel g-' + t.g + '"><h5>' + esc(t.ar) + ' <span class="en">' + esc(t.en) + '</span></h5>' +
      '<p class="lbl">التعريف</p><p>' + esc(t.def) + '</p><p class="lbl">مثال</p><p>' + esc(t.ex) + '</p>' +
      (t.note ? '<div class="note">' + esc(t.note) + '</div>' : '') +
      '<button class="open-grp" data-onmap="' + id + '">اعرضه على الخريطة</button></div>';
  }
  function qblock(key, num, q, extra) {
    var open = !!st.rev[key], sel = st.tsel[key];
    return '<li class="qi"><div class="qrow"><span class="qn">' + (extra ? '+' : num) + '</span><p>' + esc(q.t) + '</p></div>' +
      '<button class="revbtn" data-rev="' + key + '" aria-expanded="' + open + '">' + (open ? 'إخفاء المصطلحات' : 'إظهار المصطلحات') + '</button>' +
      (open ? '<div class="chips qchips">' + q.terms.map(function (id) { return schip(key, id); }).join('') + '</div>' + (sel ? tpanel(sel) : '') : '') + '</li>';
  }
  function chartSvg(c) {
    var W = 520, H = 208, L = 34, R = 10, Tp = 22, B = 40, n = c.vals.length, max = 12;
    var X = function (i) { return L + (W - L - R) * (i / (n - 1)); };
    var Y = function (v) { return Tp + (H - Tp - B) * (1 - v / max); };
    var pts = c.vals.map(function (v, i) { return X(i) + ',' + Y(v); });
    var split = c.labels.filter(function (l) { return l.indexOf('خط ') === 0; }).length;
    var base = pts.slice(0, split).join(' '), tr = pts.slice(split).join(' ');
    var grid = [0, 4, 8, 12].map(function (v) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="gl"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="gt">' + v + '</text>'; }).join('');
    var xl = c.labels.map(function (l, i) { return '<text x="' + X(i) + '" y="' + (H - 14) + '" text-anchor="middle" class="gt">' + (i + 1) + '</text>'; }).join('') +
      '<text x="' + (W / 2) + '" y="' + (H - 1) + '" text-anchor="middle" class="gt">اليوم</text>';
    var dots = c.vals.map(function (v, i) { return '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="4" class="gd"/>'; }).join('');
    var sx = (X(split - 1) + X(split)) / 2;
    return '<figure class="gfig"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="الرسم البياني لعدد الصرخات في اليوم">' + grid +
      '<line x1="' + sx + '" x2="' + sx + '" y1="' + Tp + '" y2="' + (H - B) + '" class="ph"/>' +
      '<text x="' + ((L + sx) / 2) + '" y="13" text-anchor="middle" class="gt gp">خط الأساس</text><text x="' + ((sx + W - R) / 2) + '" y="13" text-anchor="middle" class="gt gp">الخطة</text>' + '<polyline points="' + base + '" class="gline"/><polyline points="' + tr + '" class="gline"/>' + dots + xl + '</svg>' +
      '<figcaption>عدد الصرخات في اليوم. الخط المتقطع يفصل خط الأساس عن بدء الخطة.</figcaption></figure>';
  }
  function renderScen() {
    var nav = SC.map(function (s) { return '<button class="sj" data-sjump="' + s.n + '">' + s.n + '. ' + esc(s.short) + '</button>'; }).join('');
    return '<div class="sview"><h2>سيناريوهات المناقشة</h2>' +
      '<p class="q">اقرأ السيناريو، وأجب عن أسئلته، ثم نناقش الإجابات معاً على الخريطة.</p><div class="snav">' + nav + '</div>' +
      SC.map(function (s) {
        return '<article class="scn" id="s-' + s.n + '"><header><span class="sn">' + s.n + '</span><div><h3>' + esc(s.short) + '</h3>' +
          '<p class="stag">الجلسة ' + s.session + ' · ' + esc(s.tag) + '</p></div></header>' +
          '<p class="situ">' + esc(s.situation) + '</p>' + (s.chart ? chartSvg(s.chart) : '') +
          '<h4>الأسئلة</h4><ol class="qs">' + s.q.map(function (q, i) { return qblock(s.n + '-' + i, i + 1, q, false); }).join('') + '</ol>' +
          '<h4>سؤال إضافي للنقاش</h4><ol class="qs">' + qblock(s.n + '-x', 0, s.follow, true) + '</ol></article>';
      }).join('') + '</div>';
  }

  function renderDetail() {
    var d = $('detail');
    if (st.view !== 'main') { d.className = ''; d.innerHTML = ''; return; }
    if (!st.sel) {
      d.className = 'guide';
      d.innerHTML = '<h2>كيف تستخدم الخريطة؟</h2><ol><li>اختر فرعاً من المجموعات الأربع لتظهر مصطلحاته.</li><li>اضغط على أي مصطلح لتظهر هنا تعريفه ومثاله.</li><li>اختر ممراً من الأعلى لترى كيف تترابط المصطلحات عبر المجموعات.</li></ol>';
      return;
    }
    var t = T[st.sel], c = C[t.c], g = G[t.g];
    var ps = inPaths(t.id);
    d.className = 'g-' + t.g + ' open';
    d.innerHTML = '<button class="close" data-close="1">إغلاق</button><h2>' + esc(t.ar) + '</h2><div class="meta"><span class="en">' + esc(t.en) + '</span><br>' + esc(g.ar) + ' · ' + esc(c.ar) + '</div>' +
      '<p class="lbl">التعريف</p><p>' + esc(t.def) + '</p><p class="lbl">مثال</p><p>' + esc(t.ex) + '</p>' +
      (t.note ? '<div class="note">' + esc(t.note) + '</div>' : '') +
      '<p class="lbl">يرتبط بـ</p><div class="chips" style="margin-top:4px">' + t.to.map(chip).join('') + '</div>' +
      (ps.length ? '<p class="lbl">يمر في الممرات</p><div class="tagrow">' + ps.map(function (i) { return '<span class="ptag">' + i + '</span>'; }).join('') + '</div>' : '') +
      '<button class="open-grp" data-open="' + t.id + '">افتح في الخريطة التفصيلية</button>';
  }

  function render() {
    renderTabs(); renderPaths();
    var v = $('view'), sh = $('shell');
    sh.className = 'shell' + (st.view === 'main' ? ' two' : '');
    if (st.view === 'main') v.innerHTML = renderMain();
    else if (st.view === 'sc') v.innerHTML = renderScen();
    else v.innerHTML = renderGroup(st.view);
    renderDetail();
  }

  function scrollToCard(id) {
    var el = document.getElementById('t-' + id);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('flash');
    setTimeout(function () { el.classList.remove('flash'); }, 1600);
  }

  function go(id) {
    if (st.view === 'main') { st.sel = id; st.open[T[id].c] = true; render(); return; }
    var t = T[id];
    st.view = t.g; st.sel = id; render(); scrollToCard(id);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.view) { st.view = b.dataset.view; if (st.view !== 'main') st.sel = null; render(); window.scrollTo(0, 0); return; }
    if (b.dataset.path !== undefined) {
      st.path = +b.dataset.path;
      if (st.path) P[st.path - 1].ids.forEach(function (id) { st.open[T[id].c] = true; });
      render(); return;
    }
    if (b.dataset.cl) { st.open[b.dataset.cl] = !st.open[b.dataset.cl]; render(); return; }
    if (b.dataset.toggleall) {
      var every = allClusterIds().every(function (k) { return st.open[k]; });
      allClusterIds().forEach(function (k) { st.open[k] = !every; });
      render(); return;
    }
    if (b.dataset.close) { st.sel = null; render(); return; }
    if (b.dataset.open) { var id = b.dataset.open; st.view = T[id].g; render(); scrollToCard(id); return; }
    if (b.dataset.rev) { st.rev[b.dataset.rev] = !st.rev[b.dataset.rev]; if (!st.rev[b.dataset.rev]) delete st.tsel[b.dataset.rev]; render(); return; }
    if (b.dataset.sct) { var pr = b.dataset.sct.split('|'); st.tsel[pr[0]] = (st.tsel[pr[0]] === pr[1]) ? null : pr[1]; render(); return; }
    if (b.dataset.onmap) { var mid = b.dataset.onmap; st.view = 'main'; st.sel = mid; st.open[T[mid].c] = true; render(); window.scrollTo(0, 0); return; }
    if (b.dataset.sjump) { var el = document.getElementById('s-' + b.dataset.sjump); if (el) el.scrollIntoView({ block: 'start' }); return; }
    if (b.dataset.go) go(b.dataset.go);
  });

  var n = window.TERMS.length;
  $('count').textContent = n + ' مصطلحاً في أربع مجموعات، يحيط بها إطار السلوك المهني والأخلاقيات.';
  var h = (location.hash || '').replace('#', '');
  if (h && (G[h] || h === 'sc')) st.view = h;
  render();
})();
