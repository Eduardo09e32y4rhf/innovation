from sqlalchemy import create_engine, text
from .database import Base, engine
from ..models.user import User
from ..models.job import Job
from ..models.application import Application
from ..core.security import get_password_hash
import logging

logger = logging.getLogger(__name__)

def init_database():
    """Inicializar banco de dados e criar tabelas"""
    try:
        # Criar todas as tabelas
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tabelas criadas com sucesso")
        return True
    except Exception as e:
        logger.error(f"❌ Erro ao criar tabelas: {str(e)}")
        return False

def check_database():
    """Verificar se banco está acessível"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Conexão com banco OK")
        return True
    except Exception as e:
        logger.error(f"❌ Erro de conexão: {str(e)}")
        return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    print("🔍 Verificando conexão...")
    if check_database():
        print("🏗️  Criando tabelas...")
        if init_database():
            print("✅ Banco de dados pronto!")
        else:
            print("❌ Erro ao criar tabelas")
    else:
        print("❌ Não foi possível conectar ao banco")
