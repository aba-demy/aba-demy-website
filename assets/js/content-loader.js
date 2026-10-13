/*
 * ABA Demy — content loader
 * Fetches content/home.<lang>.json and fills any element that carries a data-cms
 * attribute. If the fetch fails (e.g. viewing the file directly from disk, or a
 * network hiccup) the page simply keeps the text that is already baked into the
 * HTML, so nothing ever appears blank or broken.
 *
 * Attributes understood:
 *   data-cms="path"                 set the element's text
 *   data-cms-html                   (with data-cms) treat the value as HTML
 *   data-cms-pre="$"                (with data-cms) text put in front of the value
 *   data-cms-attr="attr:path|..."   set attributes (href, src, value, data-*, ...)
 *   data-cms-list="path"            repeat the <template> inside once per array item
 *   data-cms-show="path"            hide the element when the value is empty
 *   data-cms-hide="path"            hide the element when the value is NOT empty
 *
 * Paths are looked up inside the current scope (the page data, or the current
 * list item). A path that starts with "/" is always looked up in the page data,
 * e.g. data-cms="/store_page.add_to_cart" inside a list item.
 */
(function () {
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }

  function lookup(scope, root, path) {
    path = path.trim();
    if (path.charAt(0) === '/') return getPath(root, path.slice(1));
    return getPath(scope, path);
  }

  function isEmpty(v) {
    if (v === undefined || v === null || v === false) return true;
    if (typeof v === 'string') return v.trim() === '';
    if (Array.isArray(v)) return v.length === 0;
    return false;
  }

  function bindAttrs(el, scope, root) {
    var spec = el.getAttribute('data-cms-attr');
    if (!spec) return;
    spec.split('|').forEach(function (pair) {
      var idx = pair.indexOf(':');
      if (idx === -1) return;
      var attr = pair.slice(0, idx).trim();
      var path = pair.slice(idx + 1).trim();
      var val = lookup(scope, root, path);
      if (val !== undefined && val !== null) el.setAttribute(attr, val);
    });
  }

  function bindScope(rootEl, scope, root) {
    // Plain text / HTML bindings
    rootEl.querySelectorAll('[data-cms]').forEach(function (el) {
      if (el.closest('template')) return;
      var val = lookup(scope, root, el.getAttribute('data-cms'));
      if (val === undefined || val === null) return;
      if (el.hasAttribute('data-cms-html')) el.innerHTML = val;
      else el.textContent = (el.getAttribute('data-cms-pre') || '') + val;
    });

    // Attribute bindings (href, src, value, data-*, ...)
    rootEl.querySelectorAll('[data-cms-attr]').forEach(function (el) {
      if (el.closest('template')) return;
      bindAttrs(el, scope, root);
    });

    // Show / hide bindings
    rootEl.querySelectorAll('[data-cms-show]').forEach(function (el) {
      if (el.closest('template')) return;
      el.hidden = isEmpty(lookup(scope, root, el.getAttribute('data-cms-show')));
    });
    rootEl.querySelectorAll('[data-cms-hide]').forEach(function (el) {
      if (el.closest('template')) return;
      el.hidden = !isEmpty(lookup(scope, root, el.getAttribute('data-cms-hide')));
    });

    // Repeating list bindings
    rootEl.querySelectorAll('[data-cms-list]').forEach(function (container) {
      if (container.closest('template')) return;
      var tpl = container.querySelector(':scope > template');
      if (!tpl) return;
      var items = lookup(scope, root, container.getAttribute('data-cms-list'));
      if (!Array.isArray(items)) return;

      Array.prototype.slice.call(container.children).forEach(function (child) {
        if (child.tagName !== 'TEMPLATE') child.remove();
      });

      items.forEach(function (item) {
        var holder = document.createDocumentFragment();
        holder.appendChild(tpl.content.cloneNode(true));
        bindScope(holder, item, root);
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
        window.ABA_CONTENT = data;
        bindScope(document, data, data);
        document.dispatchEvent(new CustomEvent('cms-content-loaded', { detail: data }));
      })
      .catch(function () {
        /* keep the content already baked into the HTML */
      });
  });
})();
