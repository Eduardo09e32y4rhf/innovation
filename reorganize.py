"""
Script para reorganizar a estrutura do projeto para deploy no Vercel
"""
import os
import shutil
from pathlib import Path

# Diretório raiz do projeto
ROOT = Path(__file__).parent

print("🔄 Iniciando reorganização do projeto...")

# 1. Renomear innovation/ para backend/
if (ROOT / "innovation").exists() and not (ROOT / "backend").exists():
    print("📁 Renomeando innovation/ → backend/...")
    shutil.move(str(ROOT / "innovation"), str(ROOT / "backend"))
    print("✅ innovation/ renomeado para backend/")
elif (ROOT / "backend").exists():
    print("ℹ️  backend/ já existe")
else:
    print("⚠️  Pasta innovation/ não encontrada")

# 2. Criar pasta scripts/ se não existir
scripts_dir = ROOT / "scripts"
if not scripts_dir.exists():
    print("📁 Criando pasta scripts/...")
    scripts_dir.mkdir()
    (scripts_dir / "setup").mkdir()
    (scripts_dir / "tools").mkdir()
    print("✅ Pasta scripts/ criada")

# 3. Mover scripts para scripts/setup/
setup_scripts = ["create_admin.py", "create_test_user.py", "init_db.py"]
for script in setup_scripts:
    src = ROOT / script
    if src.exists():
        dest = scripts_dir / "setup" / script
        print(f"📦 Movendo {script} → scripts/setup/...")
        shutil.move(str(src), str(dest))
        print(f"✅ {script} movido")

# 4. Mover tools/ para scripts/tools/ se existir
if (ROOT / "tools").exists():
    print("📦 Movendo tools/ → scripts/tools/...")
    for item in (ROOT / "tools").iterdir():
        dest = scripts_dir / "tools" / item.name
        shutil.move(str(item), str(dest))
    (ROOT / "tools").rmdir()
    print("✅ tools/ movido")

# 5. Remover innovation.db da raiz se existir
root_db = ROOT / "innovation.db"
if root_db.exists():
    print("🗑️  Removendo innovation.db da raiz...")
    root_db.unlink()
    print("✅ innovation.db removido")

# 6. Remover lib/ da raiz se existir
lib_dir = ROOT / "lib"
if lib_dir.exists():
    print("🗑️  Removendo pasta lib/ da raiz...")
    shutil.rmtree(str(lib_dir))
    print("✅ lib/ removido")

print("\n✅ Reorganização concluída!")
print("\n📋 Próximos passos:")
print("1. Atualizar vercel.json")
print("2. Atualizar render.yaml")
print("3. Atualizar Dockerfile")
print("4. Testar o backend: cd backend && uvicorn app.main:app --reload")
