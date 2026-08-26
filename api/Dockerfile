FROM node:20-alpine

# Install Python3, pip, and essential build packages
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY agent/requirements.txt ./agent/requirements.txt

# Install Node dependencies
RUN npm install

# Install Python dependencies in a virtual environment
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r agent/requirements.txt

ENV PATH="/opt/venv/bin:$PATH"

# Copy full application code
COPY . .

# Ensure start script has executable permissions
RUN chmod +x start.sh

# Expose ports: 3001 (Node Express) and 8000 (Python FastAPI)
EXPOSE 3001
EXPOSE 8000

# Start both services
CMD ["./start.sh"]
