# Imagem leve e estável do Node 18
FROM node:18-alpine

# Define diretório de trabalho
WORKDIR /app

# Copia todos os arquivos do projeto
COPY . .

# Instala o servidor estático "serve"
RUN npm install -g serve

# Define a porta de saída
EXPOSE 3000

# Comando para iniciar o servidor e manter ativo
CMD ["npx", "serve", ".", "-s", "-l", "3000"]
