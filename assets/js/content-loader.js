/*
 * ABA Demy — content loader
 * Fetches content/home.<lang>.json and hydrates any element carrying a
 * data-cms attribute. If the fetch fails (e.g. viewing the file directly
 * from disk, or a network hiccup) the page simply keeps the text that is
 * already baked into the HTML, so nothing ever appears blank or broken.
 */
(function () {
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }

  function bindAttrs(el, scope) {
    var spec = el.getAttribute('data-cms-attr');
    if (!spec) return;
    spec.split('|').forEach(function (pair) {
      var idx = pair.indexOf(':');
      if (idx === -1) return;
      var attr = pair.slice(0, idx).trim();
      var path = pair.slice(idx + 1).trim();
      var val = getPath(scope, path);
      if (val !== undefined && val !== null) el.setAttribute(attr, val);
    });
  }

  function bindScope(root, scope) {
    // Plain text / HTML bindings
    root.querySelectorAll('[data-cms]').forEach(function (el) {
      if (el.closest('template')) return;
      var path = el.getAttribute('data-cms');
      var val = getPath(scope, path);
      if (val === undefined || val === null) return;
      if (el.hasAttribute('data-cms-html')) el.innerHTML = val;
      else el.textContent = val;
    });

    // Attribute bindings (href, content, etc.)
    root.querySelectorAll('[data-cms-attr]').forEach(function (el) {
      if (el.closest('template')) return;
      bindAttrs(el, scope);
    });

    // Repeating list bindings
    root.querySelectorAll('[data-cms-list]').forEach(function (container) {
      var tpl = container.querySelector(':scope > template');
      if (!tpl) return;
      var path = container.getAttribute('data-cms-list');
      var items = getPath(scope, path);
      if (!Array.isArray(items)) return;

      Array.prototype.slice.call(container.children).forEach(function (child) {
        if (child.tagName !== 'TEMPLATE') child.remove();
      });

      items.forEach(function (item) {
        var holder = document.createDocumentFragment();
        holder.appendChild(tpl.content.cloneNode(true));
        bindScope(holder, item);
        container.appendChild(holder);
      });
    });
  }

  function contentUrl(lang) {
    var base = document.body.getAttribute('data-content-base') || '';
    return base + 'content/home.' + lang + '.json';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var lang = document.documentElement.getAttribute('lang') || 'ar';
    fetch(contentUrl(lang), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('content fetch failed: ' + r.status);
        return r.json();
      })
      .then(function (data) {
        bindScope(document, data);
        document.dispatchEvent(new CustomEvent('cms-content-loaded', { detail: data }));
      })
      .catch(function () {
        /* keep the content already baked into the HTML */
      });
  });
})();
