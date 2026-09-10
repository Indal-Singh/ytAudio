FROM node:22-alpine

# yt-dlp (search/stream/download) + ffmpeg (mp3 convert via -x --audio-format)
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    ca-certificates \
  && pip3 install --no-cache-dir --break-system-packages -U yt-dlp \
  && yt-dlp --version \
  && ffmpeg -version

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
