#!/bin/bash

set -e

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

DOCKER_CONFIG="/etc/docker/daemon.json"
TMP_CONFIG="/tmp/daemon.json.tmp"

trap 'sudo rm -f "$TMP_CONFIG"' EXIT

command -v jq >/dev/null || { log "Error: 'jq' is required."; exit 1; }
command -v docker >/dev/null || { log "Error: Docker is not installed."; exit 1; }
systemctl is-active --quiet docker || { log "Error: Docker is not running."; exit 1; }
sudo -n true 2>/dev/null || { log "Error: Sudo privileges required."; exit 1; }

log "Checking if Docker BuildKit is enabled..."
if [ -f "$DOCKER_CONFIG" ] && jq -e '.features.buildkit == true' "$DOCKER_CONFIG" >/dev/null; then
  log "Docker BuildKit is already enabled."
  exit 0
fi

log "Enabling Docker BuildKit..."
if [ -f "$DOCKER_CONFIG" ]; then
  jq '(.features // {}) + {buildkit: true} | . as $f | .features = $f' "$DOCKER_CONFIG" | sudo tee "$TMP_CONFIG" >/dev/null
else
  echo '{"features": {"buildkit": true}}' | sudo tee "$TMP_CONFIG" >/dev/null
  sudo chmod 644 "$TMP_CONFIG"
  sudo chown root:root "$TMP_CONFIG"
fi

sudo mv "$TMP_CONFIG" "$DOCKER_CONFIG"

log "Restarting Docker daemon..."
sudo systemctl restart docker && log "Docker daemon restarted." || { log "Failed to restart Docker daemon."; exit 1; }

log "Docker BuildKit enabled."