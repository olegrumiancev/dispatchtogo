#!/bin/sh
echo "Running Prisma migrations..."
node_modules/.bin/prisma migrate deploy
echo "Starting server..."
exec node server.js
