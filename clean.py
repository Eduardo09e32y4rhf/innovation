import os
import shutil
from pathlib import Path

def cleanup():
    print("--- Iniciando limpeza do Innovation.ia ---")
    root = Path.cwd()
    
    # 1. Pastas duplicadas ou experimentais
    folders_to_consider = ["services", "gateway", "ai_engine", "ops"]
    for folder in folders_to_consider:
        p = root / folder
        if p.exists():
            print(f"[?] Sugestao: A pasta '{folder}' parece redundante se voce usar o Monolito.")

    # 2. Arquivos de cache e temporários
    print("--- Removendo caches de Python ---")
    for p in root.rglob("__pycache__"):
        shutil.rmtree(p)
    for p in root.rglob("*.pyc"):
        os.remove(p)
    
    # 3. Bancos de dados duplicados
    dbs = list(root.rglob("*.db"))
    if len(dbs) > 1:
        print(f"[!] Encontrados {len(dbs)} arquivos .db. O sistema deve usar apenas um.")
        for db in dbs:
            print(f"   - {db.relative_to(root)}")

    # 4. Logs
    logs = list(root.rglob("*.log"))
    for log in logs:
        print(f"--- Limpando log: {log.name}")
        with open(log, 'w') as f:
            f.write("")

    print("\n[OK] Limpeza basica concluida.")
    print("DICA: Para liberar espaco no DISCO do VPS, execute: docker system prune -a")

if __name__ == "__main__":
    cleanup()
