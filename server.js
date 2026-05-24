import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');

http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
  fs.access(filePath, err => {
    if (err) filePath = path.join(DIST, 'index.html');
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => console.log(`Running on ${PORT}`));