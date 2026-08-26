// ABA Demy — store cart (localStorage + WhatsApp checkout)
// Cart entries are stored as {id, name, price, qty}. Product name/price are
// captured directly from the "Add to Cart" button's data attributes at the
// moment of adding, so the cart never needs to re-fetch content JSON.

(function () {
    var CART_KEY = 'aba-demy-cart';
    var WHATSAPP_NUMBER = '966551538431';
    var isArabic = document.documentElement.lang === 'ar';

    var STR = isArabic ? {
        orderIntro: 'مرحبًا، أرغب بالتسجيل في:',
        orderTotal: 'الإجمالي التقديري:',
        currency: '$',
        qty: 'العدد'
    } : {
        orderIntro: "Hello, I'd like to register for:",
        orderTotal: 'Estimated total:',
        currency: '$',
        qty: 'Qty'
    };

    function getCart() {
        try {
            var raw = localStorage.getItem(CART_KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
    }

    function saveCart(cart) {
        try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ }
    }

    function cartCount(cart) {
        return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    }

    function cartTotal(cart) {
        return cart.reduce(function (sum, item) { return sum + item.qty * item.price; }, 0);
    }

    function renderBadge() {
        var badge = document.getElementById('cart-badge');
        if (!badge) return;
        var count = cartCount(getCart());
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }

    function renderDrawer() {
        var itemsWrap = document.getElementById('cart-items');
        var totalEl = document.getElementById('cart-total');
        var emptyMsg = itemsWrap ? itemsWrap.getAttribute('data-empty-label') || 'Cart is empty.' : '';
        if (!itemsWrap) return;
        var cart = getCart();

        if (!cart.length) {
            itemsWrap.innerHTML = '<p class="cart-empty-msg">' + emptyMsg + '</p>';
        } else {
            itemsWrap.innerHTML = cart.map(function (item, idx) {
                return (
                    '<div class="cart-item" data-idx="' + idx + '">' +
                        '<div class="cart-item-info">' +
                            '<h5>' + escapeHtml(item.name) + '</h5>' +
                            '<span class="cart-item-price">' + STR.currency + item.price + '</span>' +
                            '<div class="cart-item-qty">' +
                                '<button type="button" class="cart-qty-btn" data-action="dec" data-idx="' + idx + '">−</button>' +
                                '<span>' + item.qty + '</span>' +
                                '<button type="button" class="cart-qty-btn" data-action="inc" data-idx="' + idx + '">+</button>' +
                                '<button type="button" class="cart-item-remove" data-action="remove" data-idx="' + idx + '">' + (isArabic ? 'إزالة' : 'Remove') + '</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
            }).join('');
        }

        if (totalEl) totalEl.textContent = STR.currency + cartTotal(cart);
        renderBadge();
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function addToCart(id, name, price) {
        var cart = getCart();
        var existing = cart.find(function (i) { return i.id === id; });
        if (existing) existing.qty += 1;
        else cart.push({ id: id, name: name, price: price, qty: 1 });
        saveCart(cart);
        renderDrawer();
    }

    function changeQty(idx, delta) {
        var cart = getCart();
        if (!cart[idx]) return;
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
        saveCart(cart);
        renderDrawer();
    }

    function removeItem(idx) {
        var cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart);
        renderDrawer();
    }

    function clearCart() {
        saveCart([]);
        renderDrawer();
    }

    function openDrawer() {
        var drawer = document.getElementById('cart-drawer');
        var overlay = document.getElementById('cart-overlay');
        if (drawer) drawer.classList.add('open');
        if (overlay) overlay.classList.add('open');
    }

    function closeDrawer() {
        var drawer = document.getElementById('cart-drawer');
        var overlay = document.getElementById('cart-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    }

    function bumpCartButton() {
        var cartBtn = document.getElementById('cart-btn');
        if (!cartBtn) return;
        cartBtn.classList.remove('bump');
        // force reflow so the animation restarts on rapid consecutive adds
        void cartBtn.offsetWidth;
        cartBtn.classList.add('bump');
        setTimeout(function () { cartBtn.classList.remove('bump'); }, 500);
    }

    function checkout() {
        var cart = getCart();
        if (!cart.length) return;
        var lines = cart.map(function (item) {
            return '- ' + item.name + ' × ' + item.qty + ' (' + STR.currency + (item.qty * item.price) + ')';
        });
        var text = STR.orderIntro + '\n' + lines.join('\n') + '\n\n' + STR.orderTotal + ' ' + STR.currency + cartTotal(cart);
        var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
        window.open(url, '_blank', 'noopener');
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderBadge();
        renderDrawer();

        var cartBtn = document.getElementById('cart-btn');
        var closeBtn = document.getElementById('cart-close');
        var overlay = document.getElementById('cart-overlay');
        var clearBtn = document.getElementById('cart-clear-btn');
        var checkoutBtn = document.getElementById('cart-checkout-btn');
        var itemsWrap = document.getElementById('cart-items');

        if (cartBtn) cartBtn.addEventListener('click', openDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);
        if (clearBtn) clearBtn.addEventListener('click', clearCart);
        if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);

        if (itemsWrap) {
            itemsWrap.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-action]');
                if (!btn) return;
                var idx = parseInt(btn.getAttribute('data-idx'), 10);
                var action = btn.getAttribute('data-action');
                if (action === 'inc') changeQty(idx, 1);
                else if (action === 'dec') changeQty(idx, -1);
                else if (action === 'remove') removeItem(idx);
            });
        }

        // Add-to-cart buttons (present on the store page)
        document.querySelectorAll('[data-store-add]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-store-add');
                var name = btn.getAttribute('data-name');
                var price = parseFloat(btn.getAttribute('data-price'));
                addToCart(id, name, price);

                var original = btn.textContent;
                var addedLabel = btn.getAttribute('data-added-label') || original;
                btn.textContent = addedLabel;
                btn.classList.add('added');
                setTimeout(function () {
                    btn.textContent = original;
                    btn.classList.remove('added');
                }, 1400);

                bumpCartButton();
            });
        });
    });
})();
