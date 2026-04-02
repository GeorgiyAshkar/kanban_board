#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_NAME="kanban_docker_images_$(date +%Y%m%d_%H%M%S).tar.gz"

mkdir -p data
touch data/kanban.db

echo "[1/3] Building Docker images via docker compose..."
docker compose build

echo "[2/3] Saving images into archive: ${ARCHIVE_NAME}"
docker save kanban-backend:latest kanban-frontend:latest | gzip > "${ARCHIVE_NAME}"

echo "[3/3] Done. Archive created: ${ARCHIVE_NAME}"
echo "To load on remote server:"
echo "  gunzip -c ${ARCHIVE_NAME} | docker load"
echo "  docker compose up -d"
