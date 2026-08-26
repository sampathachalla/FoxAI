FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy application code
COPY . .

# Expose default API server port
EXPOSE 3001

# Start development server with live watch
CMD ["npm", "run", "dev"]
