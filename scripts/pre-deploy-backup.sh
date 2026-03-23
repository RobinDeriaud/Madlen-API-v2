#!/usr/bin/env bash
#
# pre-deploy-backup.sh — Backup automatique avant une migration Prisma
#
# Crée un backup tagué "pre-migration" avant d'appliquer les migrations.
# Si le backup échoue, la migration est bloquée (exit 1).
#
# Usage :
#   ./scripts/pre-deploy-backup.sh       # Appelé automatiquement par npm run db:deploy
#
# Garde les 10 derniers backups pré-migration.
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
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
DUMP_FILE="pre-migration_${TIMESTAMP}.dump"
DUMP_PATH="${BACKUP_DIR}/${DUMP_FILE}"
MAX_PRE_MIGRATION_BACKUPS=10

# ── Backup ─────────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║  Backup pré-migration                         ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

echo "Création du backup avant migration..."

if ! pg_dump -Fc -d "$DATABASE_URL" -f "$DUMP_PATH"; then
  echo ""
  echo "[ERREUR] Backup pré-migration échoué !"
  echo "         La migration est BLOQUÉE pour protéger vos données."
  echo "         Vérifiez la connexion à la base de données."
  rm -f "$DUMP_PATH"
  exit 1
fi

# Vérifier que le fichier n'est pas vide
DUMP_SIZE=$(stat -c%s "$DUMP_PATH" 2>/dev/null || stat -f%z "$DUMP_PATH" 2>/dev/null)
if [[ "$DUMP_SIZE" -eq 0 ]]; then
  echo "[ERREUR] Le backup est vide. Migration bloquée."
  rm -f "$DUMP_PATH"
  exit 1
fi

DUMP_SIZE_HUMAN=$(numfmt --to=iec "$DUMP_SIZE" 2>/dev/null || echo "${DUMP_SIZE} bytes")
echo "→ Backup créé : $DUMP_FILE ($DUMP_SIZE_HUMAN)"
echo ""
echo "Si la migration échoue, restaurez avec :"
echo "  ./scripts/restore-db.sh $DUMP_PATH"
echo ""

# ── Nettoyage des anciens backups pré-migration ───────────────────────────────

PRE_MIGRATION_FILES=$(find "$BACKUP_DIR" -name "pre-migration_*.dump" -type f | sort -r)
COUNT=0
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  COUNT=$((COUNT + 1))
  if [[ $COUNT -gt $MAX_PRE_MIGRATION_BACKUPS ]]; then
    echo "Nettoyage : suppression de $(basename "$file")"
    rm -f "$file"
  fi
done <<< "$PRE_MIGRATION_FILES"

echo "Migration autorisée. Lancement de Prisma..."
echo ""
