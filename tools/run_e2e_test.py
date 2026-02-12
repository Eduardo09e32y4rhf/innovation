import requests
import random
import string
import time

BASE_URL = "http://127.0.0.1:8001"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def print_step(msg):
    print(f"\n[TESTE] {msg}...")

def test_flow():
    session = requests.Session()
    
    # 1. Register Company
    print_step("1. Cadastrando Empresa")
    company_email = f"company_{random_string()}@test.com"
    company_pass = "password123"
    company_name = f"Empresa {random_string()}"
    
    reg_payload = {
        "email": company_email,
        "password": company_pass,
        "name": company_name,
        "company_name": company_name # Schema expects company_name for registration
    }
    
    # Auth is at /auth/register
    res = session.post(f"{BASE_URL}/auth/register", json=reg_payload)
    if res.status_code not in [200, 201]:
        print(f"Erro ao registrar: {res.text}")
        return

    company_user = res.json()
    print(f"Empresa criada: {company_user['email']} (ID: {company_user['id']})")

    # 2. Login Company to get Token
    print_step("2. Login Empresa")
    login_data = {"email": company_email, "password": company_pass}
    # Auth login is at /auth/login
    res = session.post(f"{BASE_URL}/auth/login", json=login_data)
    if res.status_code != 200:
        print(f"Erro login: {res.text}")
        return
    
    token_data = res.json()
    token = token_data.get("access_token")
    if not token:
        # Check if 2FA required (temporary_token)
        if token_data.get("two_factor_required"):
             print("2FA requerido - Teste não suporta 2FA ainda.")
             return

    headers_company = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Job
    print_step("3. Criando Vaga de Python")
    job_payload = {
        "title": "Senior Python Developer",
        "description": "We are looking for a Python expert with SQL and Docker skills.",
        "location": "Remote",
        "status": "open"
    }
    # Jobs is at /api/jobs
    res = requests.post(f"{BASE_URL}/api/jobs", json=job_payload, headers=headers_company)
    if res.status_code not in [200, 201]:
        print(f"Erro criar vaga: {res.text}")
        return
    job = res.json()
    print(f"Vaga criada: {job['title']} (ID: {job['id']})")

    # 4. Register Candidate
    print_step("4. Cadastrando Candidato")
    cand_email = f"dev_{random_string()}@test.com"
    cand_pass = "password123"
    cand_payload = {
        "email": cand_email,
        "password": cand_pass,
        "name": "João Developer",
        # Role ignored by backend, will be COMPANY. But that's fine for demo.
    }
    res = requests.post(f"{BASE_URL}/auth/register", json=cand_payload)
    cand_user = res.json()
    print(f"Candidato criado: {cand_user['email']}")

    # 5. Login Candidate
    print_step("5. Login Candidato")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": cand_email, "password": cand_pass})
    cand_token = res.json()["access_token"]
    headers_cand = {"Authorization": f"Bearer {cand_token}"}

    # 6. Update Profile (to ensure AI Match)
    print_step("6. Atualizando Perfil (Bio/Skills)")
    # New endpoint /users/me
    profile_payload = {
        "bio": "I am a Senior Python Developer with 10 years experience.",
        "skills": "Python, SQL, Docker, FastAPI, AWS"
    }
    res = requests.patch(f"{BASE_URL}/users/me", json=profile_payload, headers=headers_cand)
    if res.status_code != 200:
        print(f"Erro ao atualizar perfil: {res.text}")
        # Dont return, try to continue
    else:
        print("Perfil atualizado com sucesso.")

    # 7. Apply to Job
    print_step("7. Aplicando para a Vaga")
    apply_payload = {"job_id": job['id']}
    # Applications is at /applications
    res = requests.post(f"{BASE_URL}/applications", json=apply_payload, headers=headers_cand)
    if res.status_code != 200:
        print(f"Erro ao aplicar: {res.text}")
        return
    application = res.json()
    score = application.get('score', 'N/A')
    print(f"Candidatura realizada! Status: {application['status']}") 
    print(f"AI Score Gerado: {score}")

    # 8. Check Company Dashboard
    print_step("8. Verificando Dashboard da Empresa")
    # Candidates is at /api/candidates
    res = requests.get(f"{BASE_URL}/api/candidates", headers=headers_company)
    candidates = res.json()
    
    found = False
    for c in candidates:
        if c['email'] == cand_email:
            print(f"✅ Candidato encontrado no Dashboard!")
            print(f"Nome: {c['nome']}")
            print(f"Vaga: {c['vaga']}")
            print(f"Score IA: {c['score']}%")
            if c['score'] > 0:
                print("✅ TESTE DE IA: SUCESSO! Score calculado.")
            else:
                print("⚠️ TESTE DE IA: Score zerado (verificar keywords).")
            found = True
            break
            
    if not found:
        print("❌ ERRO: Candidato não apareceu no dashboard.")
        print(f"Candidatos encontrados: {len(candidates)}")

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"Erro fatal no teste: {e}")
        print("Certifique-se que o servidor está rodando na porta 8001")
