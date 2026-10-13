/* ABA Demy — library reader page: library-item.html?id=ID
 * Shows an article (text) or a video (YouTube / Vimeo embed) from content/home.<lang>.json -> library.items
 */
(function () {
  function el(id) { return document.getElementById(id); }

  function videoEmbed(url) {
    var m;
    if ((m = /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/.exec(url))) return 'https://www.youtube-nocookie.com/embed/' + m[1];
    if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url))) return 'https://player.vimeo.com/video/' + m[1];
    return '';
  }

  function render(content) {
    var lp = content.library_page || {};
    var id = new URLSearchParams(location.search).get('id');
    var items = (content.library && content.library.items) || [];
    var it = null;
    items.forEach(function (x) { if (x.id === id) it = x; });
    var box = el('item-content');
    var nf = el('item-notfound');
    if (!it) { box.hidden = true; nf.hidden = false; return; }
    nf.hidden = true; box.hidden = false;

    document.title = it.title + ' | ABA Demy';
    el('item-type').textContent = (lp.types || {})[it.type] || '';
    el('item-title').textContent = it.title;
    el('item-date').textContent = it.date || '';
    el('item-date').hidden = !it.date;

    var cover = el('item-cover');
    if (it.image && it.type !== 'video') { cover.src = it.image; cover.alt = it.title; cover.hidden = false; } else { cover.hidden = true; }

    var vf = el('item-video');
    vf.hidden = true; vf.innerHTML = '';
    var actions = el('item-actions');
    actions.innerHTML = '';

    if (it.type === 'video') {
      var src = videoEmbed(it.url || '');
      if (src) {
        var f = document.createElement('iframe');
        f.src = src; f.title = it.title; f.loading = 'lazy'; f.allowFullscreen = true;
        f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        vf.appendChild(f); vf.hidden = false;
      } else if (it.url) {
        var a = document.createElement('a');
        a.className = 'btn-primary'; a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = (lp.open_labels || {}).video || it.url;
        actions.appendChild(a);
      }
    }

    var body = el('item-body');
    body.innerHTML = '';
    var text = (it.body || it.summary || '');
    text.split(/\n\s*\n/).forEach(function (para) {
      para = para.trim(); if (!para) return;
      var p = document.createElement('p');
      para.split('\n').forEach(function (line, i) {
        if (i) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(line));
      });
      body.appendChild(p);
    });

    var back = document.createElement('a');
    back.className = 'btn-ghost'; back.href = 'library.html';
    back.textContent = lp.back_to_library || '';
    actions.appendChild(back);
  }

  document.addEventListener('cms-content-loaded', function (e) { render(e.detail); });
})();
