FROM node:18.5.0-slim
RUN apt-get update && apt-get install -y zip git && rm -rf /var/lib/apt/lists/*
WORKDIR /srv/kai

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run downloaddata && npm run dist
RUN npm install http-server -g

EXPOSE 8094
CMD ["http-server", "./www", "-p", "8094"]