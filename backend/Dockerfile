FROM node:22-bookworm-slim

# Install Python for Clinical Report PDF → DOCX conversion
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install Python dependencies
COPY requirements.txt ./

RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/opt/venv/bin:$PATH"

# Copy backend source
COPY . .

# Build TypeScript
RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "start"]