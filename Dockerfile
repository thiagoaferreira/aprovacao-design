# Imagem oficial do Node.js (leve e estável)
FROM node:18-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia todos os arquivos do projeto para dentro do container
COPY . .

# Instala o servidor leve "serve" (para hospedar o site estático)
RUN npm install -g serve

# Expõe a porta que o EasyPanel usa (padrão 3000)
EXPOSE 3000

# Comando de inicialização (serve tudo da raiz)
CMD ["npx", "serve", ".", "-l", "3000"]
