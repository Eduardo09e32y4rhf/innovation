"""
Script de diagnóstico do banco de dados
Verifica se os dados estão sendo salvos corretamente
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.job import Job
from app.models.application import Application

def check_database():
    db = SessionLocal()
    
    try:
        print("=" * 70)
        print("🔍 DIAGNÓSTICO DO BANCO DE DADOS")
        print("=" * 70)
        
        # Verificar usuários
        users = db.query(User).all()
        print(f"\n👥 USUÁRIOS: {len(users)}")
        for user in users:
            print(f"   - {user.email} ({user.role})")
        
        # Verificar vagas
        jobs = db.query(Job).all()
        print(f"\n💼 VAGAS: {len(jobs)}")
        for job in jobs:
            print(f"   - {job.title} ({job.status}) - Empresa ID: {job.company_id}")
        
        # Verificar candidaturas
        applications = db.query(Application).all()
        print(f"\n📝 CANDIDATURAS: {len(applications)}")
        for app in applications:
            print(f"   - Vaga ID: {app.job_id}, Candidato ID: {app.candidate_id}")
        
        print("\n" + "=" * 70)
        print("✅ DIAGNÓSTICO CONCLUÍDO")
        print("=" * 70)
        
        if len(users) == 0:
            print("\n⚠️  ATENÇÃO: Nenhum usuário encontrado!")
            print("Execute: python create_admin.py")
        
        if len(jobs) == 0:
            print("\n⚠️  ATENÇÃO: Nenhuma vaga encontrada!")
            print("Crie vagas pela interface após fazer login")
        
    except Exception as e:
        print(f"\n❌ ERRO: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_database()
