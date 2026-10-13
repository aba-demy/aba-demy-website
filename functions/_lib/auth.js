// Verifies the Cloudflare Access login (the "Cf-Access-Jwt-Assertion" header).
// Nothing in the admin API works unless this check passes.

const JWKS_TTL_MS = 60 * 60 * 1000;
let jwksCache = { at: 0, team: '', keys: null };

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function getKeys(team, force) {
  const now = Date.now();
  if (!force && jwksCache.keys && jwksCache.team === team && now - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch('https://' + team + '/cdn-cgi/access/certs');
  if (!res.ok) throw new Error('Could not load Access signing keys (' + res.status + ')');
  const body = await res.json();
  jwksCache = { at: now, team, keys: body.keys || [] };
  return jwksCache.keys;
}

function splitList(v) {
  return String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
}

/**
 * Returns { ok: true, email } or { ok: false, status, error }.
 */
export async function verifyAccess(request, env) {
  const team = String(env.ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const auds = splitList(env.ACCESS_AUD);
  const allowed = splitList(env.ALLOWED_EMAIL).map((e) => e.toLowerCase());
  if (!team || !auds.length || !allowed.length) {
    return { ok: false, status: 500, error: 'الإدارة غير مهيّأة بعد (إعدادات Cloudflare Access ناقصة).' };
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return { ok: false, status: 401, error: 'يلزم تسجيل الدخول.' };

  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('bad token');
    const header = b64urlToJson(parts[0]);
    const payload = b64urlToJson(parts[1]);
    if (header.alg !== 'RS256') throw new Error('bad alg');

    let keys = await getKeys(team, false);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) { keys = await getKeys(team, true); jwk = keys.find((k) => k.kid === header.kid); }
    if (!jwk) throw new Error('unknown key');

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!valid) throw new Error('bad signature');

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('expired');
    if (typeof payload.nbf === 'number' && payload.nbf > now + 60) throw new Error('not yet valid');
    if (payload.iss !== 'https://' + team) throw new Error('bad issuer');
    const tokenAuds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!tokenAuds.some((a) => auds.includes(a))) throw new Error('bad audience');
    const email = String(payload.email || '').toLowerCase();
    if (!email || !allowed.includes(email)) {
      return { ok: false, status: 403, error: 'هذا الحساب غير مصرّح له بالدخول.' };
    }
    return { ok: true, email };
  } catch (e) {
    return { ok: false, status: 401, error: 'تعذّر التحقق من تسجيل الدخول.' };
  }
}
