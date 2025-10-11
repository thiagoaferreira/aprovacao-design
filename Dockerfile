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

# Mantém o processo ativo em foreground
CMD ["sh", "-c", "serve -s . -l 3000 & tail -f /dev/null"]
