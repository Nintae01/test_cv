#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Déploie La Roux du Temps sur le serveur maison.
#
# À lancer depuis WSL (ou n'importe quel shell disposant de ssh) :
#   ./deploy.sh                      # copie + serveur Python sur le port 8080
#   ./deploy.sh --port 3000          # autre port
#   ./deploy.sh --nginx              # sert via nginx sur le port 80 (sudo requis)
#   ./deploy.sh --host user@ip       # autre cible
# ---------------------------------------------------------------------------
set -euo pipefail

HOST="nintae@192.168.1.17"
PORT="8080"
REMOTE_DIR="\$HOME/la_roux_du_temps"
MODE="python"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --dir)  REMOTE_DIR="$2"; shift 2 ;;
    --nginx) MODE="nginx"; PORT="80"; shift ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $1" >&2; exit 1 ;;
  esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

echo "▶ Cible      : $HOST"
echo "▶ Dossier    : $REMOTE_DIR"
echo "▶ Mode       : $MODE (port $PORT)"
echo

echo "▶ Test de connexion SSH…"
ssh -o ConnectTimeout=8 "$HOST" 'echo "   connecté à $(hostname) ($(uname -s))"'

echo "▶ Création du dossier distant…"
ssh "$HOST" "mkdir -p $REMOTE_DIR"

echo "▶ Copie des fichiers…"
if command -v rsync >/dev/null 2>&1 && ssh "$HOST" 'command -v rsync >/dev/null 2>&1'; then
  rsync -az --delete --exclude '.git' --exclude 'node_modules' ./ "$HOST:$REMOTE_DIR/"
else
  echo "   (rsync indisponible, utilisation de scp)"
  scp -rq ./index.html ./assets ./deploy ./deploy.sh ./README.md "$HOST:$REMOTE_DIR/"
fi

echo "▶ Mise en service…"
ssh "$HOST" "bash $REMOTE_DIR/deploy/serve.sh --mode $MODE --port $PORT --dir $REMOTE_DIR"

IP="${HOST#*@}"
echo
echo "✅ Déployé. La boutique est accessible sur :"
if [[ "$PORT" == "80" ]]; then echo "   http://$IP/"; else echo "   http://$IP:$PORT/"; fi
