// Local server: serves public/ and runs the api/ handlers the same way Vercel does.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 3000, PUB = path.resolve('public');
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', svg: 'image/svg+xml' };
const PAGES = { '/': 'index.html', '/candidate-form': 'index.html', '/admin': 'admin.html' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.status = c => (res.statusCode = c, res);
  res.json = o => (res.setHeader('content-type', 'application/json'), res.end(JSON.stringify(o)), res);
  try {
    const name = url.pathname.match(/^\/api\/([\w-]+)$/)?.[1];
    if (name) {
      let raw = '';
      for await (const c of req) raw += c;
      req.query = Object.fromEntries(url.searchParams);
      try { req.body = raw && String(req.headers['content-type']).includes('json') ? JSON.parse(raw) : {}; } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
      const mod = await import(`./api/${name}.js`);
      return await mod.default(req, res);
    }
    const file = path.join(PUB, PAGES[url.pathname] || path.normalize(url.pathname));
    if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.status(404).end('Not found');
    res.setHeader('content-type', TYPES[path.extname(file).slice(1)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'Server error' });
  }
}).listen(PORT, () => console.log(`Form:  http://localhost:${PORT}/\nAdmin: http://localhost:${PORT}/admin`));
