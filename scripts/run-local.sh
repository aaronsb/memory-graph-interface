#!/bin/bash
set -e

# Ensure the host directory exists with correct permissions
HOST_DATA_DIR="/home/aaron/Documents/memory-graph-mcp"

# Run local development image with provided environment variables
# Use --user to run as the current user's UID:GID
docker run --rm -i \
  -p 3000:3000 \
  --user "$(id -u):$(id -g)" \
  -v "$HOST_DATA_DIR":/app/data \
  -e DB_PATH=/app/data/memory-graph.db \
  -e PORT=3000 \
  memory-graph-interface:local
