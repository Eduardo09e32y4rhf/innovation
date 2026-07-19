# Sistema Imunológico (IDS/IPS)

Este é o cérebro da segurança descentralizada. Ele deve rodar em cada "Nó Escudo" (Proxy) para monitorar o tráfego de rede (NGINX) e banir atacantes automaticamente.

## Como rodar

```bash
sudo python3 immune_system.py
```

## Como Funciona
1. Lê continuamente o log de acesso do NGINX.
2. Identifica padrões (heurísticas simples como requisições excessivas num intervalo de tempo).
3. Utiliza o `iptables` do Linux para banir o IP atacante instantaneamente.
4. *Futuro (Machine Learning)*: Será integrado um modelo `Isolation Forest` (`scikit-learn`) para detectar anomalias complexas em vez de um simples rate limit.
