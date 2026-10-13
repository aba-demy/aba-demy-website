/* ABA Demy — registration page
 * - fills the program list from the store items in the content file
 * - pre-selects the program from ?program=ID (set by each "Register" button)
 * - sends the form to Web3Forms (email notification) and shows a thank-you panel
 */
(function () {
  var form, select;

  function el(id) { return document.getElementById(id); }

  function currentItems() {
    var c = window.ABA_CONTENT;
    return (c && c.store && Array.isArray(c.store.items)) ? c.store.items : null;
  }

  function findItem(id) {
    var items = currentItems() || [];
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }

  function showItem(id, name) {
    var it = findItem(id);
    if (it) {
      el('reg-type').textContent = it.type || '';
      el('reg-name').textContent = it.name || '';
      el('reg-desc').textContent = it.description || '';
      el('reg-price').textContent = '$' + it.price;
      el('reg-price-note').textContent = it.price_note || '';
    } else if (name) {
      el('reg-name').textContent = name;
    }
    el('reg-program-id').value = id || '';
    var prefix = (window.ABA_CONTENT && window.ABA_CONTENT.register_page && window.ABA_CONTENT.register_page.subject_prefix)
      || el('reg-subject').value.replace(/[^—-]*$/, '');
    el('reg-subject').value = prefix + (it ? it.name : (name || ''));
  }

  function fillOptions() {
    var items = currentItems();
    if (!items || !items.length) return;
    var wanted = new URLSearchParams(location.search).get('program');
    var keep = select.selectedOptions[0] && select.selectedOptions[0].getAttribute('data-id');
    select.innerHTML = '';
    items.forEach(function (it) {
      var o = document.createElement('option');
      o.value = it.name;
      o.setAttribute('data-id', it.id);
      o.textContent = it.name;
      select.appendChild(o);
    });
    var target = wanted || keep || items[0].id;
    var found = false;
    Array.prototype.forEach.call(select.options, function (o) {
      if (o.getAttribute('data-id') === target) { select.value = o.value; found = true; }
    });
    if (!found) select.selectedIndex = 0;
    syncSummary();
  }

  function syncSummary() {
    var o = select.selectedOptions[0];
    if (o) showItem(o.getAttribute('data-id'), o.value);
  }

  function init() {
    form = el('reg-form');
    select = el('reg-program');
    if (!form || !select) return;

    // baked options: honour ?program= even if the content file didn't load
    var wanted = new URLSearchParams(location.search).get('program');
    if (wanted) {
      Array.prototype.forEach.call(select.options, function (o) {
        if (o.getAttribute('data-id') === wanted) select.value = o.value;
      });
    }
    syncSummary();
    select.addEventListener('change', syncSummary);
    document.addEventListener('cms-content-loaded', fillOptions);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var rp = (window.ABA_CONTENT && window.ABA_CONTENT.register_page) || {};
      var btn = el('reg-submit');
      var err = el('reg-error');
      var original = btn.textContent;
      err.hidden = true;
      btn.disabled = true;
      btn.textContent = rp.sending || (document.documentElement.lang === 'ar' ? 'جارٍ الإرسال...' : 'Sending...');

      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.success !== false; }); })
        .then(function (ok) {
          if (ok) {
            form.hidden = true;
            el('reg-done').hidden = false;
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (x) { window.scrollTo(0, 0); }
          } else {
            err.hidden = false;
          }
        })
        .catch(function () { err.hidden = false; })
        .then(function () { btn.disabled = false; btn.textContent = original; });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
