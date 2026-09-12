FROM node:20-bookworm-slim

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy full application code
COPY . .

# Ensure start script has executable permissions
RUN chmod +x start.sh

# Expose the Node.js/Express API port.
EXPOSE 3001

# Start the API service.
CMD ["./start.sh"]
