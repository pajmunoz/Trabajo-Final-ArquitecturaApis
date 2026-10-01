# Una sola imagen para todos los procesos del monolito modular; cada contenedor
# elige su punto de entrada con `command` (api, auth, batch, core-adapter, core-simulado).
# Se construye desde la raíz del repositorio para incluir el contrato OpenAPI:
#   docker build -f backend/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/package.json ./
COPY backend/db ./db
# Contrato OpenAPI: lo sirve la API en /docs (Swagger UI).
COPY contracts/openapi.yaml ./contracts/openapi.yaml
# Archivos de despliegue: la instancia los extrae de la imagen (deploy/arrancar.sh).
COPY backend/deploy ./deploy
COPY backend/kong/kong.template.yml ./deploy/kong.template.yml
USER node
EXPOSE 3000 3001 4000
CMD ["node", "dist/apps/api.js"]
