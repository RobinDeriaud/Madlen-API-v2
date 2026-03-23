#!/usr/bin/env bash
#
# backup-db.sh — Backup PostgreSQL + rotation + sync off-site (optionnel)
#
# Usage :
#   ./scripts/backup-db.sh              # Backup avec rotation
#   ./scripts/backup-db.sh --no-rotate  # Backup sans rotation (utile pour tests)
#
# Variables d'environnement (optionnelles, valeurs par défaut) :
#   BACKUP_DIR      — Dossier de stockage (défaut: /var/backups/madlen)
#   BACKUP_REMOTE   — Remote rclone pour sync off-site (ex: ovh-s3:madlen-backups)
#   DATABASE_URL    — URL de connexion PostgreSQL (lu depuis .env si absent)
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
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
DUMP_FILE="madlen_${TIMESTAMP}.dump"
DUMP_PATH="${BACKUP_DIR}/${DUMP_FILE}"

# Rétention
RETENTION_DAYS=7
RETENTION_WEEKS=4    # Garde 1 backup/semaine (lundi) pour 4 semaines
RETENTION_MONTHS=3   # Garde 1 backup/mois (1er du mois) pour 3 mois

# ── Fonctions ──────────────────────────────────────────────────────────────────

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ── Créer le dossier de backup ─────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

# ── Backup ─────────────────────────────────────────────────────────────────────

log "Début du backup → $DUMP_PATH"

if ! pg_dump -Fc -d "$DATABASE_URL" -f "$DUMP_PATH"; then
  log "ERREUR : pg_dump a échoué"
  rm -f "$DUMP_PATH"
  exit 1
fi

# Vérifier que le fichier n'est pas vide
DUMP_SIZE=$(stat -c%s "$DUMP_PATH" 2>/dev/null || stat -f%z "$DUMP_PATH" 2>/dev/null)
if [[ "$DUMP_SIZE" -eq 0 ]]; then
  log "ERREUR : le dump est vide (0 bytes)"
  rm -f "$DUMP_PATH"
  exit 1
fi

DUMP_SIZE_HUMAN=$(numfmt --to=iec "$DUMP_SIZE" 2>/dev/null || echo "${DUMP_SIZE} bytes")
log "Backup réussi : $DUMP_FILE ($DUMP_SIZE_HUMAN)"

# ── Rotation ───────────────────────────────────────────────────────────────────

if [[ "${1:-}" != "--no-rotate" ]]; then
  log "Rotation des anciens backups..."

  NOW_EPOCH=$(date +%s)

  for file in "$BACKUP_DIR"/madlen_*.dump; do
    [[ -f "$file" ]] || continue
    [[ "$file" == "$DUMP_PATH" ]] && continue  # Ne pas toucher au backup qu'on vient de créer

    # Extraire la date du nom de fichier (madlen_YYYY-MM-DD_HH-MM.dump)
    BASENAME=$(basename "$file")
    FILE_DATE=$(echo "$BASENAME" | sed -n 's/madlen_\([0-9-]*\)_[0-9-]*.dump/\1/p')
    if [[ -z "$FILE_DATE" ]]; then
      continue  # Nom de fichier non reconnu, on ne touche pas
    fi

    FILE_EPOCH=$(date -d "$FILE_DATE" +%s 2>/dev/null || date -jf "%Y-%m-%d" "$FILE_DATE" +%s 2>/dev/null || echo 0)
    if [[ "$FILE_EPOCH" -eq 0 ]]; then
      continue
    fi

    AGE_DAYS=$(( (NOW_EPOCH - FILE_EPOCH) / 86400 ))

    KEEP=false

    if [[ $AGE_DAYS -le $RETENTION_DAYS ]]; then
      # < 7 jours : tout garder
      KEEP=true
    elif [[ $AGE_DAYS -le $((RETENTION_WEEKS * 7)) ]]; then
      # 8-28 jours : garder le lundi (day_of_week=1)
      DAY_OF_WEEK=$(date -d "$FILE_DATE" +%u 2>/dev/null || date -jf "%Y-%m-%d" "$FILE_DATE" +%u 2>/dev/null)
      if [[ "$DAY_OF_WEEK" == "1" ]]; then
        KEEP=true
      fi
    elif [[ $AGE_DAYS -le $((RETENTION_MONTHS * 30)) ]]; then
      # 29-90 jours : garder le 1er du mois
      DAY_OF_MONTH=$(date -d "$FILE_DATE" +%d 2>/dev/null || date -jf "%Y-%m-%d" "$FILE_DATE" +%d 2>/dev/null)
      if [[ "$DAY_OF_MONTH" == "01" ]]; then
        KEEP=true
      fi
    fi

    if [[ "$KEEP" == false ]]; then
      log "  Suppression : $BASENAME (${AGE_DAYS}j)"
      rm -f "$file"
    fi
  done

  log "Rotation terminée"
fi

# ── Sync off-site ──────────────────────────────────────────────────────────────

if [[ -n "$BACKUP_REMOTE" ]]; then
  if command -v rclone &>/dev/null; then
    log "Sync off-site → $BACKUP_REMOTE"
    if rclone sync "$BACKUP_DIR" "$BACKUP_REMOTE" --include "madlen_*.dump" --include "pre-migration_*.dump"; then
      log "Sync off-site réussi"
    else
      log "ATTENTION : sync off-site échoué (le backup local est OK)"
    fi
  else
    log "ATTENTION : rclone non installé, sync off-site ignoré"
  fi
fi

# ── Résumé ─────────────────────────────────────────────────────────────────────

BACKUP_COUNT=$(find "$BACKUP_DIR" -name "madlen_*.dump" -o -name "pre-migration_*.dump" | wc -l)
BACKUP_TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "Terminé. $BACKUP_COUNT backups dans $BACKUP_DIR ($BACKUP_TOTAL_SIZE)"
