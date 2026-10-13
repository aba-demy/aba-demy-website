/* What can be edited in the admin, and how it is shown.
 * Field types: text, textarea, html, url, number, bool, select, image, file, list, heading, note
 *   shared: true  -> one value, written to BOTH the Arabic and English files (images, prices, ids, ...)
 *   otherwise     -> two boxes side by side (Arabic | English)
 * Lists are edited in lockstep: adding / deleting / moving an item does it in both languages.
 */
(function () {
  var ICONS = [
    ['#icon-training', 'قبعة التخرج (تدريب)'], ['#icon-content', 'كتاب (محتوى)'], ['#icon-practice', 'هدف (ممارسة)'],
    ['#icon-community', 'أشخاص (مجتمع)'], ['#icon-programs', 'طبقات (برامج)'], ['#icon-library', 'رفوف (مكتبة)'],
    ['#icon-workshop', 'فقاعة حوار (ورشة)'], ['#icon-clock', 'ساعة'], ['#icon-mail', 'بريد']
  ];
  var TYPES = [['article', 'مقال'], ['pdf', 'ملف PDF'], ['video', 'فيديو'], ['link', 'رابط خارجي'], ['page', 'صفحة تفاعلية']];

  function t(k, l, extra) { return Object.assign({ k: k, l: l, t: 'text' }, extra || {}); }
  function ta(k, l, extra) { return Object.assign({ k: k, l: l, t: 'textarea' }, extra || {}); }
  function h(l) { return { t: 'heading', l: l }; }
  function eyebrowTitle(p) { return [t(p + '.eyebrow', 'العنوان الصغير (فوق العنوان)'), t(p + '.title', 'العنوان')]; }

  window.ADMIN_SCHEMA = [
    {
      id: 'home', title: 'الصفحة الرئيسية', desc: 'النصوص التي تظهر في الصفحة الرئيسية بالترتيب من الأعلى إلى الأسفل.',
      fields: [
        h('الشريط الإعلاني (أعلى الموقع)'),
        { k: 'banner.items', l: 'الإعلانات', t: 'list', itemName: 'إعلان', fields: [t('text', 'نص الإعلان')] },
        h('القسم الأول (الواجهة)'),
        t('hero.eyebrow', 'العنوان الصغير'),
        { k: 'hero.title_html', l: 'العنوان الكبير', t: 'html', hint: 'لبدء سطر جديد اكتب <br> في المكان المطلوب.' },
        ta('hero.paragraph', 'الفقرة'),
        t('hero.cta_primary', 'نص الزر الأول'),
        t('hero.cta_secondary', 'نص الزر الثاني'),
        h('الأرقام'),
        { k: 'stats', l: 'الأرقام والإحصاءات', t: 'list', itemName: 'رقم', fields: [t('number', 'الرقم'), t('label', 'الوصف')] },
        h('من نحن'),
        t('about.eyebrow', 'العنوان الصغير'), t('about.title', 'العنوان'), ta('about.lead', 'الفقرة الأولى'), ta('about.paragraph', 'الفقرة الثانية'),
        h('أكثر من منصة تدريبية'),
        t('platform_features.eyebrow', 'العنوان الصغير'), t('platform_features.title', 'العنوان'),
        { k: 'platform_features.items', l: 'العناصر', t: 'list', itemName: 'عنصر', fields: [{ k: 'icon', l: 'الأيقونة', t: 'select', shared: true, opts: ICONS }, t('title', 'العنوان')] },
        h('فلسفتنا'),
        t('philosophy.eyebrow', 'العنوان الصغير'),
        { k: 'philosophy.title_html', l: 'العنوان', t: 'html', hint: 'لبدء سطر جديد اكتب <br>.' },
        { k: 'philosophy.items', l: 'العناصر', t: 'list', itemName: 'عنصر', fields: [t('label', 'الكلمة'), ta('text', 'النص')] },
        h('ماذا نقدّم'),
        t('offerings.eyebrow', 'العنوان الصغير'), t('offerings.title', 'العنوان'),
        { k: 'offerings.items', l: 'العناصر', t: 'list', itemName: 'عنصر', fields: [{ k: 'icon', l: 'الأيقونة', t: 'select', shared: true, opts: ICONS }, t('title', 'العنوان'), ta('description', 'الوصف')] },
        h('البرامج التدريبية'),
        t('programs.eyebrow', 'العنوان الصغير'), t('programs.title', 'العنوان'),
        { k: 'programs.items', l: 'البرامج', t: 'list', itemName: 'برنامج', fields: [
          { k: 'active', l: 'متاح الآن للتسجيل', t: 'bool', shared: true },
          t('tag', 'الوسم (مثال: المستوى الأول · متاح الآن)'),
          t('name', 'اسم البرنامج'),
          t('code', 'الرمز المختصر (مثال: ABAT)', { shared: true }),
          ta('description', 'الوصف'),
          { k: 'features', l: 'المزايا', t: 'list', itemName: 'ميزة', fields: [t('text', 'النص')] },
          t('cta', 'نص الزر')
        ] },
        h('لماذا ABA Demy'),
        t('why.eyebrow', 'العنوان الصغير'), t('why.title', 'العنوان'),
        { k: 'why.items', l: 'العناصر', t: 'list', itemName: 'عنصر', fields: [t('title', 'العنوان'), ta('description', 'الوصف')] },
        h('قصة الأكاديمية'),
        t('origin.eyebrow', 'العنوان الصغير'), t('origin.title', 'العنوان'),
        { k: 'origin.items', l: 'الخطوات', t: 'list', itemName: 'خطوة', fields: [t('step', 'الرقم (مثال: 01)', { shared: true }), t('label', 'العنوان'), ta('text', 'النص')] },
        h('الاعتماد الدولي'),
        t('accreditation.title', 'العنوان'), ta('accreditation.description', 'الوصف'),
        h('نموذج «سجّل اهتمامك» في الصفحة الرئيسية'),
        t('register.eyebrow', 'العنوان الصغير'), t('register.title', 'العنوان'), ta('register.description', 'الوصف'),
        t('register.whatsapp_label', 'نص رابط واتساب'),
        t('register.form_name_label', 'عنوان حقل الاسم'), t('register.form_email_label', 'عنوان حقل البريد'), t('register.form_phone_label', 'عنوان حقل الهاتف'),
        t('register.form_city_label', 'عنوان حقل المدينة'), t('register.form_program_label', 'عنوان حقل البرنامج'),
        { k: 'register.form_program_options', l: 'خيارات البرنامج في القائمة', t: 'list', itemName: 'خيار', fields: [t('value', 'القيمة التي تصلك في الرسالة', { shared: false }), t('text', 'النص الظاهر')] },
        t('register.form_background_label', 'عنوان حقل الخلفية المهنية'), t('register.form_background_placeholder', 'النص التوضيحي داخل حقل الخلفية'),
        t('register.form_submit', 'نص زر الإرسال'), t('register.form_note', 'الملاحظة تحت النموذج'), t('register.form_subject', 'عنوان الرسالة التي تصلك بالبريد')
      ]
    },
    {
      id: 'store', title: 'المتجر والأسعار', desc: 'البرامج والدورات المعروضة في المتجر وأسعارها. الأسعار تُكتب بالدولار وتتغيّر في اللغتين معًا.',
      fields: [
        h('المنتجات'),
        { k: 'store.items', l: 'المنتجات', t: 'list', itemName: 'منتج', auto: 'item', fields: [
          { k: 'id', l: 'المعرّف (لا يُعدَّل)', t: 'id', shared: true },
          t('name', 'اسم المنتج'),
          t('type', 'النوع (مثال: حضوري / أونلاين / مسجّلة)'),
          { k: 'price', l: 'السعر ($)', t: 'number', shared: true },
          t('price_note', 'ملاحظة السعر (مثال: / للمتدرب)'),
          t('location', 'المكان (اتركه فارغًا إن لم يلزم)'),
          ta('description', 'الوصف'),
          t('badge', 'الشارة (مثال: الأكثر طلبًا، اتركها فارغة إن لم تلزم)'),
          { k: 'icon', l: 'الأيقونة', t: 'select', shared: true, opts: ICONS }
        ] },
        h('نصوص صفحة المتجر'),
        t('store_page.eyebrow', 'العنوان الصغير'), t('store_page.title', 'العنوان'), ta('store_page.intro', 'الفقرة التعريفية'),
        t('store_page.add_to_cart', 'نص زر «أضف إلى السلة»'), t('store_page.added_label', 'النص بعد الإضافة'), t('store_page.register_btn', 'نص زر «سجّل الآن»'),
        h('السلة'),
        t('store_page.cart_title', 'عنوان السلة'), t('store_page.cart_empty', 'رسالة السلة الفارغة'), t('store_page.cart_total_label', 'كلمة «الإجمالي»'),
        t('store_page.cart_checkout', 'نص زر إتمام الطلب'), t('store_page.cart_clear', 'نص زر إفراغ السلة'),
        t('store_page.whatsapp_order_intro', 'أول سطر في رسالة واتساب'), t('store_page.whatsapp_order_total', 'كلمة «الإجمالي» في رسالة واتساب')
      ]
    },
    {
      id: 'register', title: 'صفحة التسجيل', desc: 'نصوص صفحة نموذج التسجيل التي يصل إليها الزائر من زر «سجّل الآن».',
      fields: [
        t('register_page.eyebrow', 'العنوان الصغير'), t('register_page.title', 'العنوان'), ta('register_page.intro', 'الفقرة التعريفية'),
        h('عناوين الحقول'),
        t('register_page.program_label', 'البرنامج'), t('register_page.name_label', 'الاسم'), t('register_page.email_label', 'البريد'),
        t('register_page.phone_label', 'الهاتف'), t('register_page.city_label', 'المدينة'),
        t('register_page.background_label', 'الخلفية المهنية'), t('register_page.background_placeholder', 'النص التوضيحي للخلفية'),
        h('الأزرار والرسائل'),
        t('register_page.submit', 'نص زر الإرسال'), t('register_page.sending', 'نص أثناء الإرسال'),
        t('register_page.success_title', 'عنوان رسالة النجاح'), ta('register_page.success_message', 'نص رسالة النجاح'),
        ta('register_page.error_message', 'رسالة الخطأ'), t('register_page.back_to_store', 'نص زر العودة للمتجر'), t('register_page.whatsapp_label', 'نص رابط واتساب'),
        t('register_page.subject_prefix', 'بداية عنوان الرسالة التي تصلك (يضاف إليها اسم البرنامج)')
      ]
    },
    {
      id: 'library', title: 'المكتبة المعرفية', desc: 'أضف مقالات وملفات PDF وفيديوهات وروابط وصفحات. أول بطاقة هي «خريطة المصطلحات».',
      fields: [
        h('مواد المكتبة'),
        { k: 'library.items', l: 'المواد', t: 'list', itemName: 'مادة', auto: 'item', fields: [
          { k: 'id', l: 'المعرّف (لا يُعدَّل)', t: 'id', shared: true },
          { k: 'type', l: 'نوع المادة', t: 'select', shared: true, opts: TYPES },
          t('title', 'العنوان'),
          ta('summary', 'وصف قصير يظهر في البطاقة'),
          { k: 'image', l: 'صورة البطاقة (اختياري)', t: 'image', shared: true },
          { k: 'date', l: 'التاريخ (اختياري، مثال: 2026-10-13)', t: 'text', shared: true },
          { k: 'body', l: 'نص المقال (افصل بين الفقرات بسطر فارغ)', t: 'textarea', rows: 12, show: { type: ['article'] } },
          { k: 'url', l: 'العنوان', t: 'url', byType: 'type', variants: {
            pdf: { t: 'file', l: 'ملف PDF' },
            video: { t: 'url', l: 'رابط الفيديو (YouTube أو Vimeo)' },
            link: { t: 'url', l: 'الرابط الخارجي (يبدأ بـ https://)' },
            page: { t: 'url', l: 'عنوان الصفحة داخل الموقع (مثال: /map/ أو /en/map/)' }
          }, show: { type: ['pdf', 'video', 'link', 'page'] } }
        ] },
        h('نصوص صفحة المكتبة'),
        t('library_page.eyebrow', 'العنوان الصغير'), t('library_page.title', 'العنوان'), ta('library_page.intro', 'الفقرة التعريفية'),
        t('library_page.back_to_library', 'نص زر «العودة إلى المكتبة»'), t('library_page.not_found', 'رسالة «لم نجد المادة»'),
        h('أسماء الأنواع على البطاقات'),
        t('library_page.types.article', 'مقال'), t('library_page.types.pdf', 'ملف PDF'), t('library_page.types.video', 'فيديو'), t('library_page.types.link', 'رابط'), t('library_page.types.page', 'صفحة تفاعلية'),
        h('نص زر كل نوع'),
        t('library_page.open_labels.article', 'مقال'), t('library_page.open_labels.pdf', 'ملف PDF'), t('library_page.open_labels.video', 'فيديو'), t('library_page.open_labels.link', 'رابط'), t('library_page.open_labels.page', 'صفحة تفاعلية'),
        h('عندما تكون المكتبة فارغة'),
        t('library_page.empty_title', 'العنوان'), ta('library_page.message', 'الرسالة'), t('library_page.cta', 'نص الزر الأول'), t('library_page.back_cta', 'نص الزر الثاني')
      ]
    },
    {
      id: 'contact', title: 'التواصل', desc: 'أرقام وروابط التواصل، ونصوص صفحة «تواصل معنا».',
      fields: [
        h('بيانات التواصل'),
        { k: 'contact.whatsapp_number', l: 'رقم واتساب (أرقام فقط مع رمز الدولة، بدون + أو مسافات)', t: 'text', shared: true, digits: true },
        t('contact.whatsapp_display', 'نص رقم واتساب كما يظهر في الموقع'),
        { k: 'contact.email', l: 'البريد الإلكتروني', t: 'text', shared: true },
        t('contact.phone_display', 'رقم الهاتف كما يظهر (مع رمز الدولة، مثال: ‎+966 55 153 8431)'),
        { k: 'contact.instagram_url', l: 'رابط إنستغرام (اتركه فارغًا لإخفاء الأيقونة)', t: 'url', shared: true },
        { k: 'contact.facebook_url', l: 'رابط فيسبوك (اتركه فارغًا لإخفاء الأيقونة)', t: 'url', shared: true },
        { k: 'contact.linkedin_url', l: 'رابط لينكدإن (اتركه فارغًا لإخفاء الأيقونة)', t: 'url', shared: true },
        h('صفحة «تواصل معنا»'),
        t('contact_page.eyebrow', 'العنوان الصغير'), t('contact_page.title', 'العنوان'), ta('contact_page.intro', 'الفقرة التعريفية'),
        t('contact_page.form_name_label', 'عنوان حقل الاسم'), t('contact_page.form_email_label', 'عنوان حقل البريد'), t('contact_page.form_type_label', 'عنوان قائمة نوع الاستفسار'),
        { k: 'contact_page.form_type_options', l: 'خيارات نوع الاستفسار', t: 'list', itemName: 'خيار', fields: [t('text', 'النص')] },
        t('contact_page.form_message_label', 'عنوان حقل الرسالة'), t('contact_page.form_submit', 'نص زر الإرسال'), t('contact_page.form_note', 'الملاحظة تحت النموذج'),
        t('contact_page.info_title', 'عنوان «طرق أخرى للتواصل»'), t('contact_page.form_subject', 'عنوان الرسالة التي تصلك بالبريد')
      ]
    },
    {
      id: 'pages', title: 'الصفحات الأخرى والتذييل', desc: 'صفحة «عن الأكاديمية» وصفحة «الخدمات» والقائمة العلوية والتذييل.',
      fields: [
        h('صفحة عن الأكاديمية'), t('about_page.eyebrow', 'العنوان الصغير'), t('about_page.title', 'العنوان'),
        h('صفحة الخدمات'), t('services_page.eyebrow', 'العنوان الصغير'), t('services_page.title', 'العنوان'), ta('services_page.message', 'الرسالة'), t('services_page.cta', 'نص الزر الأول'), t('services_page.back_cta', 'نص الزر الثاني'),
        h('صفحة سياسة الخصوصية'),
        t('privacy_page.eyebrow', 'العنوان الصغير'), t('privacy_page.title', 'العنوان'), ta('privacy_page.intro', 'الفقرة التعريفية'), t('privacy_page.updated', 'تاريخ آخر تحديث'), t('privacy_page.link_label', 'نص رابط «سياسة الخصوصية» (تحت النماذج وفي التذييل)'),
        { k: 'privacy_page.sections', l: 'أقسام السياسة', t: 'list', itemName: 'قسم', fields: [t('title', 'عنوان القسم'), ta('text', 'النص', { rows: 5 })] },
        h('القائمة العلوية'),
        t('nav.home', 'الرئيسية'), t('nav.about', 'عن الأكاديمية'), t('nav.programs', 'البرامج'), t('nav.why', 'لماذا نحن'), t('nav.store', 'المتجر'),
        t('nav.services', 'الخدمات'), t('nav.library', 'المكتبة'), t('nav.contact', 'تواصل معنا'), t('nav.register', 'التسجيل'), t('nav.cta', 'الزر الداكن في القائمة'),
        h('اسم الأكاديمية والتذييل'),
        t('brand.name', 'اسم الأكاديمية'), t('brand.tagline', 'الشعار'), ta('footer.tagline', 'نص التذييل'), t('footer.copyright', 'حقوق النشر')
      ]
    },
    {
      id: 'images', title: 'الصور والشعارات', desc: 'الشعارات وشارات الاعتماد. عند اختيار صورة جديدة تُصغَّر تلقائيًا ثم تُرفع عند الضغط على «حفظ». الصور تتغيّر في اللغتين معًا.',
      fields: [
        { k: 'images.logo_header', l: 'الشعار في أعلى الموقع', t: 'image', shared: true },
        { k: 'images.logo_footer', l: 'الشعار في التذييل', t: 'image', shared: true },
        { k: 'images.qaba_badge_1', l: 'شارة الاعتماد الأولى', t: 'image', shared: true },
        { k: 'images.qaba_badge_2', l: 'شارة الاعتماد الثانية', t: 'image', shared: true }
      ]
    },
    {
      id: 'advanced', title: 'إعدادات متقدمة', desc: 'لا تغيّر هذه الإعدادات إلا إذا كنت متأكدة. الخطأ فيها قد يوقف وصول النماذج إلى بريدك.',
      fields: [
        h('محركات البحث (جوجل)'),
        t('meta.title', 'عنوان الموقع في نتائج البحث'), ta('meta.description', 'وصف الموقع في نتائج البحث'), ta('meta.keywords', 'الكلمات المفتاحية'),
        h('إرسال النماذج'),
        { k: 'forms.access_key', l: 'مفتاح Web3Forms (يحدد البريد الذي تصل إليه الرسائل)', t: 'text', shared: true, hint: 'هذا المفتاح عام وليس سريًا، لكنه مرتبط ببريدك في Web3Forms.' }
      ]
    }
  ];
  window.ADMIN_ICONS = ICONS;
})();
