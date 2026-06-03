// github-api.js — minimal wrapper over GitHub Contents API
// Repo: manito2566/manit-asanok.github.io (branch: main)

(function () {
  const OWNER  = 'manito2566';
  const REPO   = 'manit-asanok.github.io';
  const BRANCH = 'main';
  const TOKEN_KEY = 'mportfolio.gh_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }
  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function headers() {
    const t = getToken();
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': t ? `Bearer ${t}` : '',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  // Convert a UTF-8 string to base64 (handles Thai chars correctly)
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  }
  // Convert base64 to UTF-8 string
  function base64ToUtf8(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  // Convert ArrayBuffer/Uint8Array (binary) to base64
  function bufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  async function verifyToken() {
    const t = getToken();
    if (!t) return { ok: false, reason: 'No token' };
    const r = await fetch('https://api.github.com/user', { headers: headers() });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    const u = await r.json();
    // Also verify repo access
    const r2 = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, { headers: headers() });
    if (!r2.ok) return { ok: false, reason: 'No access to repo' };
    return { ok: true, user: u };
  }

  // Get a file's content + SHA (for editing). Returns { content, sha } or null if not exists.
  async function getFile(path) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}?ref=${BRANCH}`;
    const r = await fetch(url, { headers: headers() });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GET ${path} → HTTP ${r.status}`);
    const j = await r.json();
    return {
      sha: j.sha,
      content: base64ToUtf8(j.content),
      size: j.size,
    };
  }

  // Put (create or update) a text file
  async function putTextFile(path, content, message, sha) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}`;
    const body = {
      message: message || `Update ${path}`,
      content: utf8ToBase64(content),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;
    const r = await fetch(url, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(`PUT ${path} → HTTP ${r.status}: ${e.message || ''}`);
    }
    return r.json();
  }

  // Put (create or update) a binary file (e.g., image)
  async function putBinaryFile(path, base64Content, message, sha) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}`;
    const body = {
      message: message || `Upload ${path}`,
      content: base64Content,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;
    const r = await fetch(url, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(`PUT (binary) ${path} → HTTP ${r.status}: ${e.message || ''}`);
    }
    return r.json();
  }

  // Delete a file
  async function deleteFile(path, message, sha) {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURI(path)}`;
    const body = {
      message: message || `Delete ${path}`,
      sha,
      branch: BRANCH,
    };
    const r = await fetch(url, { method: 'DELETE', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(`DELETE ${path} → HTTP ${r.status}: ${e.message || ''}`);
    }
    return r.json();
  }

  window.GH = {
    OWNER, REPO, BRANCH,
    getToken, setToken, headers,
    verifyToken, getFile, putTextFile, putBinaryFile, deleteFile,
    utf8ToBase64, base64ToUtf8, bufferToBase64,
  };
})();
