FROM node:18-alpine

WORKDIR /app
COPY . .

# Cria um pequeno servidor Node que serve o index.html
RUN echo "import http from 'http'; import { readFileSync } from 'fs'; import { extname } from 'path'; \
const port = process.env.PORT || 3000; \
http.createServer((req, res) => { \
  let file = req.url === '/' ? '/index.html' : req.url; \
  try { \
    const data = readFileSync('.' + file); \
    const ext = extname(file).toLowerCase(); \
    const type = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.png':'image/png', '.jpg':'image/jpeg' }[ext] || 'text/plain'; \
    res.writeHead(200, { 'Content-Type': type }); \
    res.end(data); \
  } catch { \
    res.writeHead(404, {'Content-Type':'text/plain'}); \
    res.end('404 Not Found'); \
  } \
}).listen(port, '0.0.0.0', () => console.log('Server running on port', port));" > server.mjs

EXPOSE 3000
CMD ["node", "server.mjs"]
