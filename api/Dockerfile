FROM node:20-bookworm-slim

WORKDIR /app

# Copy this service's independent dependency manifests.
COPY package.json package-lock.json ./

# Install Node dependencies
RUN npm ci

# Copy full application code
COPY . .

# Ensure start script has executable permissions
RUN chmod +x start.sh

# Expose the Node.js/Express API port.
EXPOSE 3001

# Start the API service.
CMD ["./start.sh"]
