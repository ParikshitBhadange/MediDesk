# ---- base: shared deps layer ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- dev: full deps + nodemon, source mounted as a volume by docker-compose ----
FROM base AS dev
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---- production: used by Render ----
FROM base AS production
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
