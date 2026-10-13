/* ABA Demy — library cards
 * The cards are drawn from content/home.<lang>.json by content-loader.js.
 * This script then sets each card's link, label and "open in new tab" behaviour
 * according to the item type:
 *   article, video  -> opens the reader page  library-item.html?id=ID
 *   pdf, link       -> opens the file / address in a new tab
 *   page            -> opens the page (e.g. an interactive tool) in the same tab
 */
(function () {
  function decorate(content) {
    var lp = (content && content.library_page) || {};
    var types = lp.types || {};
    var labels = lp.open_labels || {};
    document.querySelectorAll('.library-card[data-lib-type]').forEach(function (card) {
      var type = card.getAttribute('data-lib-type');
      var id = card.getAttribute('data-lib-id');
      var url = card.getAttribute('data-lib-url') || '#';
      if (type === 'article' || type === 'video') {
        card.setAttribute('href', 'library-item.html?id=' + encodeURIComponent(id));
        card.removeAttribute('target');
      } else {
        card.setAttribute('href', url);
        if (type === 'pdf' || type === 'link') {
          card.setAttribute('target', '_blank');
          card.setAttribute('rel', 'noopener');
        } else {
          card.removeAttribute('target');
        }
      }
      var t = card.querySelector('[data-lib-type-label]');
      if (t && types[type]) t.textContent = types[type];
      var c = card.querySelector('[data-lib-cta]');
      if (c && labels[type]) c.textContent = labels[type];
    });
  }
  document.addEventListener('cms-content-loaded', function (e) { decorate(e.detail); });
})();
