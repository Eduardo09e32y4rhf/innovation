# 🚀 Deploy & Infrastructure

This directory contains all deployment configurations and infrastructure-as-code files.

## Files

- **docker-compose.vps.yml** - Docker Compose configuration for VPS deployment
- **ecosystem.config.cjs** - PM2 ecosystem configuration for process management

## Usage

### Docker Deployment
```bash
docker-compose -f deploy/docker-compose.vps.yml up -d
```

### PM2 Management
```bash
pm2 start deploy/ecosystem.config.cjs --env production
```
