// ABA Demy — professional readiness / knowledge assessment quiz.
// Flow: intro -> data capture (name/email/phone) -> 10 questions (progress bar) -> submit -> thank-you.
// The computed result is NOT shown on screen — it is emailed via Web3Forms (same access key used
// sitewide) to the academy's inbox, and to the trainee's own address if the academy enables
// Web3Forms' "Auto Response" feature for this access key (see delivery notes).

(function () {
    var shell = document.getElementById('quiz-shell');
    if (!shell) return; // not the assessment page

    var isArabic = document.documentElement.lang === 'ar';
    var WEB3FORMS_ACCESS_KEY = '5b5fd8d2-0c97-4e56-983d-db5016750f2a';
    var WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

    var STR = isArabic ? {
        progress: function (current, total) { return 'السؤال ' + current + ' من ' + total; },
        subject: 'نتيجة اختبار التقييم — ABA Demy',
        knowledgeLabel: 'المعرفة الأساسية',
        readinessLabel: 'الجاهزية المهنية',
        recommendationLabel: 'التوصية',
        levelFull: 'جاهز تمامًا للتسجيل المباشر في برنامج ABAT',
        levelPartial: 'جاهز مع بعض التحضير — يُنصح بالاطلاع على أساسيات تحليل السلوك التطبيقي قبل البدء',
        levelStart: 'يُنصح بالبدء بالمكتبة المعرفية والمقالات التعريفية أولًا قبل التسجيل في البرنامج',
        answerPrefix: 'السؤال'
    } : {
        progress: function (current, total) { return 'Question ' + current + ' of ' + total; },
        subject: 'Assessment Result — ABA Demy',
        knowledgeLabel: 'Baseline Knowledge',
        readinessLabel: 'Professional Readiness',
        recommendationLabel: 'Recommendation',
        levelFull: 'Fully ready to register directly for the ABAT program',
        levelPartial: 'Ready with some preparation — recommend reviewing ABA basics before starting',
        levelStart: 'Recommend starting with the Knowledge Library and intro articles before registering',
        answerPrefix: 'Question'
    };

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    var allSteps = $all('.quiz-step', shell);
    var questionSteps = allSteps.filter(function (el) { return /^q\d+$/.test(el.getAttribute('data-step') || ''); });
    var totalQuestions = questionSteps.length;

    var progressWrap = document.getElementById('quiz-progress');
    var progressFill = document.getElementById('quiz-progress-fill');
    var progressLabel = document.getElementById('quiz-progress-label');

    function stepEl(name) { return shell.querySelector('.quiz-step[data-step="' + name + '"]'); }

    function showStep(name) {
        allSteps.forEach(function (el) { el.hidden = (el.getAttribute('data-step') !== name); });
        var qIndex = questionSteps.findIndex(function (el) { return el.getAttribute('data-step') === name; });
        if (qIndex > -1) {
            progressWrap.hidden = false;
            var current = qIndex + 1;
            progressFill.style.width = (current / totalQuestions * 100) + '%';
            progressLabel.textContent = STR.progress(current, totalQuestions);
        } else {
            progressWrap.hidden = true;
        }
        shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---- Intro -> Intake ----
    var startBtn = document.getElementById('quiz-start-btn');
    if (startBtn) startBtn.addEventListener('click', function () { showStep('intake'); });

    // ---- Intake validation ----
    var nameInput = document.getElementById('q-name');
    var emailInput = document.getElementById('q-email');
    var phoneInput = document.getElementById('q-phone');
    var intakeBtn = document.getElementById('quiz-intake-btn');

    function validateIntake() {
        var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((emailInput.value || '').trim());
        var ok = nameInput.value.trim().length > 1 && emailOk && phoneInput.value.trim().length > 5;
        intakeBtn.disabled = !ok;
    }
    [nameInput, emailInput, phoneInput].forEach(function (el) {
        if (el) el.addEventListener('input', validateIntake);
    });
    if (intakeBtn) {
        intakeBtn.addEventListener('click', function () {
            showStep(questionSteps[0].getAttribute('data-step'));
        });
    }

    // ---- Question steps: enable next/submit once an option is chosen ----
    questionSteps.forEach(function (step, idx) {
        var options = $('.quiz-options', step);
        var nextBtn = $('.quiz-next-btn', step) || $('.quiz-submit-btn', step);
        var prevBtn = $('.quiz-prev-btn', step);

        if (options && nextBtn) {
            options.addEventListener('change', function () { nextBtn.disabled = false; });
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (idx === 0) showStep('intake');
                else showStep(questionSteps[idx - 1].getAttribute('data-step'));
            });
        }
        if (nextBtn && nextBtn.classList.contains('quiz-next-btn')) {
            nextBtn.addEventListener('click', function () {
                showStep(questionSteps[idx + 1].getAttribute('data-step'));
            });
        }
        if (nextBtn && nextBtn.classList.contains('quiz-submit-btn')) {
            nextBtn.addEventListener('click', submitAssessment);
        }
    });

    var retryBtn = document.getElementById('quiz-retry-btn');
    if (retryBtn) retryBtn.addEventListener('click', submitAssessment);

    function collectAnswers() {
        var knowledgeScore = 0, knowledgeMax = 0;
        var readinessScore = 0, readinessMax = 0;
        var lines = [];

        questionSteps.forEach(function (step, idx) {
            var section = step.getAttribute('data-section');
            var checked = $('.quiz-options input[type="radio"]:checked', step);
            var questionText = $('.quiz-question', step) ? $('.quiz-question', step).textContent : ('Q' + (idx + 1));
            var weight = checked ? parseInt(checked.getAttribute('data-weight'), 10) || 0 : 0;
            var answerText = checked ? checked.nextElementSibling.textContent : '';

            if (section === 'knowledge') {
                knowledgeScore += weight;
                knowledgeMax += 1; // each knowledge question's correct option carries weight 1
            } else {
                readinessScore += weight;
                readinessMax += 2; // each readiness question's top option carries weight 2
            }
            lines.push(questionText + ' → ' + answerText);
        });

        var recommendation;
        if (knowledgeScore >= 4 && readinessScore >= 5) recommendation = STR.levelFull;
        else if (knowledgeScore >= 2 || readinessScore >= 3) recommendation = STR.levelPartial;
        else recommendation = STR.levelStart;

        return {
            knowledgeScore: knowledgeScore, knowledgeMax: knowledgeMax,
            readinessScore: readinessScore, readinessMax: readinessMax,
            recommendation: recommendation,
            answerLines: lines
        };
    }

    function submitAssessment() {
        showStep('submitting');
        var result = collectAnswers();

        var messageParts = [
            STR.knowledgeLabel + ': ' + result.knowledgeScore + ' / ' + result.knowledgeMax,
            STR.readinessLabel + ': ' + result.readinessScore + ' / ' + result.readinessMax,
            STR.recommendationLabel + ': ' + result.recommendation,
            '',
        ].concat(result.answerLines);

        var payload = new FormData();
        payload.append('access_key', WEB3FORMS_ACCESS_KEY);
        payload.append('subject', STR.subject);
        payload.append('from_name', nameInput.value.trim());
        payload.append('name', nameInput.value.trim());
        payload.append('email', emailInput.value.trim());
        payload.append('phone', phoneInput.value.trim());
        payload.append('knowledge_score', result.knowledgeScore + ' / ' + result.knowledgeMax);
        payload.append('readiness_score', result.readinessScore + ' / ' + result.readinessMax);
        payload.append('recommendation', result.recommendation);
        payload.append('message', messageParts.join('\n'));

        fetch(WEB3FORMS_ENDPOINT, { method: 'POST', body: payload })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data && data.success) showStep('done');
                else showStep('error');
            })
            .catch(function () { showStep('error'); });
    }
})();
