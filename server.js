// server.js
import express from "express";
import nunjucks from "nunjucks";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const views = path.join(__dirname, "public");

// Configura Nunjucks apontando para /public (onde estão os includes)
nunjucks.configure(views, {
  autoescape: true,
  express: app
});

// 1) Renderiza a página inicial via Nunjucks (processa {% include %})
app.get("/", (_req, res) => {
  res.render("index.html");
});

// 2) Arquivos estáticos (CSS/JS/imagens). Desliga "index" para não atropelar a rota /
app.use(express.static(views, { index: false, extensions: ["html"] }));

// 3) Fallback opcional (caso você abra /alguma-rota): devolve o index
app.get("*", (_req, res) => {
  res.render("index.html");
});

// Porta de execução
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});

const views = [
  path.join(__dirname, "public"),
  path.join(__dirname, "public", "src")
];
nunjucks.configure(views, { autoescape: true, express: app });

