FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Create data directory with permissions that allow any user to write to it
RUN mkdir -p /app/data && chmod 777 /app/data

# Set environment variables
ENV DB_PATH=/app/data/memory-graph.db
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
