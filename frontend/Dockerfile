FROM node:12-alpine as builder

WORKDIR /usr/src/app

COPY app/package.json app/package-lock.json ./

RUN npm install

COPY /app .

RUN cp -r node_modules/@types/plotly.js node_modules/@types/plotly.js-dist

RUN npm run build --prod --loglevel verbose

FROM nginx:stable

COPY --from=builder /usr/src/app/dist/app/ /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf