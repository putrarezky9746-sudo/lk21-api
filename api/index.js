const http = require('http');
const path = require('path');
let app = null, err = null;

const origCreate = http.createServer;
const origListen = http.Server.prototype.listen;
http.createServer = function (...a) {
  const f = a.find(x => typeof x === 'function');
  if (f && !app) app = f;
  return origCreate.apply(this, a);
};
http.Server.prototype.listen = function () { return this; };

try {
  try {
    const ma = require('module-alias');
    ma.addAlias('@', path.join(__dirname, '..', 'dist'));
    const reg = require.resolve('module-alias/register');
    require.cache[reg] = { id: reg, filename: reg, loaded: true, exports: {}, children: [], paths: [] };
  } catch (e) {}
  const m = require('../dist/index.js');
  if (!app) app = typeof m === 'function' ? m : (m && typeof m.default === 'function' ? m.default : (m && m.app) || null);
} catch (e) {
  err = e;
} finally {
  http.createServer = origCreate;
  http.Server.prototype.listen = origListen;
}

module.exports = async (req, res) => {
  if ((req.url || '').startsWith('/__debug')) {
    const out = { appLoaded: !!app };
    for (const k of ['LK21_URL', 'ND_URL']) {
      const u = process.env[k];
      out[k] = u || null;
      if (!u) { out[k + '_tes'] = 'env belum diisi'; continue; }
      try {
        const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/124 Mobile Safari/537.36' }, redirect: 'follow' });
        const t = await r.text();
        out[k + '_tes'] = {
          status: r.status, urlAkhir: r.url, server: r.headers.get('server'),
          tantanganCloudflare: /just a moment|cf-chl|challenge-platform|attention required/i.test(t),
          cuplikan: t.replace(/\s+/g, ' ').slice(0, 160)
        };
      } catch (e) { out[k + '_tes'] = 'gagal: ' + ((e.cause && (e.cause.code || e.cause.message)) || e.message); }
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(out, null, 1));
  }
  if (!app) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'lk21-api gagal dimuat', detail: String((err && (err.stack || err.message)) || 'app Express tidak ditemukan').slice(0, 900) }));
  }
  return app(req, res);
};
