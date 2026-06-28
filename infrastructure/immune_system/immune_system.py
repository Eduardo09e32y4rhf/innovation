import time
import re
import subprocess
from collections import defaultdict

# Simple Heuristic Immune System (IDS/IPS)
# Watches NGINX logs and bans IPs using iptables if they act maliciously

LOG_FILE = '/var/log/nginx/access.log'
BAN_THRESHOLD = 50 # requests per minute
TIME_WINDOW = 60 # seconds

ip_requests = defaultdict(list)
banned_ips = set()

def ban_ip(ip):
    if ip in banned_ips:
        return
    print(f"[IMMUNE SYSTEM] Banning Malicious IP: {ip}")
    # Propagate ban to local iptables (Shield Node)
    subprocess.run(['iptables', '-A', 'INPUT', '-s', ip, '-j', 'DROP'])
    banned_ips.add(ip)
    
    # In a real cluster, this would broadcast the banned IP to all other Shield Nodes via Redis Pub/Sub
    # so they can all inject the iptables rule simultaneously ("vaccine propagation").

def analyze_traffic():
    print(f"Immune System started. Watching {LOG_FILE}...")
    
    try:
        with open(LOG_FILE, 'r') as f:
            # Go to the end of the file
            f.seek(0, 2)
            
            while True:
                line = f.readline()
                if not line:
                    time.sleep(0.5)
                    continue
                
                # Simple NGINX log parsing
                # Example: 192.168.1.1 - - [28/Jun/2026:12:00:00 +0000] "GET / HTTP/1.1" 200
                match = re.search(r'^(\d+\.\d+\.\d+\.\d+)', line)
                if match:
                    ip = match.group(1)
                    now = time.time()
                    
                    ip_requests[ip].append(now)
                    
                    # Clean up old requests outside the time window
                    ip_requests[ip] = [t for t in ip_requests[ip] if now - t < TIME_WINDOW]
                    
                    # Check threshold
                    if len(ip_requests[ip]) > BAN_THRESHOLD:
                        ban_ip(ip)

    except FileNotFoundError:
        print(f"Log file {LOG_FILE} not found. Waiting...")
        time.sleep(5)
        analyze_traffic()

if __name__ == "__main__":
    # Must be run as root to use iptables
    analyze_traffic()
