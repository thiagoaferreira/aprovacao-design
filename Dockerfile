FROM node:18-alpine

WORKDIR /app
COPY . .

RUN npm install -g serve

EXPOSE 3000

# Força o bind público e mantém o processo em foreground
CMD ["serve", "-s", ".", "--listen", "0.0.0.0:3000"]
