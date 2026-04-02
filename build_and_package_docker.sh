#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_NAME="kanban_docker_images_$(date +%Y%m%d_%H%M%S).tar.gz"
OFFLINE_MODE="false"

if [[ "${1:-}" == "--offline" ]]; then
  OFFLINE_MODE="true"
fi

mkdir -p data
touch data/kanban.db

print_hint() {
  cat <<'HINT'

⚠️ Не удалось получить базовые образы из Docker Hub (часто это DNS/интернет на сервере).

Что можно сделать:
1) Проверить DNS/сеть на хосте (доступ к registry-1.docker.io:443).
2) Использовать зеркало/приватный registry:
   export PYTHON_IMAGE=<mirror>/python:3.11-slim
   export NODE_IMAGE=<mirror>/node:20-alpine
   export NGINX_IMAGE=<mirror>/nginx:1.27-alpine
   ./build_and_package_docker.sh
3) Если образы уже загружены локально, использовать:
   ./build_and_package_docker.sh --offline
   (в этом режиме сборка пропускается и архивируются существующие образы).
HINT
}

if [[ "${OFFLINE_MODE}" == "false" ]]; then
  echo "[1/3] Building Docker images via docker compose..."
  if ! docker compose build; then
    print_hint
    exit 1
  fi
else
  echo "[1/3] Offline mode: skip build, use existing local images"
fi

echo "[2/3] Checking required images..."
for image in kanban-backend:latest kanban-frontend:latest; do
  if ! docker image inspect "${image}" >/dev/null 2>&1; then
    echo "Image not found locally: ${image}"
    echo "Run normal build first or load images via docker load."
    exit 1
  fi
done

echo "[3/3] Saving images into archive: ${ARCHIVE_NAME}"
docker save kanban-backend:latest kanban-frontend:latest | gzip > "${ARCHIVE_NAME}"

echo "Done. Archive created: ${ARCHIVE_NAME}"
echo "To load on remote server:"
echo "  gunzip -c ${ARCHIVE_NAME} | docker load"
echo "  docker compose up -d"
