# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Switch to non-root user
USER nodeuser

EXPOSE 8080

CMD ["node", "src/index.js"]
