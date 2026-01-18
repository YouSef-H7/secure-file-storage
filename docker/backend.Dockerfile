# Backend Dockerfile for Local Development
# Node.js 20 Alpine - Minimal footprint for local testing
FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Set environment variables for local development
ENV NODE_ENV=development
ENV PORT=3000
ENV DATA_DIR=/data
ENV JWT_SECRET=dev_secret_local_testing_only

# Create required data directories
RUN mkdir -p /data/db /data/uploads

# Expose port
EXPOSE 3000

# Start backend
CMD ["npm", "start"]
