import os
import requests
from sqlalchemy.orm import Session
from domain.models.user import User

class AsaasService:
    def __init__(self):
        # Defaulting to sandbox url if not provided in environment variables
        self.api_key = os.getenv("ASAAS_API_KEY", "$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjU0Y2ZlOGViLTZlYjgtNDRkNC1iNGU3LWQ5YzRiODY2MGJkODo6JGFhY2hfZDRmN2FlNTktNTYxNi00MmIzLWE4MDMtYjQxZjYzOWQ0ZDQx")
        self.url = os.getenv("ASAAS_API_URL", "https://sandbox.asaas.com/api/v3")
        self.headers = {
            "access_token": self.api_key,
            "Content-Type": "application/json"
        }

    def _get_or_create_customer(self, user: User, db: Session):
        """
        Verifica se o cliente já existe no Asaas buscando pelo e-mail ou documento (CPF/CNPJ).
        Caso não exista, cria e retorna o customer_id do Asaas.
        """
        # Verifica se o usuario ja tem um customer_id salvo no banco de dados
        # Dependendo da extensao do seu Model 'User', se voce adicionou asaas_customer_id, use-o
        if hasattr(user, 'asaas_customer_id') and user.asaas_customer_id:
            return user.asaas_customer_id

        # Busca cliente por e-mail no Asaas para checar duplicidade
        response = requests.get(f"{self.url}/customers", headers=self.headers, params={"email": user.email})
        if response.status_code == 200:
            data = response.json()
            if data.get("data") and len(data["data"]) > 0:
                customer_id = data["data"][0]["id"]
                # Save to db if the attribute exists
                if hasattr(user, 'asaas_customer_id'):
                    user.asaas_customer_id = customer_id
                    db.commit()
                return customer_id

        # Se não encontrou, cria
        payload = {
            "name": user.full_name or "Usuário Innovation.ia",
            "email": user.email,
            "externalReference": str(user.id)
            # Voce pode adicionar 'cpfCnpj' aqui se estiver coletando no cadastro
        }

        create_response = requests.post(f"{self.url}/customers", json=payload, headers=self.headers)
        if create_response.status_code == 200:
            customer_id = create_response.json().get("id")
            # Save to db if the attribute exists
            if hasattr(user, 'asaas_customer_id'):
                user.asaas_customer_id = customer_id
                db.commit()
            return customer_id
        
        # Ocorreu um erro na criacao do customer no Asaas
        print(f"Erro ao criar customer no Asaas: {create_response.text}")
        return None

    def processar_novo_assinante(self, user: User, amount: float, due_date: str, db: Session):
        """
        Passo B: Gerar a cobrança e retornar link de pagamento ou detalhes
        """
        customer_id = self._get_or_create_customer(user, db)
        if not customer_id:
            raise Exception("Não foi possível processar o cliente no pagador.")

        payload = {
            "customer": customer_id,
            "billingType": "UNDEFINED", # Deixa o cliente escolher no checkout (BOLETO, PIX, CREDIT_CARD)
            "value": amount,
            "dueDate": due_date,
            "description": "Assinatura Innovation.ia Enterprise",
            "externalReference": str(user.id),
            "postalService": False
        }

        # Cria cobranca no asaas
        response = requests.post(f"{self.url}/payments", json=payload, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Erro ao criar cobrança Asaas: {response.text}")
            raise Exception("Falha ao criar cobrança.")

asaas_service = AsaasService()
