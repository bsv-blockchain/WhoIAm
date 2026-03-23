#!/bin/sh
set -e

echo "Building frontend with VITE_FRONT_URL=${VITE_FRONT_URL:-not set}, VITE_API_URL=${VITE_API_URL:-not set}"
cd /app
npm run build
cp -r /app/dist/* /usr/share/nginx/html/

echo "Starting nginx..."
exec nginx -g "daemon off;"
