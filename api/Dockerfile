# Production build
FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

# Copy package files first
COPY package*.json ./

# Install dependencies DIRECTLY here
ENV NODE_ENV=production
RUN npm ci --only=production

# Copy source code (ignores host node_modules via .dockerignore)
COPY src ./src

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Switch to non-root user
USER nodeuser

EXPOSE 8080

CMD ["node", "src/index.js"]
