#!/usr/bin/env bash
#
# db-baseline.sh — Baseline sécurisé de la migration 0_init
#
# Marque 0_init comme "appliquée" SEULEMENT si les tables critiques
# existent déjà en base avec les bonnes colonnes.
# Sinon, propose d'exécuter le SQL de 0_init ou bloque.
#
# Usage :
#   npm run db:baseline
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Charger .env ──────────────────────────────────────────────────────────────

if [[ -z "${DATABASE_URL:-}" ]] && [[ -f "$PROJECT_DIR/.env" ]]; then
  export "$(grep -E '^DATABASE_URL=' "$PROJECT_DIR/.env" | head -1 | xargs)"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERREUR] DATABASE_URL non défini. Vérifiez votre .env" >&2
  exit 1
fi

# ── Vérifier si 0_init est déjà marquée ──────────────────────────────────────

ALREADY_APPLIED=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '0_init' AND finished_at IS NOT NULL;" \
  2>/dev/null || echo "0")

if [[ "$ALREADY_APPLIED" -gt 0 ]]; then
  echo "✓ La migration 0_init est déjà marquée comme appliquée."
  echo "  Rien à faire."
  exit 0
fi

# ── Tables et colonnes critiques attendues par 0_init ─────────────────────────

# Format : "table:colonne1,colonne2,..."
EXPECTED_TABLES=(
  "admin_users:id,email,password_hash,role,created_at"
  "users:id,email,password_hash,nom,prenom,confirmed,user_type"
  "patients:id,age,sexe"
  "praticiens:id,numero_adeli"
  "exercices:id,numero,nom,sigle,outil,axe,macro"
  "suivi_patients:id,patient_id,praticien_id"
  "prescriptions:id,suivi_patient_id"
  "page_statiques:id,nom,slug,contenu"
)

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║  Vérification baseline 0_init                  ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

ERRORS=0
MISSING_TABLES=()

for entry in "${EXPECTED_TABLES[@]}"; do
  TABLE="${entry%%:*}"
  COLUMNS_CSV="${entry#*:}"
  IFS=',' read -ra COLUMNS <<< "$COLUMNS_CSV"

  # Vérifier que la table existe
  TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$TABLE';")

  if [[ "$TABLE_EXISTS" -eq 0 ]]; then
    echo "✗ Table manquante : $TABLE"
    MISSING_TABLES+=("$TABLE")
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Vérifier les colonnes critiques
  MISSING_COLS=()
  for COL in "${COLUMNS[@]}"; do
    COL_EXISTS=$(psql "$DATABASE_URL" -tAc \
      "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$TABLE' AND column_name = '$COL';")
    if [[ "$COL_EXISTS" -eq 0 ]]; then
      MISSING_COLS+=("$COL")
    fi
  done

  if [[ ${#MISSING_COLS[@]} -gt 0 ]]; then
    echo "✗ Table $TABLE : colonnes manquantes → ${MISSING_COLS[*]}"
    ERRORS=$((ERRORS + 1))
  else
    echo "✓ Table $TABLE : OK"
  fi
done

echo ""

# ── Décision ──────────────────────────────────────────────────────────────────

if [[ $ERRORS -gt 0 ]]; then
  echo "╔═══════════════════════════════════════════════╗"
  echo "║  BASELINE BLOQUÉ — incohérences détectées     ║"
  echo "╚═══════════════════════════════════════════════╝"
  echo ""

  if [[ ${#MISSING_TABLES[@]} -eq ${#EXPECTED_TABLES[@]} ]]; then
    echo "Toutes les tables sont manquantes."
    echo "→ La DB semble vide. Utilisez plutôt :"
    echo "    npm run db:deploy"
    echo ""
    echo "  Cela exécutera 0_init + toutes les migrations suivantes."
  else
    echo "La DB a des tables mais avec une structure incompatible."
    echo "→ Le baseline ne peut pas être fait en sécurité."
    echo ""
    echo "Options :"
    echo "  1. Corriger manuellement les tables/colonnes manquantes"
    echo "  2. Repartir d'une DB vide : dropdb + createdb + npm run db:deploy"
    echo ""
    echo "Détail de ce que 0_init créerait :"
    echo "  cat prisma/migrations/0_init/migration.sql"
  fi
  echo ""
  exit 1
fi

# Tout est OK — appliquer le baseline
echo "Toutes les vérifications sont passées."
echo "→ Marquage de 0_init comme appliquée..."
echo ""

npx prisma migrate resolve --applied 0_init

echo ""
echo "✓ Baseline effectué avec succès."
echo "  Lancez ensuite : npm run db:deploy"
echo ""
