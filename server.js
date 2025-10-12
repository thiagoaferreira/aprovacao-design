// server.js
import express from "express";
import nunjucks from "nunjucks";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configura o Nunjucks para renderizar HTML
nunjucks.configure(path.join(__dirname, "public"), {
  autoescape: true,
  express: app,
  watch: true,
});

// Serve arquivos estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, "public")));

// Rota principal
app.get("/", (req, res) => {
  res.render("index.html");
});

// Suporte para URL com parâmetros (como ?p=teste123)
app.get("*", (req, res) => {
  res.render("index.html");
});

// Porta (ajusta automaticamente para produção)
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor rodando em http://0.0.0.0:${PORT}`);
});
