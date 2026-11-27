const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT) || 4173;
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.glsl': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'example.html' : pathname.replace(/^\/+/, '');
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep) && filename !== root) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    fs.readFile(filename, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, {'Content-Type': types[path.extname(filename)] || 'application/octet-stream'});
        res.end(data);
    });
}).listen(port, '127.0.0.1', () => {
    console.log(`aframe-atoll-terrain demo at http://localhost:${port}/`);
});
