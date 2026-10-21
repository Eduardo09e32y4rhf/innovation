# Deploy Kubernetes Infrastructure
Write-Host "🚀 Launching Innovation.ia Enterprise Infrastructure..." -ForegroundColor Cyan

# 1. Apply Namespace
Write-Host "Creating Namespace..." -ForegroundColor Yellow
kubectl apply -f k8s/namespace.yaml

# 2. Apply All Manifests
Write-Host "Deploying Services..." -ForegroundColor Yellow
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# 3. Check Status
Write-Host "Verifying Deployment Status..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
kubectl get pods -n innovation-enterprise
kubectl get services -n innovation-enterprise
kubectl get ingress -n innovation-enterprise

Write-Host "✅ Infrastructure Deployed Successfully!" -ForegroundColor Green
