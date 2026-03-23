# Backup PostgreSQL — Guide d'installation VPS

## Prérequis

- PostgreSQL installé sur le VPS (pg_dump et pg_restore disponibles)
- `DATABASE_URL` défini dans `.env`

Vérifier :
```bash
pg_dump --version
pg_restore --version
```

---

## 1. Préparer le dossier de backup

```bash
sudo mkdir -p /var/backups/madlen
sudo chown $(whoami):$(whoami) /var/backups/madlen
```

## 2. Rendre les scripts exécutables

```bash
chmod +x scripts/backup-db.sh scripts/restore-db.sh scripts/pre-deploy-backup.sh
```

## 3. Tester manuellement

```bash
# Lancer un backup
npm run db:backup

# Vérifier le résultat
ls -la /var/backups/madlen/
```

## 4. Installer le cron job (backup quotidien)

```bash
crontab -e
```

Ajouter cette ligne :
```cron
# Backup PostgreSQL Madlen — tous les jours à 3h du matin
0 3 * * * cd /home/madlen/Madlen-API-v2 && bash scripts/backup-db.sh >> /var/log/madlen-backup.log 2>&1
```

> Adapter `/home/madlen/Madlen-API-v2` au chemin réel du projet sur le VPS.

Vérifier que le cron est actif :
```bash
crontab -l
```

## 5. (Optionnel) Sync off-site — OVH Object Storage

### 5.1 Créer le bucket OVH

1. Espace client OVH → Public Cloud → Object Storage
2. Créer un conteneur : nom `madlen-backups`, région `GRA` ou `SBG`, type **Standard S3**, visibilité **Privé**
3. Créer un utilisateur S3 (rôle `ObjectStore Operator`) → noter Access Key + Secret Key

### 5.2 Installer rclone sur le VPS

```bash
sudo apt install rclone
# ou
curl https://rclone.org/install.sh | sudo bash
```

### 5.3 Configurer rclone

```bash
rclone config
```

Répondre :
- Name: `ovh-s3`
- Type: `s3`
- Provider: `Other`
- Access Key ID: `(coller)`
- Secret Access Key: `(coller)`
- Endpoint: `s3.gra.io.cloud.ovh.net` (adapter selon la région)
- Laisser le reste par défaut

Tester :
```bash
rclone ls ovh-s3:madlen-backups/
```

### 5.4 Activer la sync

Ajouter dans `.env` sur le VPS :
```env
BACKUP_REMOTE=ovh-s3:madlen-backups
```

Le script `backup-db.sh` détectera automatiquement cette variable et synchronisera après chaque backup.

---

## Commandes de référence

| Commande | Description |
|---|---|
| `npm run db:backup` | Backup manuel avec rotation |
| `npm run db:restore` | Restaurer le dernier backup (interactif) |
| `npm run db:deploy` | Backup auto + migration Prisma |
| `npm run db:deploy:skip-backup` | Migration sans backup (urgence) |

## Restauration manuelle

```bash
# Lister les backups
ls -la /var/backups/madlen/

# Restaurer le plus récent
./scripts/restore-db.sh

# Restaurer un backup spécifique
./scripts/restore-db.sh /var/backups/madlen/madlen_2026-03-23_03-00.dump

# Restaurer une seule table
./scripts/restore-db.sh /var/backups/madlen/madlen_2026-03-23_03-00.dump --table=up_users
```

## Disaster recovery (VPS perdu)

1. Commander un nouveau VPS OVH
2. Installer PostgreSQL, Node.js, PM2
3. `git clone` du repo + `npm install`
4. Récupérer le dernier backup :
   ```bash
   rclone copy ovh-s3:madlen-backups/ /var/backups/madlen/ --include "madlen_*.dump"
   ```
5. Créer la DB et restaurer :
   ```bash
   sudo -u postgres createdb madlen_db
   sudo -u postgres createuser madlen
   ./scripts/restore-db.sh
   ```
6. Configurer `.env`, lancer PM2

## Vérifier les logs de backup

```bash
# Dernières lignes du log
tail -20 /var/log/madlen-backup.log

# Vérifier que le dernier backup est récent
ls -lt /var/backups/madlen/ | head -5
```
