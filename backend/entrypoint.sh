#!/bin/sh
printf "Waiting for install backend..."
cd /app
#npm config set fund false
npm install -g npm@10.2.3
npm install -g prisma
#npm audit fix
npm install
prisma generate
prisma db push #--force-reset
npm run build
echo "node dist/main" > /scripts/entrypoint.sh
node dist/main
npm run start:dev
