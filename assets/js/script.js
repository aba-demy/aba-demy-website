// ABA Demy — form handling, announcement banner & smooth UX

document.addEventListener('DOMContentLoaded', function () {
    initAnnounceBar();
    initNavToggle();
    document.addEventListener('cms-content-loaded', function (e) { initOptionalSocialLinks(e.detail); });

    const form = document.querySelector('.register-form');
    if (!form) return;

    const isArabic = document.documentElement.lang === 'ar';
    const msgSuccess = isArabic
        ? 'تم إرسال طلبك بنجاح. سيتواصل معك فريقنا قريبًا.'
        : 'Your request was sent successfully. Our team will contact you soon.';
    const msgError = isArabic
        ? 'تعذّر الإرسال. يرجى المحاولة مرة أخرى أو التواصل عبر واتساب.'
        : 'Something went wrong. Please try again or reach us on WhatsApp.';
    const msgSending = isArabic ? 'جارٍ الإرسال...' : 'Sending...';

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const original = button.textContent;
        button.textContent = msgSending;
        button.disabled = true;

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                showNote(form, msgSuccess, true);
                form.reset();
            } else {
                showNote(form, msgError, false);
            }
        } catch (err) {
            showNote(form, msgError, false);
        } finally {
            button.textContent = original;
            button.disabled = false;
        }
    });

    function showNote(formEl, text, ok) {
        let note = formEl.querySelector('.submit-result');
        if (!note) {
            note = document.createElement('p');
            note.className = 'submit-result';
            note.style.marginTop = '14px';
            note.style.padding = '12px 16px';
            note.style.borderRadius = '10px';
            note.style.fontSize = '15px';
            note.style.textAlign = 'center';
            formEl.appendChild(note);
        }
        note.textContent = text;
        note.style.background = ok ? '#F4EFDF' : '#fef2f2';
        note.style.color = ok ? '#091D4B' : '#c63636';
    }
});

function initAnnounceBar() {
    var bar = document.getElementById('announce-bar');
    if (!bar) return;
    var closeBtn = document.getElementById('announce-close');
    var track = bar.querySelector('.announce-track');

    var DISMISS_KEY = 'aba-demy-announce-dismissed';
    try {
        if (localStorage.getItem(DISMISS_KEY) === '1') {
            bar.style.display = 'none';
            return;
        }
    } catch (e) { /* localStorage unavailable — keep banner visible */ }

    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            bar.style.display = 'none';
            try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* ignore */ }
        });
    }

    // Once CMS content hydrates the track, duplicate its items once so the
    // CSS marquee (translateX(-50%)) loops seamlessly regardless of item count.
    function duplicateForLoop() {
        if (!track || track.dataset.duplicated === '1') return;
        var items = Array.prototype.slice.call(track.children).filter(function (el) {
            return el.tagName !== 'TEMPLATE';
        });
        if (!items.length) return;
        items.forEach(function (el) { track.appendChild(el.cloneNode(true)); });
        track.dataset.duplicated = '1';
    }

    // The HTML already ships with the announcement items duplicated once (for a
    // seamless loop with no JS at all). Only re-duplicate when content-loader.js
    // has actually replaced the track with fresh, un-duplicated CMS items.
    document.addEventListener('cms-content-loaded', duplicateForLoop);
}

// Facebook / Instagram / LinkedIn icons only appear once a real URL is set in
// the content JSON (via the control panel) — no dead/placeholder links.
function initOptionalSocialLinks(data) {
    var wrap = document.getElementById('footer-social');
    if (!wrap || !data || !data.contact) return;

    var ICONS = {
        facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
        instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
        linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V8h4v1.5A5.98 5.98 0 0 1 16 8z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>'
    };
    var LABELS = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn' };

    ['facebook', 'instagram', 'linkedin'].forEach(function (key) {
        var url = data.contact[key + '_url'];
        var existing = wrap.querySelector('[data-social="' + key + '"]');
        if (url) {
            if (!existing) {
                var a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener';
                a.setAttribute('data-social', key);
                a.setAttribute('aria-label', LABELS[key]);
                a.innerHTML = ICONS[key];
                wrap.appendChild(a);
            } else {
                existing.href = url;
            }
        } else if (existing) {
            existing.remove();
        }
    });
}


// Mobile menu: the three-line button shows / hides links, language switch and register button.
function initNavToggle() {
    var header = document.querySelector('header');
    var btn = document.getElementById('nav-toggle');
    if (!header || !btn) return;

    function setOpen(open) {
        header.classList.toggle('menu-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', function () {
        setOpen(!header.classList.contains('menu-open'));
    });
    // close after choosing something in the menu
    header.addEventListener('click', function (e) {
        if (e.target.closest('.nav-links a, .lang-switch, .nav-actions .btn-primary')) setOpen(false);
    });
    // close when tapping outside, or pressing Escape
    document.addEventListener('click', function (e) {
        if (!header.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setOpen(false);
    });
    // returning to a wide screen resets the menu
    if (window.matchMedia) {
        var mq = window.matchMedia('(min-width: 769px)');
        var onChange = function (ev) { if (ev.matches) setOpen(false); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
}
