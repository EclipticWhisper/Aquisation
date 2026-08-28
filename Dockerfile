# --- Base Stage ---
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY drizzle.config.js ./

# --- Development Stage (Matches Compose Target) ---
FROM base AS development
# Install ALL dependencies (including devDependencies for tools like Vite, Drizzle, etc.)
RUN npm install
COPY src ./src
ENV NODE_ENV=development
EXPOSE 5173
CMD ["npm", "run", "dev"]

# --- Production Stage ---
FROM base AS production
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
