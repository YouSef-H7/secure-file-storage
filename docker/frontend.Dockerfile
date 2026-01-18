# Frontend Dockerfile for Local Development
# Multi-stage build: compile React app, then serve with Nginx

# Stage 1: Build React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy frontend source code and config files
COPY frontend . .
COPY tsconfig.json ./

# Build React app (tsc && vite build)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx configuration for local development
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app to Nginx root
COPY --from=builder /app/dist /var/www/app

# Create nginx pid directory
RUN mkdir -p /var/run/nginx

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
