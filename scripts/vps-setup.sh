#!/bin/bash
# ==============================================================================
# AIAVRO Billing System v1 — KVM 2 VPS Automated Provisioning Script
# Operating System Target: Ubuntu 22.04 LTS / 24.04 LTS (x86_64)
# ==============================================================================

set -euo pipefail

# Style colors for output status
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==> Starting automated server configuration...${NC}"

# Ensure script is running with root permissions
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please execute this setup script as root user (sudo).${NC}"
  exit 1
fi

# Define path configurations
ROOT_PATH="/opt/vc-organic"
BACKEND_PATH="$ROOT_PATH/backend"
UPLOADS_PATH="$ROOT_PATH/uploads"
PRODUCTS_PATH="$UPLOADS_PATH/products"
BACKUPS_PATH="$ROOT_PATH/backups"
LOGS_PATH="$ROOT_PATH/logs"
SCRIPTS_PATH="$ROOT_PATH/scripts"

# 1. CREATE SYSTEM DIRECTORY STRUCTURE
echo -e "${GREEN}==> Step 1: Generating application directory directories under $ROOT_PATH...${NC}"
mkdir -p "$BACKEND_PATH"
mkdir -p "$PRODUCTS_PATH"
mkdir -p "$BACKUPS_PATH"
mkdir -p "$LOGS_PATH"
mkdir -p "$SCRIPTS_PATH"
chmod -R 755 "$ROOT_PATH"
echo "Directory architecture successfully generated."

# 2. SYSTEM PACKAGE UPDATE
echo -e "${GREEN}==> Step 2: Running package list updates...${NC}"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl gnupg build-essential git unzip tar snapd

# 3. SELF-HOSTED MONGODB INSTALLATION
echo -e "${GREEN}==> Step 3: Installing MongoDB Community Edition...${NC}"
# Import public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg --o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor --yes
# Create source list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/7.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list
# Update and install
apt-get update -y
apt-get install -y mongodb-org
# Start and enable MongoDB daemon
systemctl daemon-reload
systemctl enable mongod
systemctl start mongod
echo -e "${GREEN}MongoDB successfully installed, started, and set to auto-start on boot.${NC}"

# 4. NODE.JS RUNTIME INSTALLATION (LTS Version 20.x)
echo -e "${GREEN}==> Step 4: Installing Node.js LTS runtime...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo -e "${GREEN}Node.js Version $(node -v) / NPM Version $(npm -v) installed.${NC}"

# 5. PM2 PROCESS MANAGER INSTALLATION
echo -e "${GREEN}==> Step 5: Configuring PM2 process manager globally...${NC}"
npm install -g pm2
echo "PM2 process manager installed."

# 6. NGINX REVERSE PROXY SETUP
echo -e "${GREEN}==> Step 6: Setting up Nginx Web Server...${NC}"
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# Generate Nginx reverse proxy virtual host file
CONF_FILE="/etc/nginx/sites-available/api.vcorganics.com"
echo "Configuring Nginx virtual host for api.vcorganics.com at $CONF_FILE..."

cat << 'EOF' > "$CONF_FILE"
server {
    listen 80;
    server_name api.vcorganics.com;

    # Maximum payload limit for base64 product image uploads
    client_max_body_size 12M;

    # Backend API requests proxy
    location / {
        proxy_pass http://127.0.0.1:8181;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Assets serving directly by Nginx (optimized image caching)
    location /uploads/ {
        alias /opt/vc-organic/uploads/;
        expires 365d;
        add_header Cache-Control "public, no-transform, max-age=31536000";
        access_log off;
    }

    # Logging directories
    access_log /opt/vc-organic/logs/nginx_access.log;
    error_log /opt/vc-organic/logs/nginx_error.log;
}
EOF

# Enable the Nginx configuration and test syntax
ln -sf "$CONF_FILE" "/etc/nginx/sites-enabled/"
rm -f /etc/nginx/sites-enabled/default || true
nginx -t
systemctl restart nginx
echo -e "${GREEN}Nginx reverse proxy configured successfully.${NC}"

# 7. SSL CERTIFICATE GENERATOR (Certbot Let's Encrypt)
echo -e "${GREEN}==> Step 7: Configuring Certbot SSL setup...${NC}"
apt-get install -y certbot python3-certbot-nginx
echo -e "${GREEN}Certbot installed. To register SSL certificates for api.vcorganics.com, execute:${NC}"
echo -e "  sudo certbot --nginx -d api.vcorganics.com --non-interactive --agree-tos -m support@vcorganics.com"

# 8. FINALIZE CONFIGURATION & PERMISSIONS
# Create empty log files for Nginx logs redirection
touch /opt/vc-organic/logs/nginx_access.log
touch /opt/vc-organic/logs/nginx_error.log
chmod -R 777 "$LOGS_PATH"

echo -e "${GREEN}========================================================================${NC}"
echo -e "${GREEN}  PROVISIONING SYSTEM DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}  Target Port: 8181 -> Server reverse proxy to port 80/443 Nginx.${NC}"
echo -e "${GREEN}  MongoDB Default Host: localhost:27017${NC}"
echo -e "${GREEN}  Uploads Path: $PRODUCTS_PATH${NC}"
echo -e "${GREEN}========================================================================${NC}"
