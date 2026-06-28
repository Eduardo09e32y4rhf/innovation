#!/bin/bash
# setup_shield.sh
# Run this on a disposable VPS to turn it into an NGINX Shield Node

echo "Installing NGINX and WireGuard..."
apt-get update
apt-get install -y nginx wireguard ufw curl

# Configure UFW
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 51820/udp
ufw --force enable

# Generate WireGuard Keys
wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey
PRIVATE_KEY=$(cat /etc/wireguard/privatekey)

echo "Please enter the Public IP of the MAIN INVISIBLE SERVER:"
read MAIN_SERVER_IP
echo "Please enter the WireGuard Public Key of the MAIN INVISIBLE SERVER:"
read MAIN_SERVER_PUBKEY

# Configure WireGuard
cat <<EOF > /etc/wireguard/wg0.conf
[Interface]
PrivateKey = $PRIVATE_KEY
Address = 10.0.0.2/32
ListenPort = 51820

[Peer]
PublicKey = $MAIN_SERVER_PUBKEY
Endpoint = $MAIN_SERVER_IP:51820
AllowedIPs = 10.0.0.1/32
PersistentKeepalive = 25
EOF

systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# Configure NGINX Reverse Proxy to the Main Server over VPN
cat <<EOF > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://10.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

systemctl restart nginx
echo "Shield Node setup complete. It is now routing traffic through the VPN."
