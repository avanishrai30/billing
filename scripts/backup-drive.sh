#!/bin/bash
# ==============================================================================
# AIAVRO Billing System v1 — Google Drive & Local MongoDB Automated Backups
# Retention Policy: 7 Daily Backups, 4 Weekly Backups
# Dependency: rclone configured with a remote named "gdrive"
# ==============================================================================

set -euo pipefail

# Define path configurations
BACKUP_DIR="/opt/vc-organic/backups"
DB_NAME="vc_organic"
DATE=$(date +%F)
DAY_OF_WEEK=$(date +%u) # 1-7 (Monday is 1)

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Temporary export folders
DUMP_DIR="/tmp/mongodump-$DATE"
ZIP_FILE=""

echo "[Backup] Starting nightly database dump for $DB_NAME..."

# 1. RUN MONGODUMP
mongodump --db="$DB_NAME" --out="$DUMP_DIR"

# 2. COMPRESS & EXPORT ZIP
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  # Sunday backup is promoted to a Weekly Backup
  ZIP_FILE="$BACKUP_DIR/backup-weekly-$DATE.tar.gz"
  echo "[Backup] Weekly backup identified: $ZIP_FILE"
else
  # Weekday backup is a Daily Backup
  ZIP_FILE="$BACKUP_DIR/backup-daily-$DATE.tar.gz"
  echo "[Backup] Daily backup identified: $ZIP_FILE"
fi

tar -czf "$ZIP_FILE" -C "$DUMP_DIR" .
rm -rf "$DUMP_DIR" # Clean up temp dump folder

echo "[Backup] Compressed backup created successfully: $ZIP_FILE"

# 3. UPLOAD TO GOOGLE DRIVE VIA RCLONE
# Target path in remote Google Drive (configured via 'rclone config' on KVM 2 VPS)
DRIVE_REMOTE="gdrive:vc-organic-backups"

if command -v rclone &> /dev/null; then
  echo "[Backup] Uploading backup to Google Drive remote: $DRIVE_REMOTE..."
  rclone copy "$ZIP_FILE" "$DRIVE_REMOTE"
  echo "[Backup] Upload completed."
else
  echo "[Backup] WARNING: rclone client not found. Skipping cloud upload. Set up rclone to enable Google Drive storage."
fi

# 4. ENFORCE RETENTION POLICY (7 Daily, 4 Weekly)
echo "[Backup] Cleaning up old local backups based on retention policy..."

# Count & clean local daily backups (keep last 7)
DAILY_COUNT=$(find "$BACKUP_DIR" -name "backup-daily-*" -type f | wc -l)
if [ "$DAILY_COUNT" -gt 7 ]; then
  echo "[Backup] Found $DAILY_COUNT daily backups. Deleting old entries..."
  find "$BACKUP_DIR" -name "backup-daily-*" -type f -printf '%T@ %p\n' | \
    sort -n | head -n -7 | cut -d' ' -f2- | xargs rm -f
fi

# Count & clean local weekly backups (keep last 4)
WEEKLY_COUNT=$(find "$BACKUP_DIR" -name "backup-weekly-*" -type f | wc -l)
if [ "$WEEKLY_COUNT" -gt 4 ]; then
  echo "[Backup] Found $WEEKLY_COUNT weekly backups. Deleting old entries..."
  find "$BACKUP_DIR" -name "backup-weekly-*" -type f -printf '%T@ %p\n' | \
    sort -n | head -n -4 | cut -d' ' -f2- | xargs rm -f
fi

# 5. ENFORCE REMOTE CLOUD RETENTION (if rclone is configured)
if command -v rclone &> /dev/null; then
  echo "[Backup] Enforcing retention policy on Google Drive remote..."
  # Clean remote daily backups (keep 7)
  rclone lsf --files-only --include "backup-daily-*" "$DRIVE_REMOTE" | \
    sort -r | tail -n +8 | while read -r line; do
      echo "[Backup] Deleting remote daily: $line"
      rclone deletefile "$DRIVE_REMOTE/$line"
    done

  # Clean remote weekly backups (keep 4)
  rclone lsf --files-only --include "backup-weekly-*" "$DRIVE_REMOTE" | \
    sort -r | tail -n +5 | while read -r line; do
      echo "[Backup] Deleting remote weekly: $line"
      rclone deletefile "$DRIVE_REMOTE/$line"
    done
fi

echo "[Backup] Daily automated backup cycle completed successfully."
