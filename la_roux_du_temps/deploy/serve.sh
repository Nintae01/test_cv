#!/usr/bin/env bash
# Exécuté SUR le serveur par deploy.sh : met le site en ligne.
set -euo pipefail

MODE="python"; PORT="8080"; DIR="$HOME/la_roux_du_temps"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --dir)  DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done
DIR="$(cd "$DIR" && pwd)"
SERVICE="la-roux-du-temps"

has_sudo() { sudo -n true >/dev/null 2>&1; }

if [[ "$MODE" == "nginx" ]]; then
  if ! command -v nginx >/dev/null 2>&1; then
    echo "   nginx absent : installation (apt)…"
    sudo apt-get update -qq && sudo apt-get install -y -qq nginx
  fi
  CONF="/etc/nginx/sites-available/$SERVICE"
  sed "s|__ROOT__|$DIR|g; s|__PORT__|$PORT|g" "$DIR/deploy/nginx.conf.template" | sudo tee "$CONF" >/dev/null
  sudo ln -sf "$CONF" "/etc/nginx/sites-enabled/$SERVICE"
  sudo rm -f /etc/nginx/sites-enabled/default
  # nginx (www-data) doit pouvoir traverser le dossier personnel
  chmod o+x "$HOME" 2>/dev/null || true
  chmod -R o+rX "$DIR"
  sudo nginx -t
  sudo systemctl enable --now nginx
  sudo systemctl reload nginx
  echo "   nginx sert $DIR sur le port $PORT"
  exit 0
fi

# --- Mode Python (serveur statique intégré) --------------------------------
command -v python3 >/dev/null 2>&1 || { echo "python3 est requis sur le serveur" >&2; exit 1; }

if command -v systemctl >/dev/null 2>&1 && has_sudo; then
  sed "s|__ROOT__|$DIR|g; s|__PORT__|$PORT|g; s|__USER__|$USER|g" "$DIR/deploy/service.template" | sudo tee "/etc/systemd/system/$SERVICE.service" >/dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable --now "$SERVICE"
  sudo systemctl restart "$SERVICE"
  sleep 1
  sudo systemctl is-active --quiet "$SERVICE" && echo "   service systemd '$SERVICE' actif sur le port $PORT"
else
  echo "   (pas de sudo sans mot de passe : lancement en arrière-plan avec nohup)"
  PIDFILE="$DIR/.server.pid"
  if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then kill "$(cat "$PIDFILE")" || true; fi
  nohup python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DIR" >"$DIR/.server.log" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 1
  kill -0 "$(cat "$PIDFILE")" && echo "   serveur Python lancé (pid $(cat "$PIDFILE")) sur le port $PORT"
fi
