#!/bin/bash
# setup_main_vpn.sh
# Run this on the MAIN INVISIBLE SERVER

echo "Installing WireGuard..."
apt-get update
apt-get install -y wireguard ufw

# Generate WireGuard Keys
wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey
PRIVATE_KEY=$(cat /etc/wireguard/privatekey)
PUBLIC_KEY=$(cat /etc/wireguard/publickey)

echo "Main Server WireGuard Public Key (GIVE THIS TO SHIELD NODES):"
echo $PUBLIC_KEY

cat <<EOF > /etc/wireguard/wg0.conf
[Interface]
PrivateKey = $PRIVATE_KEY
Address = 10.0.0.1/32
ListenPort = 51820

# Add peers (Shield Nodes) manually below as they are created
# [Peer]
# PublicKey = <SHIELD_PUB_KEY>
# AllowedIPs = 10.0.0.X/32
EOF

systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo "Configure UFW to block EVERYTHING except SSH and WireGuard"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 51820/udp
ufw --force enable

echo "Main Server VPN configured. Only WireGuard traffic is allowed."
