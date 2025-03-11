FROM node:18-bullseye AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Install additional tools for USB access (if needed)
#DRUN apt-get update && apt-get install -y udev

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/.env.development /app/.env.development
COPY --from=builder /app/.env /app/.env
COPY --from=builder /app/dist /app
CMD ["node", "index.js"]

EXPOSE 3000