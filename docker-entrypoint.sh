#!/bin/sh
set -e
# Always sync data defaults into the bind-mount so the image version is authoritative.
# On production, an S3 sync job runs after startup and overrides as needed.
echo "Syncing data directory from image defaults..."
cp -r /app/data-defaults/. /app/static/data/
exec "$@"
