# Una sola imagen para todos los procesos del monolito modular; cada contenedor
# elige su punto de entrada con `command` (api, auth, batch, core-adapter, core-simulado).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY db ./db
# Archivos de despliegue: la instancia los extrae de la imagen (deploy/arrancar.sh).
COPY deploy ./deploy
COPY kong/kong.template.yml ./deploy/kong.template.yml
USER node
EXPOSE 3000 3001 4000
CMD ["node", "dist/apps/api.js"]
