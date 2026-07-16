# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve the backend + compiled frontend
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production
COPY backend/ ./backend/
# Copy built static files from Stage 1 into backend's public directory
COPY --from=frontend-builder /app/frontend/dist ./backend/public

EXPOSE 5000
CMD ["node", "backend/src/server.js"]
