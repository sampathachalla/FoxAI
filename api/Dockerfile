FROM node:20-bookworm-slim

# Install Python3, pip, venv, and build tools (glibc base — onnxruntime, a transitive
# dependency of openwakeword, ships no musl/Alpine wheels, so this can't be Alpine)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip python3-venv build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY wakeword/requirements.txt ./wakeword/requirements.txt

# Install Node dependencies
RUN npm install

# Install Python dependencies (wake-word engine only — the Hermes agent runs in its
# own separate python-agent container, not inside this one) in a virtual environment
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r wakeword/requirements.txt

ENV PATH="/opt/venv/bin:$PATH"

# Copy full application code
COPY . .

# Ensure start script has executable permissions
RUN chmod +x start.sh

# Expose ports: 3001 (Node Express) and 8011 (Python wake-word FastAPI/WebSocket)
EXPOSE 3001
EXPOSE 8011

# Start both services
CMD ["./start.sh"]
