```markdown
# 🧠 Gama Laser — Aprovação de Mockup

Interface web interativa para aprovação de personalizações de produtos (mockups) da **Gama Laser**.

---

## 🚀 Estrutura do projeto

```

src/
├── components/
│   ├── header.html       # Topo com logo e informações do pedido
│   ├── panel.html        # Painel principal de customização
│   ├── modal.html        # Modal de carregamento
├── css/
│   └── style.css         # Estilos principais (tema preto + painel branco)
├── js/
│   ├── main.js           # Integração geral e lógica do fluxo
│   ├── preview.js        # Geração de previews (Cloudinary)
│   ├── drag.js           # Movimento e redimensionamento das camadas
index.html                # Página raiz que importa todos os componentes
package.json              # Dependências e scripts de build

```

---

## 🧱 Tecnologias utilizadas

- **HTML/CSS/JS puro**
- **Cloudinary** → Geração dinâmica dos mockups
- **Supabase** → Controle de links e pedidos
- **EasyPanel / Nixpacks** → Deploy automatizado
- **n8n (via Webhook)** → Fluxo de geração e aprovação

---

## ⚙️ Deploy via EasyPanel

O EasyPanel detecta o tipo do projeto automaticamente (HTML estático + JavaScript).
Se ele estiver configurado com **Nixpacks**, basta confirmar:

| Campo | Valor sugerido |
|--------|----------------|
| **Versão** | 1.34.1 |
| **Comando de Instalação** | *(deixe em branco)* |
| **Comando de Build** | `npm run build` *(ou deixe em branco se não usa build)* |
| **Comando de Início** | `npm start` *(ou `serve .` se for projeto estático)* |
| **Pacotes Nix** | `nodejs` |
| **Pacotes APT** | *(vazio)* |

---

## 💡 Como verificar se está rodando certo

1️⃣ Vá até o **EasyPanel → seu app → aba “Deploy”**  
2️⃣ Clique em **“Logs”** e confirme que aparece algo como:

```

Server running at [http://0.0.0.0:3000](http://0.0.0.0:3000)

```

ou

```

Serving files from /src

````

3️⃣ Abra a URL pública do seu app e teste o link `?p=teste123`.

---

## 🧰 Scripts úteis (opcional)

Se quiser rodar localmente:
```bash
# Instalar servidor local
npm install -g serve

# Rodar o projeto
serve .
````

Acesse:
👉 [http://localhost:3000](http://localhost:3000)

---

## 🧡 Créditos

Desenvolvido por **Gama Laser**
Sistema de aprovação de arte e mockups — *Comunicação Visual & Brindes Personalizados*.

````

---

## ⚙️ 2️⃣ — Confirmações no **EasyPanel**
Pra garantir o build perfeito:

### 🔸 Passo a passo:

1. Vá em **“Deployments” → seu app**  
2. Na aba **“Build”**:
   - Selecione **Nixpacks**
   - Versão: `1.34.1`  
   - Pacotes Nix:  
     ```
     nodejs
     ```
   - Deixe os campos de comando vazios, **a menos que queira forçar**.

3. Se quiser explicitar (recomendado):
   - **Comando de Build:**  
     ```
     npm run build
     ```
     (ou deixe vazio se é só HTML/CSS/JS)
   - **Comando de Início:**  
     ```
     npx serve .
     ```
     *(Serve é o servidor local de arquivos estáticos, ideal pro seu caso)*

4. Clique em **“Salvar”** e depois em **“Redeploy”**.

---

## 💡 Dica extra
Se quiser deixar o deploy **super leve**, crie esse `package.json` básico no root (caso ainda não tenha):

```json
{
  "name": "aprovacao-design",
  "version": "1.0.0",
  "scripts": {
    "start": "npx serve ."
  },
  "dependencies": {
    "serve": "^14.2.0"
  }
}
````
