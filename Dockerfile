FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    UV_THREADPOOL_SIZE=8 \
    HOTCACHE_TTL_MS=45000

WORKDIR /app

# FFmpeg is required by audio/video conversion and VoIP media flows.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
    && python3 -m pip install --no-cache-dir --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/* /root/.cache

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Northflank routes traffic to the declared service port.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# v7.52 TURBO: heap limitado a 1536MB (caixa de 2GB — sobra para
# ffmpeg/sharp/SO sem OOM-kill nem swap).
CMD ["node", "--max-old-space-size=1536", "src/index.js"]
