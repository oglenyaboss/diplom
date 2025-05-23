#!/bin/bash

echo "Stopping all containers..."
docker compose down

echo "Removing all containers..."
docker compose rm -f

echo "Removing all volumes..."
docker volume rm $(docker volume ls -q | grep mvp) 2>/dev/null || true

echo "Removing all images..."
docker rmi $(docker images -q) 2>/dev/null || true

echo "Clearing Docker build cache..."
docker builder prune -f

echo "Building fresh images..."
docker compose build --no-cache

echo "Starting services..."
docker compose up -d

echo "Done! All services have been rebuilt from scratch and started."
