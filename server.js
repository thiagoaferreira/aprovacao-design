// server.js
import express from "express";
import nunjucks from "nunjucks";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Pastas
const publicDir = path.join(__dirname, "public");
const srcDir = path.join(publicDir, "src");

// Paths de views para o Nunjucks (suporta public/ e public/src/)
const viewPaths = [publicDir];
if (fs.existsSync(srcDir)) viewPaths.push(srcDir);

// Nunjucks
nunjucks.configure(viewPaths, { autoescape: true, express: app });

// 1) Render do index via Nunjucks (processa {% include %})
app.get("/", (_req, res) => res.render("index.html"));

// 2) Estáticos (src primeiro, depois public); desliga "index" pra não capturar "/"
if (fs.existsSync(srcDir)) app.use(express.static(srcDir, { index: false }));
app.use(express.static(publicDir, { index: false, extensions: ["html"] }));

// 3) Fallback (rota solta volta pro index)
app.get("*", (_req, res) => res.render("index.html"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
