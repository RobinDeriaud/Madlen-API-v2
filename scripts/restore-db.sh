#!/usr/bin/env bash
#
# restore-db.sh — Restaurer un backup PostgreSQL
#
# Usage :
#   ./scripts/restore-db.sh                           # Restaure le dernier backup
#   ./scripts/restore-db.sh /chemin/vers/backup.dump  # Restaure un backup spécifique
#   ./scripts/restore-db.sh backup.dump --table=users  # Restaure une seule table
#
# Variables d'environnement :
#   BACKUP_DIR    — Dossier des backups (défaut: /var/backups/madlen)
#   DATABASE_URL  — URL de connexion PostgreSQL (lu depuis .env si absent)
#

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Charger .env si DATABASE_URL n'est pas déjà défini
if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$PROJECT_DIR/.env" ]]; then
  export "$(grep -E '^DATABASE_URL=' "$PROJECT_DIR/.env" | head -1 | xargs)"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERREUR] DATABASE_URL non défini. Vérifiez votre .env" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/madlen}"

# ── Parse arguments ────────────────────────────────────────────────────────────

DUMP_FILE=""
TABLE_OPT=""

for arg in "$@"; do
  case "$arg" in
    --table=*)
      TABLE_OPT="${arg#--table=}"
      ;;
    *)
      DUMP_FILE="$arg"
      ;;
  esac
done

# ── Trouver le fichier de backup ───────────────────────────────────────────────

if [[ -z "$DUMP_FILE" ]]; then
  # Pas de fichier spécifié → lister les backups disponibles et prendre le plus récent
  if [[ ! -d "$BACKUP_DIR" ]]; then
    echo "[ERREUR] Dossier de backup introuvable : $BACKUP_DIR" >&2
    exit 1
  fi

  echo ""
  echo "Backups disponibles dans $BACKUP_DIR :"
  echo "────────────────────────────────────────"

  BACKUP_LIST=$(find "$BACKUP_DIR" -name "*.dump" -type f | sort -r)
  if [[ -z "$BACKUP_LIST" ]]; then
    echo "  (aucun backup trouvé)"
    exit 1
  fi

  INDEX=0
  while IFS= read -r file; do
    SIZE=$(du -h "$file" | cut -f1)
    BASENAME=$(basename "$file")
    INDEX=$((INDEX + 1))
    if [[ $INDEX -eq 1 ]]; then
      echo "  → $BASENAME  ($SIZE)  ← le plus récent"
    else
      echo "    $BASENAME  ($SIZE)"
    fi
  done <<< "$BACKUP_LIST"

  echo ""

  # Prendre le plus récent
  DUMP_FILE=$(echo "$BACKUP_LIST" | head -1)
  echo "Backup sélectionné : $(basename "$DUMP_FILE")"
elif [[ ! "$DUMP_FILE" = /* ]]; then
  # Chemin relatif → chercher dans BACKUP_DIR
  if [[ -f "$BACKUP_DIR/$DUMP_FILE" ]]; then
    DUMP_FILE="$BACKUP_DIR/$DUMP_FILE"
  fi
fi

# Vérifier que le fichier existe
if [[ ! -f "$DUMP_FILE" ]]; then
  echo "[ERREUR] Fichier introuvable : $DUMP_FILE" >&2
  exit 1
fi

# ── Afficher les détails ───────────────────────────────────────────────────────

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
DUMP_NAME=$(basename "$DUMP_FILE")

echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  RESTAURATION DE BACKUP PostgreSQL           │"
echo "├─────────────────────────────────────────────┤"
echo "│  Fichier : $DUMP_NAME"
echo "│  Taille  : $DUMP_SIZE"
if [[ -n "$TABLE_OPT" ]]; then
echo "│  Table   : $TABLE_OPT (restauration partielle)"
else
echo "│  Mode    : restauration complète"
fi
echo "│  DB      : $(echo "$DATABASE_URL" | sed 's|://[^@]*@|://***@|')"
echo "└─────────────────────────────────────────────┘"
echo ""
echo "⚠  Cette opération va écraser les données actuelles !"
echo ""
read -r -p "Continuer ? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Annulé."
  exit 0
fi

# ── Backup de sécurité avant restauration ──────────────────────────────────────

SAFETY_FILE="${BACKUP_DIR}/safety_before-restore_$(date +%Y-%m-%d_%H-%M).dump"
echo ""
echo "[1/2] Backup de sécurité de l'état actuel..."
mkdir -p "$BACKUP_DIR"
if pg_dump -Fc -d "$DATABASE_URL" -f "$SAFETY_FILE"; then
  SAFETY_SIZE=$(du -h "$SAFETY_FILE" | cut -f1)
  echo "      → $SAFETY_FILE ($SAFETY_SIZE)"
  echo "      (si besoin d'annuler : ./scripts/restore-db.sh $SAFETY_FILE)"
else
  echo "      ATTENTION : impossible de créer le backup de sécurité"
  read -r -p "      Continuer sans filet ? [y/N] " CONFIRM2
  if [[ "$CONFIRM2" != "y" && "$CONFIRM2" != "Y" ]]; then
    echo "Annulé."
    exit 0
  fi
fi

# ── Restauration ───────────────────────────────────────────────────────────────

echo ""
echo "[2/2] Restauration en cours..."

RESTORE_ARGS=(--clean --if-exists -d "$DATABASE_URL")

if [[ -n "$TABLE_OPT" ]]; then
  RESTORE_ARGS+=(-t "$TABLE_OPT")
fi

if pg_restore "${RESTORE_ARGS[@]}" "$DUMP_FILE"; then
  echo ""
  echo "Restauration réussie !"
  echo ""
  echo "Pensez à vérifier vos données :"
  echo "  npm run db:studio    # Interface visuelle"
else
  echo ""
  echo "ATTENTION : pg_restore a signalé des erreurs (certaines sont normales,"
  echo "comme des DROP sur des objets inexistants). Vérifiez vos données."
  echo ""
  echo "Pour annuler : ./scripts/restore-db.sh $SAFETY_FILE"
fi
