// ABA Demy admin API  (served at /api/admin/...)
// Every request must carry a valid Cloudflare Access login; the GitHub token stays here on the server.
//
//   GET  /api/admin/content   -> current ar/en content + file fingerprints
//   POST /api/admin/save      -> save both languages (+ uploaded images/PDFs) in ONE commit
//   GET  /api/admin/history   -> recent saves
//   GET  /api/admin/version   -> content of an older save (?sha=...)

import { verifyAccess } from '../../_lib/auth.js';
import { makeGitHub, GitHubError } from '../../_lib/github.js';

const AR_PATH = 'content/home.ar.json';
const EN_PATH = 'content/home.en.json';
const MAX_BODY = 28 * 1024 * 1024;           // whole request
const MAX_FILE = 12 * 1024 * 1024;           // one uploaded file (decoded)
const FILE_RULES = [
  { re: /^assets\/uploads\/[\w.-]+\.(png|jpe?g|webp|gif|svg)$/i },
  { re: /^files\/[\w.-]+\.pdf$/i }
];

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

function isPlainObject(x) { return x && typeof x === 'object' && !Array.isArray(x); }

function validateContent(c) {
  return isPlainObject(c) && isPlainObject(c.brand) && isPlainObject(c.nav) && isPlainObject(c.store) &&
    Array.isArray(c.store.items) && isPlainObject(c.library) && Array.isArray(c.library.items);
}

function approxBytes(b64) { return Math.floor((b64.length * 3) / 4); }

async function handle(request, env, route) {
  const method = request.method;

  const auth = await verifyAccess(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  if (method === 'GET' && route === 'whoami') return json({ email: auth.email, branch: env.GITHUB_BRANCH || 'main' });

  const gh = makeGitHub(env);

  if (method === 'GET' && route === 'content') {
    const [ar, en] = await Promise.all([gh.readFile(AR_PATH), gh.readFile(EN_PATH)]);
    return json({ ar: JSON.parse(ar.text), en: JSON.parse(en.text), blobs: { [AR_PATH]: ar.sha, [EN_PATH]: en.sha }, branch: gh.branch, email: auth.email });
  }

  if (method === 'GET' && route === 'history') {
    return json({ commits: await gh.listCommits(AR_PATH, 30) });
  }

  if (method === 'GET' && route === 'version') {
    const sha = new URL(request.url).searchParams.get('sha') || '';
    if (!/^[0-9a-f]{40}$/.test(sha)) return json({ error: 'bad request' }, 400);
    const [ar, en] = await Promise.all([gh.readFile(AR_PATH, sha), gh.readFile(EN_PATH, sha)]);
    return json({ ar: JSON.parse(ar.text), en: JSON.parse(en.text) });
  }

  if (method === 'POST' && route === 'save') {
    if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > MAX_BODY) return json({ error: 'الحجم كبير جدًا. قلّل عدد الصور أو حجم الملفات وجرّب مرة أخرى.' }, 413);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad request' }, 400); }
    if (!validateContent(body.ar) || !validateContent(body.en)) return json({ error: 'المحتوى غير صالح، لم يتم الحفظ.' }, 400);

    const files = [];
    for (const f of (Array.isArray(body.files) ? body.files : [])) {
      if (!f || typeof f.path !== 'string' || typeof f.base64 !== 'string') return json({ error: 'bad file' }, 400);
      if (f.path.includes('..') || !FILE_RULES.some((r) => r.re.test(f.path))) return json({ error: 'نوع الملف غير مسموح: ' + f.path }, 400);
      if (!/^[A-Za-z0-9+/=]+$/.test(f.base64) || approxBytes(f.base64) > MAX_FILE) return json({ error: 'الملف كبير جدًا: ' + f.path }, 413);
      files.push({ path: f.path, base64: f.base64 });
    }

    let message = typeof body.message === 'string' ? body.message.replace(/[\r\n]+/g, ' ').slice(0, 200) : '';
    if (!message) message = 'Admin: update site content';

    const expect = isPlainObject(body.blobs) ? { [AR_PATH]: body.blobs[AR_PATH], [EN_PATH]: body.blobs[EN_PATH] } : null;
    if (!expect || !expect[AR_PATH] || !expect[EN_PATH]) return json({ error: 'bad request' }, 400);

    const all = [
      { path: AR_PATH, text: JSON.stringify(body.ar, null, 2) + '\n' },
      { path: EN_PATH, text: JSON.stringify(body.en, null, 2) + '\n' }
    ].concat(files);

    const out = await gh.commitFiles(all, message, expect);
    const [ar, en] = await Promise.all([gh.readFile(AR_PATH), gh.readFile(EN_PATH)]);
    return json({ ok: true, commit: out.commit, blobs: { [AR_PATH]: ar.sha, [EN_PATH]: en.sha } });
  }

  return json({ error: 'not found' }, 404);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const route = Array.isArray(params.route) ? params.route.join('/') : String(params.route || '');
  try {
    return await handle(request, env, route);
  } catch (e) {
    if (e instanceof GitHubError) {
      if (e.status === 409) return json({ error: 'conflict', message: 'تم تعديل المحتوى من مكان آخر أثناء عملك. أعد تحميل الصفحة.' }, 409);
      if (e.status === 401 || e.status === 403) return json({ error: 'تعذّر الوصول إلى GitHub (تحقّق من الـ token وصلاحياته).' }, 502);
      if (e.status === 500) return json({ error: e.message }, 500);
      return json({ error: 'خطأ من GitHub: ' + e.message }, 502);
    }
    return json({ error: 'حدث خطأ غير متوقع.' }, 500);
  }
}
