/* ABA Demy admin — edits content/home.ar.json and content/home.en.json side by side.
 * Talks only to /api/admin/* (protected by Cloudflare Access; the GitHub token lives on the server). */
(function () {
  'use strict';

  var SCHEMA = window.ADMIN_SCHEMA;
  var D = null;            // { ar: {...}, en: {...} }  the content being edited
  var SNAP = '';           // JSON text of D when last loaded / saved (to know if there are unsaved changes)
  var BLOBS = null;        // file fingerprints from the server (to detect edits made elsewhere)
  var pending = {};        // uploaded files waiting for Save: path -> { base64, url }
  var current = 0;         // selected section
  var saving = false;

  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------------ helpers
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setPath(o, p, v) {
    var ks = p.split('.'), a = o;
    for (var i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null || typeof a[ks[i]] !== 'object') a[ks[i]] = {}; a = a[ks[i]]; }
    a[ks[ks.length - 1]] = v;
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function rid() { return Math.random().toString(36).slice(2, 7); }
  function isDirty() { return JSON.stringify(D) !== SNAP; }

  function api(route, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body) { init.body = JSON.stringify(opts.body); init.headers['Content-Type'] = 'application/json'; }
    return fetch('/api/admin/' + route, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.message || j.error || ('HTTP ' + r.status)); e.status = r.status; e.code = j.error; throw e; }
        return j;
      });
    });
  }

  function toast(msg, kind) {
    var t = $('status');
    t.textContent = msg || '';
    t.className = 'status' + (kind ? ' ' + kind : '');
  }

  // ------------------------------------------------------------------ data prep
  function blank(fields) {
    var o = {};
    fields.forEach(function (f) {
      if (f.t === 'heading') return;
      var v = '';
      if (f.t === 'bool') v = false;
      else if (f.t === 'number') v = 0;
      else if (f.t === 'list') v = [];
      else if (f.t === 'select') v = f.opts[0][0];
      else if (f.t === 'id') v = 'item-' + rid();
      o[f.k] = v;
    });
    return o;
  }

  // make sure both languages have the same number of list items
  function normalizeLists(fields, a, b) {
    fields.forEach(function (f) {
      if (f.t !== 'list') return;
      var A = getPath(a, f.k), B = getPath(b, f.k);
      if (!Array.isArray(A)) { setPath(a, f.k, []); A = getPath(a, f.k); }
      if (!Array.isArray(B)) { setPath(b, f.k, []); B = getPath(b, f.k); }
      while (B.length < A.length) B.push(clone(A[B.length]));
      while (A.length < B.length) A.push(clone(B[A.length]));
      A.forEach(function (it, i) { normalizeLists(f.fields, it, B[i]); });
    });
  }
  function normalizeAll() { SCHEMA.forEach(function (s) { normalizeLists(s.fields, D.ar, D.en); }); }

  // fields that are computed from other fields
  function derive() {
    ['ar', 'en'].forEach(function (L) {
      var c = D[L].contact || (D[L].contact = {});
      c.whatsapp_number = String(c.whatsapp_number || '').replace(/\D/g, '');
      c.whatsapp_url = c.whatsapp_number ? 'https://wa.me/' + c.whatsapp_number : '';
      c.email = String(c.email || '').trim();
      c.email_href = c.email ? 'mailto:' + c.email : '';
      var digits = String(c.phone_display || '').replace(/\D/g, '');
      c.phone_href = digits ? 'tel:+' + digits : '';
    });
  }

  // ------------------------------------------------------------------ uploads
  function fileToBase64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1]); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  function slug(name) {
    var s = name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    return s || 'file';
  }
  function stamp() { var d = new Date(); return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }

  function resizeImage(file) {
    var MAX = 1600;
    if (/image\/(svg\+xml|gif)/.test(file.type)) return Promise.resolve({ blob: file, ext: file.type === 'image/gif' ? 'gif' : 'svg' });
    return createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d');
      var png = file.type === 'image/png' || file.type === 'image/webp';
      if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(bmp, 0, 0, w, h);
      return new Promise(function (res) {
        if (png) {
          cv.toBlob(function (b) {
            if (b.size > 900 * 1024) cv.toBlob(function (b2) { res({ blob: b2, ext: 'webp' }); }, 'image/webp', 0.88);
            else res({ blob: b, ext: 'png' });
          }, 'image/png');
        } else cv.toBlob(function (b) { res({ blob: b, ext: 'jpg' }); }, 'image/jpeg', 0.86);
      });
    });
  }

  function prepareUpload(file, kind) {
    if (kind === 'file') {
      if (file.type !== 'application/pdf') return Promise.reject(new Error('يجب أن يكون الملف بصيغة PDF.'));
      if (file.size > 9 * 1024 * 1024) return Promise.reject(new Error('حجم الملف كبير (الحد الأقصى 9 ميغابايت).'));
      return fileToBase64(file).then(function (b64) {
        var path = 'files/' + stamp() + '-' + rid() + '-' + slug(file.name) + '.pdf';
        return { path: path, base64: b64, blob: file };
      });
    }
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('يجب اختيار صورة.'));
    return resizeImage(file).then(function (r) {
      if (r.blob.size > 4 * 1024 * 1024) throw new Error('الصورة كبيرة جدًا حتى بعد التصغير.');
      return fileToBase64(r.blob).then(function (b64) {
        return { path: 'assets/uploads/' + stamp() + '-' + rid() + '-' + slug(file.name) + '.' + r.ext, base64: b64, blob: r.blob };
      });
    });
  }

  function uploadControl(kind, getVal, setVal) {
    var box = el('div', 'upl');
    var prev = el('div', 'upl-prev');
    var info = el('div', 'upl-info');
    var btns = el('div', 'upl-btns');
    var pick = el('button', 'btn small', kind === 'file' ? 'اختيار ملف PDF' : 'اختيار صورة');
    pick.type = 'button';
    var rm = el('button', 'btn small ghost', 'إزالة');
    rm.type = 'button';
    var inp = document.createElement('input');
    inp.type = 'file'; inp.hidden = true; inp.accept = kind === 'file' ? 'application/pdf' : 'image/*';

    function paint() {
      var v = getVal() || '';
      prev.innerHTML = '';
      var key = v.replace(/^\//, '');
      var src = pending[key] ? pending[key].url : v;
      if (kind === 'image' && v) { var im = document.createElement('img'); im.src = src; im.alt = ''; prev.appendChild(im); }
      else if (kind === 'file' && v) prev.appendChild(el('span', 'pdf', 'PDF'));
      else prev.appendChild(el('span', 'none', kind === 'file' ? 'لا يوجد ملف' : 'لا توجد صورة'));
      info.textContent = v ? (pending[key] ? 'جاهز للرفع عند الحفظ: ' : '') + v : '';
      rm.hidden = !v;
    }
    pick.addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; inp.value = '';
      if (!f) return;
      info.textContent = 'جارٍ التجهيز…';
      prepareUpload(f, kind).then(function (u) {
        u.url = URL.createObjectURL(u.blob);
        pending[u.path] = u;
        setVal('/' + u.path);
        paint();
      }).catch(function (e) { toast(e.message, 'err'); paint(); });
    });
    rm.addEventListener('click', function () { setVal(''); paint(); });
    btns.appendChild(pick); btns.appendChild(rm); btns.appendChild(inp);
    box.appendChild(prev); box.appendChild(info); box.appendChild(btns);
    paint();
    return box;
  }

  // ------------------------------------------------------------------ form controls
  function control(f, getVal, setVal, lang, fdef) {
    var type = f.t, e;
    if (type === 'text' || type === 'url') {
      e = document.createElement('input'); e.type = 'text'; e.value = getVal() == null ? '' : getVal();
      if (type === 'url' || f.digits) e.dir = 'ltr';
      e.addEventListener('input', function () { setVal(e.value); });
    } else if (type === 'textarea' || type === 'html') {
      e = document.createElement('textarea'); e.rows = f.rows || (type === 'html' ? 2 : 3); e.value = getVal() == null ? '' : getVal();
      if (type === 'html') e.dir = 'ltr' === lang ? 'ltr' : e.dir;
      e.addEventListener('input', function () { setVal(e.value); });
    } else if (type === 'number') {
      e = document.createElement('input'); e.type = 'number'; e.step = 'any'; e.min = '0'; e.dir = 'ltr';
      e.value = getVal() == null ? '' : getVal();
      e.addEventListener('input', function () { setVal(e.value === '' ? '' : Number(e.value)); });
    } else if (type === 'bool') {
      e = document.createElement('input'); e.type = 'checkbox'; e.checked = !!getVal();
      e.addEventListener('change', function () { setVal(e.checked); });
    } else if (type === 'select') {
      e = document.createElement('select');
      f.opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; e.appendChild(op); });
      e.value = getVal();
      if (e.value !== getVal()) { var odd = document.createElement('option'); odd.value = getVal(); odd.textContent = getVal(); e.appendChild(odd); e.value = getVal(); }
      e.addEventListener('change', function () { setVal(e.value); });
    } else if (type === 'image' || type === 'file') {
      e = uploadControl(type, getVal, setVal);
    } else if (type === 'id') {
      e = el('code', 'idv', getVal() || '');
    }
    if (lang && e && e.style !== undefined && type !== 'image' && type !== 'file') { e.lang = lang; if (!e.dir) e.dir = lang === 'en' ? 'ltr' : 'rtl'; }
    return e;
  }

  function fieldBlock(f, ctx, rerender) {
    var wrap = el('div', 'field');
    var type = f.t;
    var lab = el('label', 'flabel', f.l);
    wrap.appendChild(lab);
    if (f.hint) wrap.appendChild(el('div', 'hint', f.hint));

    var spec = f;
    if (f.byType) {   // the kind of box depends on another value (library item type)
      var kind = ctx.ar[f.byType];
      var v = f.variants[kind];
      if (v) { spec = Object.assign({}, f, v); lab.textContent = v.l; type = v.t; }
    }

    if (f.shared || type === 'bool' || type === 'id') {
      var c = control(Object.assign({}, spec, { t: type }),
        function () { var a = getPath(ctx.ar, f.k); return a !== undefined ? a : getPath(ctx.en, f.k); },
        function (val) { setPath(ctx.ar, f.k, val); setPath(ctx.en, f.k, val); afterChange(f, rerender); });
      if (type === 'bool') { wrap.classList.add('inline'); wrap.insertBefore(c, lab); } else wrap.appendChild(c);
      if (!f.shared && type !== 'bool' && type !== 'id') { /* never reached */ }
    } else {
      var row = el('div', 'bi');
      [['ar', 'العربية'], ['en', 'English']].forEach(function (L) {
        var cell = el('div', 'cell');
        cell.appendChild(el('span', 'ltag', L[1]));
        cell.appendChild(control(Object.assign({}, spec, { t: type }),
          function () { return getPath(ctx[L[0]], f.k); },
          function (val) { setPath(ctx[L[0]], f.k, val); afterChange(f, rerender); }, L[0]));
        row.appendChild(cell);
      });
      wrap.appendChild(row);
    }
    return wrap;
  }

  function afterChange(f, rerender) {
    updateSaveState();
    if (f.t === 'select' && rerender) rerender();
  }

  // ------------------------------------------------------------------ lists
  function itemTitle(f, a) {
    var first = f.fields.filter(function (x) { return x.t === 'text' || x.t === 'textarea'; })[0];
    var v = first && a && a[first.k];
    return v ? String(v).slice(0, 60) : '';
  }

  function listBlock(f, ctx) {
    var path = f.k;
    var A = getPath(ctx.ar, path), B = getPath(ctx.en, path);
    var wrap = el('div', 'list');
    wrap.appendChild(el('div', 'flabel', f.l));
    var holder = el('div', 'items');
    wrap.appendChild(holder);

    function paint() {
      holder.innerHTML = '';
      A.forEach(function (itA, i) {
        var itB = B[i];
        var card = el('div', 'item');
        var head = el('div', 'item-head');
        var title = el('span', 'item-title');
        function setTitle() { title.textContent = (f.itemName || 'عنصر') + ' ' + (i + 1) + (itemTitle(f, itA) ? ' — ' + itemTitle(f, itA) : ''); }
        setTitle();
        head.appendChild(title);
        var tools = el('div', 'tools');
        function tb(txt, label, fn, dis) { var b = el('button', 'icon', txt); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); b.disabled = !!dis; b.addEventListener('click', fn); tools.appendChild(b); }
        tb('▲', 'تحريك للأعلى', function () { swap(i, i - 1); }, i === 0);
        tb('▼', 'تحريك للأسفل', function () { swap(i + 1, i); }, i === A.length - 1);
        tb('✕', 'حذف', function () {
          if (window.confirm('حذف هذا العنصر من اللغتين؟')) { A.splice(i, 1); B.splice(i, 1); updateSaveState(); paint(); }
        });
        head.appendChild(tools);
        card.appendChild(head);

        var body = el('div', 'item-body');
        function paintBody() {
          body.innerHTML = '';
          var ictx = { ar: itA, en: itB };
          f.fields.forEach(function (sf) {
            if (sf.show) {
              var ok = Object.keys(sf.show).every(function (k) { return sf.show[k].indexOf(itA[k]) > -1; });
              if (!ok) return;
            }
            if (sf.t === 'list') body.appendChild(listBlock(sf, ictx));
            else body.appendChild(fieldBlock(sf, ictx, function () { paintBody(); }));
          });
        }
        paintBody();
        body.addEventListener('input', setTitle);
        card.appendChild(body);
        holder.appendChild(card);
      });
      if (!A.length) holder.appendChild(el('p', 'empty', 'لا توجد عناصر بعد.'));
    }
    function swap(a, b) {
      if (a < 0 || b < 0 || a >= A.length || b >= A.length) return;
      var x = A[a]; A[a] = A[b]; A[b] = x;
      var y = B[a]; B[a] = B[b]; B[b] = y;
      updateSaveState(); paint();
    }
    var add = el('button', 'btn add', '+ إضافة ' + (f.itemName || 'عنصر'));
    add.type = 'button';
    add.addEventListener('click', function () {
      var base = blank(f.fields);
      A.push(clone(base)); B.push(clone(base));
      updateSaveState(); paint();
      var items = holder.querySelectorAll('.item'); var last = items[items.length - 1];
      if (last) { last.scrollIntoView({ block: 'center' }); var inp = last.querySelector('input[type=text],textarea'); if (inp) inp.focus(); }
    });
    wrap.appendChild(add);
    paint();
    return wrap;
  }

  // ------------------------------------------------------------------ sections
  function renderNav() {
    var nav = $('nav'); nav.innerHTML = '';
    SCHEMA.forEach(function (s, i) {
      var b = el('button', 'navbtn' + (i === current ? ' on' : ''), s.title);
      b.type = 'button';
      b.addEventListener('click', function () { current = i; renderNav(); renderSection(); window.scrollTo(0, 0); });
      nav.appendChild(b);
    });
  }

  function renderSection() {
    var s = SCHEMA[current];
    var main = $('main'); main.innerHTML = '';
    main.appendChild(el('h2', null, s.title));
    main.appendChild(el('p', 'sdesc', s.desc));
    var legend = el('div', 'legend');
    legend.innerHTML = '<span><b>العربية</b> = النسخة العربية</span><span><b>English</b> = النسخة الإنجليزية</span><span>الحقل الذي بلا لغتين (الصور والأسعار…) يتغيّر في اللغتين معًا</span>';
    main.appendChild(legend);
    var ctx = { ar: D.ar, en: D.en };
    s.fields.forEach(function (f) {
      if (f.t === 'heading') main.appendChild(el('h3', 'grp', f.l));
      else if (f.t === 'list') main.appendChild(listBlock(f, ctx));
      else main.appendChild(fieldBlock(f, ctx, null));
    });
  }

  // ------------------------------------------------------------------ save / history
  function updateSaveState() {
    var d = isDirty();
    $('save').disabled = saving || !d;
    $('dirty').hidden = !d;
  }

  function collectIds(list, out, where) {
    (list || []).forEach(function (it) { if (it.id) { if (out[it.id]) out.dup.push(where + ': ' + it.id); out[it.id] = 1; } });
  }

  function validate() {
    var problems = [];
    var ids = { dup: [] };
    collectIds(D.ar.store.items, ids, 'المتجر');
    var ids2 = { dup: [] };
    collectIds(D.ar.library.items, ids2, 'المكتبة');
    ids.dup.concat(ids2.dup).forEach(function (d) { problems.push('معرّف مكرر (' + d + ')'); });
    D.ar.store.items.forEach(function (it, i) {
      if (it.price === '' || isNaN(Number(it.price)) || Number(it.price) < 0) problems.push('السعر غير صحيح في المنتج ' + (i + 1));
      if (!String(it.name || '').trim()) problems.push('اسم المنتج ' + (i + 1) + ' فارغ');
    });
    D.en.store.items.forEach(function (it, i) { if (!String(it.name || '').trim()) problems.push('اسم المنتج ' + (i + 1) + ' (English) فارغ'); });
    D.ar.library.items.forEach(function (it, i) {
      if (!String(it.title || '').trim()) problems.push('عنوان مادة المكتبة ' + (i + 1) + ' فارغ');
      if (it.type !== 'article' && !String(it.url || '').trim()) problems.push('عنوان/ملف مادة المكتبة ' + (i + 1) + ' (العربية) فارغ');
    });
    D.en.library.items.forEach(function (it, i) {
      if (!String(it.title || '').trim()) problems.push('عنوان مادة المكتبة ' + (i + 1) + ' (English) فارغ');
      if (it.type !== 'article' && !String(it.url || '').trim()) problems.push('عنوان/ملف مادة المكتبة ' + (i + 1) + ' (English) فارغ');
    });
    return problems;
  }

  function changedSections() {
    var old = JSON.parse(SNAP), keys = {};
    ['ar', 'en'].forEach(function (L) {
      Object.keys(D[L]).forEach(function (k) { if (JSON.stringify(D[L][k]) !== JSON.stringify(old[L][k])) keys[k] = 1; });
    });
    return Object.keys(keys);
  }

  function save() {
    if (saving || !isDirty()) return;
    derive();
    var problems = validate();
    if (problems.length) { toast('لم يتم الحفظ: ' + problems.slice(0, 4).join('، '), 'err'); return; }
    var text = JSON.stringify(D);
    var files = Object.keys(pending).filter(function (p) { return text.indexOf('/' + p) > -1; }).map(function (p) { return { path: p, base64: pending[p].base64 }; });
    var message = 'Admin: update ' + changedSections().join(', ');
    saving = true; updateSaveState(); toast('جارٍ الحفظ…');
    api('save', { method: 'POST', body: { ar: D.ar, en: D.en, blobs: BLOBS, files: files, message: message } }).then(function (r) {
      BLOBS = r.blobs; SNAP = JSON.stringify(D); pending = {};
      toast('تم الحفظ ✓ — سيظهر التعديل على الموقع خلال دقيقة إلى دقيقتين.', 'ok');
    }).catch(function (e) {
      if (e.code === 'conflict') toast('تم تعديل المحتوى من مكان آخر أثناء عملك. أعيدي تحميل الصفحة (ستفقدين التعديلات غير المحفوظة).', 'err');
      else toast('لم يتم الحفظ: ' + e.message, 'err');
    }).then(function () { saving = false; updateSaveState(); });
  }

  function openHistory() {
    var dlg = $('history'); var list = $('hist-list');
    list.innerHTML = '<p>جارٍ التحميل…</p>';
    dlg.hidden = false;
    api('history').then(function (r) {
      list.innerHTML = '';
      if (!r.commits.length) list.appendChild(el('p', null, 'لا توجد نسخ سابقة.'));
      r.commits.forEach(function (c, i) {
        var row = el('div', 'hrow');
        var d = new Date(c.date);
        row.appendChild(el('div', 'hdate', d.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })));
        row.appendChild(el('div', 'hmsg', i === 0 ? 'النسخة الحالية — ' + c.message : c.message));
        if (i > 0) {
          var b = el('button', 'btn small', 'تحميل هذه النسخة');
          b.type = 'button';
          b.addEventListener('click', function () { restore(c.sha, d); });
          row.appendChild(b);
        }
        list.appendChild(row);
      });
    }).catch(function (e) { list.innerHTML = ''; list.appendChild(el('p', 'err', e.message)); });
  }

  function restore(sha, date) {
    if (isDirty() && !window.confirm('لديك تعديلات غير محفوظة وستُستبدل بهذه النسخة. متابعة؟')) return;
    $('hist-list').innerHTML = '<p>جارٍ التحميل…</p>';
    api('version?sha=' + sha).then(function (r) {
      D = { ar: r.ar, en: r.en }; normalizeAll();
      $('history').hidden = true;
      renderSection(); updateSaveState();
      toast('تم تحميل نسخة ' + date.toLocaleDateString('ar') + ' في اللوحة. راجعيها ثم اضغطي «حفظ التعديلات» لاعتمادها.', 'ok');
    }).catch(function (e) { toast(e.message, 'err'); $('history').hidden = true; });
  }

  // ------------------------------------------------------------------ start
  function init() {
    $('save').addEventListener('click', save);
    $('open-history').addEventListener('click', openHistory);
    $('hist-close').addEventListener('click', function () { $('history').hidden = true; });
    window.addEventListener('beforeunload', function (e) { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } });

    toast('جارٍ تحميل المحتوى…');
    api('content').then(function (r) {
      D = { ar: r.ar, en: r.en }; BLOBS = r.blobs;
      normalizeAll();
      SNAP = JSON.stringify(D);
      $('who').textContent = r.email + (r.branch && r.branch !== 'main' ? ' · الفرع التجريبي: ' + r.branch : '');
      toast('');
      renderNav(); renderSection(); updateSaveState();
    }).catch(function (e) {
      toast('تعذّر تحميل المحتوى: ' + e.message, 'err');
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
