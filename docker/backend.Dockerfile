# Production Dockerfile for NestJS Backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci

COPY . .
RUN npm run build -w packages/types
RUN npm run build -w packages/shared
RUN npm run build -w apps/backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/types/package*.json ./packages/types/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --only=production

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3001
CMD ["node", "apps/backend/dist/main"]
