FROM node:25-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
