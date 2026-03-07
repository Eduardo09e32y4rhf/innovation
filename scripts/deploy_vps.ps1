$vpsUser = "root"
$vpsIp = "209.50.241.30"
$vpsPath = "/root/innovation.ia"

Write-Host "============================================="
Write-Host "🚀 Iniciando Deploy para o VPS ($vpsIp)..."
Write-Host "============================================="

Write-Host "📦 Compactando projeto (ignorando pastas pesadas)..."
# Usando o tar nativo do Windows 10/11 para criar um arquivo gz
tar.exe -czvf deploy.tar.gz --exclude="node_modules" --exclude=".venv" --exclude="__pycache__" --exclude=".git" --exclude=".next" --exclude="deploy.tar.gz" .

Write-Host "📤 Enviando projeto para o servidor via SCP..."
scp deploy.tar.gz ${vpsUser}@${vpsIp}:/root/deploy.tar.gz

Write-Host "⚙️ Extraindo arquivos e subindo containers no VPS..."
# Executa os comandos remotamente no VPS via SSH
ssh ${vpsUser}@${vpsIp} "mkdir -p $vpsPath && tar -xzvf /root/deploy.tar.gz -C $vpsPath && rm /root/deploy.tar.gz && cd $vpsPath && docker compose -f ops/docker-compose.yml down && docker compose -f ops/docker-compose.yml build && docker compose -f ops/docker-compose.yml up -d"

Write-Host "🧹 Limpando arquivos temporários..."
Remove-Item deploy.tar.gz

Write-Host "============================================="
Write-Host "✅ Deploy Concluído com Sucesso!"
Write-Host "============================================="
