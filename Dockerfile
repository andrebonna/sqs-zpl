# Use a compatible ARM64 Node.js image
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Copy package.json first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Install additional tools for USB access (if needed)
RUN apt-get update && apt-get install -y udev

# Build the project (if using TypeScript)
RUN npm run build

CMD ["node", "dist/index.js"]

EXPOSE 3000