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

# Inicia o servidor escutando na interface pública correta
CMD ["serve", "-s", ".", "-l", "tcp://0.0.0.0:3000"]
