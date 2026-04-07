FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

EXPOSE 3001

CMD ["sh", "-c", "npm install && npm run start:dev"]
