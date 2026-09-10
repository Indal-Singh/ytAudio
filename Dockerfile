FROM node:22-alpine

# Default binaries (override at runtime with YTDLP_PATH / FFMPEG_PATH)
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

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV YTDLP_PATH=yt-dlp
ENV FFMPEG_PATH=ffmpeg

EXPOSE 3000

CMD ["npm", "run", "dev"]
