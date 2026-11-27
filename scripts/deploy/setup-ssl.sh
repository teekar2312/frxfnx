#!/bin/bash
# SSL setup dengan Let's Encrypt (certbot)
# Usage: ./scripts/deploy/setup-ssl.sh your-domain.com

set -e

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  echo "Example: $0 forex.your-domain.com"
  exit 1
fi

echo "Setting up SSL for $DOMAIN..."

# Install certbot jika belum ada
if ! command -v certbot >/dev/null; then
  echo "Installing certbot..."
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi

# Stop nginx untuk port 80
echo "Stopping nginx..."
systemctl stop nginx

# Get certificate
echo "Getting certificate..."
certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN

# Update nginx config
echo "Updating nginx config..."
sed -i "s|your-domain.com|$DOMAIN|g" /etc/nginx/conf.d/finex-forex.conf

# Auto-renew setup
echo "Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# Start nginx
systemctl start nginx
echo "SSL setup complete for $DOMAIN"
echo "Certificate: /etc/letsencrypt/live/$DOMAIN/"
echo "Auto-renewal: cron job added"
