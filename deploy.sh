#!/usr/bin/env bash
set -euo pipefail

host="${1:-server}"
cd "$(dirname "$0")"
revision="$(git rev-parse --short HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then
  revision="${revision}-dirty"
fi

COPYFILE_DISABLE=1 tar --no-xattrs -czf - --exclude='.DS_Store' --exclude='._*' \
  index.html index.css index.js data.json images Dockerfile nginx.conf compose.yaml .dockerignore checker.mjs |
  ssh -o BatchMode=yes "$host" 'mkdir -p ~/profile && tar xzf - -C ~/profile'

ssh -o BatchMode=yes "$host" "cd ~/profile && GIT_COMMIT='$revision' docker compose up -d --build web && docker compose restart checker"
ssh -o BatchMode=yes "$host" 'set -e; cd ~/profile; port=$(sed -n "s/^PORT=//p" .env 2>/dev/null || true); port=${port:-3082}; for i in $(seq 1 30); do if wget -qO- "http://127.0.0.1:$port/version.txt"; then exit 0; fi; sleep 1; done; exit 1'
