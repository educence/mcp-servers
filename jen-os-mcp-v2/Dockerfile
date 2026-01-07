FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production
COPY src/ ./src/

RUN useradd -r -u 1001 mcpuser
USER mcpuser

EXPOSE 3847

ENV TRANSPORT=http
ENV PORT=3847

CMD ["node", "src/index.js"]
