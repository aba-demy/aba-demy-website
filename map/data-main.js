window.GROUPS = [
  { id: 'p', ar: 'المبادئ السلوكية', en: 'Behavioral Principles', q: 'لماذا يحدث السلوك؟',
    clusters: [
      { id: 'resp', ar: 'الاشتراط الاستجابي', en: 'Respondent Conditioning' },
      { id: 'op', ar: 'الاشتراط الإجرائي', en: 'Operant Conditioning' },
      { id: 'ctl', ar: 'الضبط بالمثير', en: 'Stimulus Control' },
      { id: 'mot', ar: 'الدافعية', en: 'Motivation' }
    ] },
  { id: 's', ar: 'الاستراتيجيات', en: 'Teaching Strategies', q: 'كيف نعلّم؟',
    clusters: [
      { id: 'rf', ar: 'التعزيز في التعليم', en: 'Reinforcement in Teaching' },
      { id: 'pr', ar: 'التلقين والتلاشي', en: 'Prompting and Fading' },
      { id: 'tm', ar: 'طرق التعليم', en: 'Teaching Methods' },
      { id: 'gn', ar: 'التعميم والصيانة', en: 'Generalization and Maintenance' }
    ] },
  { id: 'r', ar: 'خفض المشكلات', en: 'Behavior Reduction', q: 'كيف نخفض السلوك المشكل؟',
    clusters: [
      { id: 'fn', ar: 'الوظيفة والبديل', en: 'Function and Replacement' },
      { id: 'ac', ar: 'قبل السلوك', en: 'Antecedent Strategies' },
      { id: 'cq', ar: 'بعد السلوك', en: 'Consequence Strategies' },
      { id: 'cr', ar: 'الخطة والأزمات', en: 'Plan and Crisis' }
    ] },
  { id: 'm', ar: 'القياس والتقييم', en: 'Measurement and Assessment', q: 'كيف نعرف أن ما نفعله ينجح؟',
    clusters: [
      { id: 'ms', ar: 'أنواع القياس', en: 'Measurement Types' },
      { id: 'ap', ar: 'تقييم المفضلات', en: 'Preference Assessment' },
      { id: 'as', ar: 'تقييم اكتساب المهارات', en: 'Skill Acquisition Assessment' },
      { id: 'af', ar: 'تقييم التحليل الوظيفي', en: 'Functional Assessment' },
      { id: 'dc', ar: 'الرسم البياني والقرار', en: 'Graphing and Decisions' },
      { id: 'sn', ar: 'ملاحظات الجلسة', en: 'Session Notes' }
    ] },
  { id: 'e', ar: 'السلوك المهني والأخلاقيات', en: 'Professional Conduct', q: 'ما الذي أستطيع فعله؟ وما الذي أرفعه؟',
    clusters: [ { id: 'et', ar: 'حدود الدور', en: 'Role Boundaries' } ] }
];

window.PATHS = [
  { id: 1, short: 'من المبدأ إلى خفض المشكلة', ar: 'من المبدأ إلى الاستراتيجية إلى خفض المشكلة',
    line: 'التعزيز يبني المهارة، وهو نفسه ما يُبقي المشكلة. الاقتران يصنع المعزز الشرطي، والاقتصاد الرمزي يستخدمه، وتحديد الوظيفة يخبرنا أي سلوك بديل نعزز.',
    ids: ['reinf', 'us', 'cs', 'pairing', 'creinf', 'token', 'functions', 'dra'] },
  { id: 2, short: 'التلقين والمفاهيم الأساسية', ar: 'التلقين وعلاقته بالمفاهيم الأساسية',
    line: 'التلقين يعمل في وجود المثير التمييزي. نتلاشى منه حتى ينتقل الضبط إلى المثير الطبيعي، وإن لم نتلاشَ منه وقع الاعتماد على التلقين.',
    ids: ['sd', 'stimctl', 'prompting', 'prompttypes', 'fading', 'sct', 'promptdep', 'reinf'] },
  { id: 3, short: 'الوظيفة تقرر الإجراء', ar: 'الوظيفة تقرر الإجراء',
    line: 'نلاحظ بـABC، فنعرف الوظيفة. العملية التأسيسية تفسر لماذا ارتفعت قيمة المعزز، ومن الوظيفة نختار: تعديل السوابق أو تعزيز بديل.',
    ids: ['abcrec', 'functions', 'eo', 'antecmod', 'ncr', 'demandfade', 'dra'] },
  { id: 4, short: 'القياس يحكم القرار', ar: 'القياس يحكم على القرار',
    line: 'نعرّف السلوك إجرائياً، ثم نقيسه، ونقارنه بخط الأساس في الرسم. وفي الرسم قد نرى انفجار الإخماد، فلا نحكم قبل أن نقرأ الاتجاه.',
    ids: ['opdef', 'freq', 'interval', 'baseline', 'graph', 'extburst', 'bip'] },
  { id: 5, short: 'حدود الدور', ar: 'حدود الدور',
    line: 'ننفذ الخطة ولا نغيرها. ما نلاحظه نكتبه بدقة ونرفعه للمشرف، وفي الأزمة نتبع الخطة ونبلغ فوراً، ونحافظ على السرية.',
    ids: ['scope', 'supervision', 'bip', 'crisis', 'reporting', 'notes', 'conf'] }
];
