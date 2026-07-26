// ABA Demy — form handling & smooth UX

document.addEventListener('DOMContentLoaded', function () {
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
        note.style.background = ok ? '#e7f8f5' : '#fdecec';
        note.style.color = ok ? '#0f766e' : '#b91c1c';
    }
});
