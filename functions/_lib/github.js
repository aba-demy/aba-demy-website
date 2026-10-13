// Small GitHub helper used by the admin API. The token never leaves the server.

const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function makeGitHub(env) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPO;           // "owner/name"
  const branch = env.GITHUB_BRANCH || 'main';
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new GitHubError(500, 'الإدارة غير مهيّأة بعد (إعدادات GitHub ناقصة).');
  }

  async function gh(method, path, body) {
    const res = await fetch(API + '/repos/' + repo + path, {
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'aba-demy-admin',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { /* ignore */ }
    if (!res.ok) throw new GitHubError(res.status, (json && json.message) || ('GitHub error ' + res.status));
    return json;
  }

  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

  function decodeBase64Utf8(b64) {
    const bin = atob(b64.replace(/\n/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  return {
    branch,

    // Read a JSON file at a branch head (default) or a given commit.
    async readFile(path, ref) {
      const f = await gh('GET', '/contents/' + enc(path) + '?ref=' + encodeURIComponent(ref || branch));
      return { text: decodeBase64Utf8(f.content), sha: f.sha };
    },

    async listCommits(path, limit) {
      const list = await gh('GET', '/commits?sha=' + encodeURIComponent(branch) + '&path=' + encodeURIComponent(path) + '&per_page=' + (limit || 30));
      return list.map((c) => ({ sha: c.sha, date: c.commit.committer.date, message: c.commit.message.split('\n')[0], author: c.commit.author.name }));
    },

    // Commit several files in ONE commit. files: [{ path, text } | { path, base64 }]
    // expectBlobs: { path: blobSha } - refuse if a file changed meanwhile.
    async commitFiles(files, message, expectBlobs) {
      const ref = await gh('GET', '/git/ref/heads/' + encodeURIComponent(branch));
      const headSha = ref.object.sha;
      const head = await gh('GET', '/git/commits/' + headSha);

      if (expectBlobs) {
        for (const path of Object.keys(expectBlobs)) {
          const cur = await gh('GET', '/contents/' + enc(path) + '?ref=' + headSha);
          if (cur.sha !== expectBlobs[path]) throw new GitHubError(409, 'conflict');
        }
      }

      const tree = [];
      for (const f of files) {
        const blob = await gh('POST', '/git/blobs', f.base64 !== undefined
          ? { content: f.base64, encoding: 'base64' }
          : { content: f.text, encoding: 'utf-8' });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const newTree = await gh('POST', '/git/trees', { base_tree: head.tree.sha, tree });
      const author = { name: 'ABA Demy Admin', email: 'admin@aba-demy.com' };
      const commit = await gh('POST', '/git/commits', { message, tree: newTree.sha, parents: [headSha], author, committer: author });
      try {
        await gh('PATCH', '/git/refs/heads/' + encodeURIComponent(branch), { sha: commit.sha, force: false });
      } catch (e) {
        if (e.status === 422 || e.status === 409) throw new GitHubError(409, 'conflict');
        throw e;
      }
      return { commit: commit.sha };
    }
  };
}
