from sqlalchemy.orm import Session
from .database import SessionLocal
from domain.models.user import User
from domain.models.job import Job
from domain.models.application import Application
from core.security import get_password_hash
from datetime import datetime, timedelta
import random

def create_seed_data():
    """Criar dados de exemplo para desenvolvimento"""
    db = SessionLocal()
    
    try:
        # Limpar dados existentes (cuidado em produção!)
        db.query(Application).delete()
        db.query(Job).delete()
        db.query(User).filter(User.email.like('%@test.com')).delete()
        db.commit()
        
        print("Dados antigos removidos")
        
        # CRIAR EMPRESAS
        companies = []
        company_names = [
            "TechCorp Brasil",
            "Startup Inovadora",
            "Consultoria Digital",
            "Fintech Solutions"
        ]
        
        for idx, name in enumerate(company_names):
            company = User(
                email=f"empresa{idx+1}@test.com",
                hashed_password=get_password_hash("senha123"),
                full_name=name,
                role="company",
                is_active=True,
                two_factor_enabled=False
            )
            db.add(company)
            companies.append(company)
        
        db.commit()
        print(f"OK: {len(companies)} empresas criadas")
        
        # CRIAR VAGAS
        jobs = []
        job_templates = [
            {
                "title": "Desenvolvedor Python Sênior",
                "description": "Buscamos desenvolvedor Python experiente para atuar com FastAPI, Django e SQLAlchemy. Trabalho remoto.",
                "requirements": "5+ anos Python, FastAPI, PostgreSQL, Git, inglês intermediário",
                "salary": "R$ 12.000 - R$ 18.000",
                "location": "Remoto",
                "type": "remoto"
            },
            {
                "title": "Designer UX/UI Pleno",
                "description": "Designer para criar interfaces modernas e intuitivas. Figma e experiência com design systems.",
                "requirements": "3+ anos UX/UI, Figma, design thinking, portfolio",
                "salary": "R$ 7.000 - R$ 10.000",
                "location": "São Paulo, SP",
                "type": "híbrido"
            },
            {
                "title": "Engenheiro de Dados",
                "description": "Construir e manter pipelines de dados, data warehouse e ETL processes.",
                "requirements": "Python, SQL, Airflow, Spark, AWS/GCP",
                "salary": "R$ 15.000 - R$ 22.000",
                "location": "Remoto",
                "type": "remoto"
            },
            {
                "title": "Product Manager",
                "description": "Liderar desenvolvimento de produtos digitais, roadmap e métricas.",
                "requirements": "5+ anos produto digital, analytics, stakeholder management",
                "salary": "R$ 18.000 - R$ 25.000",
                "location": "São Paulo, SP",
                "type": "presencial"
            },
            {
                "title": "Desenvolvedor React Native",
                "description": "Criar apps mobile incríveis com React Native.",
                "requirements": "React Native, TypeScript, Redux, APIs REST",
                "salary": "R$ 8.000 - R$ 12.000",
                "location": "Remoto",
                "type": "remoto"
            },
            {
                "title": "DevOps Engineer",
                "description": "Gerenciar infraestrutura cloud, CI/CD e monitoramento.",
                "requirements": "Docker, Kubernetes, AWS, Terraform, Jenkins",
                "salary": "R$ 14.000 - R$ 20.000",
                "location": "Remoto",
                "type": "remoto"
            }
        ]
        
        for template in job_templates:
            for company in companies[:3]:  # Cada empresa tem algumas vagas
                job = Job(
                    **template,
                    company_id=company.id,
                    status="active",
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
                )
                db.add(job)
                jobs.append(job)
        
        db.commit()
        print(f"OK: {len(jobs)} vagas criadas")
        
        # CRIAR CANDIDATOS
        candidates = []
        candidate_names = [
            "João Silva",
            "Maria Santos",
            "Carlos Pereira",
            "Ana Costa",
            "Pedro Oliveira",
            "Julia Almeida",
            "Rafael Souza",
            "Beatriz Lima",
            "Lucas Ferreira",
            "Camila Rodrigues"
        ]
        
        for idx, name in enumerate(candidate_names):
            candidate = User(
                email=f"candidato{idx+1}@test.com",
                hashed_password=get_password_hash("senha123"),
                full_name=name,
                role="candidate",
                is_active=True,
                two_factor_enabled=False
            )
            db.add(candidate)
            candidates.append(candidate)
        
        db.commit()
        print(f"OK: {len(candidates)} candidatos criados")
        
        # CRIAR CANDIDATURAS
        statuses = ['pending', 'reviewing', 'interviewed', 'accepted', 'rejected']
        applications_created = 0
        
        for job in jobs:
            # Cada vaga tem entre 3 e 8 candidaturas
            num_applications = random.randint(3, 8)
            selected_candidates = random.sample(candidates, min(num_applications, len(candidates)))
            
            for candidate in selected_candidates:
                application = Application(
                    job_id=job.id,
                    candidate_id=candidate.id,
                    status=random.choice(statuses),
                    created_at=job.created_at + timedelta(days=random.randint(0, 15))
                )
                db.add(application)
                applications_created += 1
        
        db.commit()
        print(f"OK: {applications_created} candidaturas criadas")
        
        # CRIAR ADMIN (Apenas se não existir)
        existing_admin = db.query(User).filter(User.email == "admin@innovation.ia").first()
        if not existing_admin:
            admin = User(
                email="admin@innovation.ia",
                hashed_password=get_password_hash("admin123"),
                full_name="Administrador",
                role="company",
                is_active=True,
                two_factor_enabled=False
            )
            db.add(admin)
            db.commit()
            print("OK: Admin criado")
        else:
            print("OK: Admin já existe, pulando criação")
        
        print("\n" + "="*50)
        print("RESUMO DOS DADOS CRIADOS:")
        print(f"  - {len(companies)} empresas")
        print(f"  - {len(jobs)} vagas")
        print(f"  - {len(candidates)} candidatos")
        print(f"  - {applications_created} candidaturas")
        print(f"  - 1 admin")
        print("="*50)
        print("\nCREDENCIAIS:")
        print("  Admin: admin@innovation.ia / admin123")
        print("  Empresa: empresa1@test.com / senha123")
        print("  Candidato: candidato1@test.com / senha123")
        print("="*50)
        
    except Exception as e:
        print(f"Erro: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_seed_data()
