
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

COPY .env ./

RUN npm ci --only=production

COPY --from=builder /usr/src/app/build ./build

EXPOSE 3001

CMD [ "npm", "start" ]