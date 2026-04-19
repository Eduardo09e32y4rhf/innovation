'''BlackBox - Criptografia Blindada
Proteção total dados clientes. Encrypt per-user key.
Caso hackeado: dados ilegíveis (zero export).
'''

import os
from typing import Union
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import json
from sqlalchemy.types import LargeBinary
import logging

logger = logging.getLogger(__name__)

class BlackBox:
    def __init__(self, master_key: str):
        '''Init com master key do .env (32 bytes base64)'''
        self.master_key = base64.urlsafe_b64decode(master_key.encode())

    def _derive_key(self, user_id: int) -> bytes:
        '''Deriva key única por usuário (PBKDF2 + user_id)'''
        salt = f'blackbox_{user_id}'.encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
        return key

    def encrypt(self, user_id: int, data: Union[str, dict]) -> bytes:
        '''Encrypt dados → bytes DB'''
        if isinstance(data, dict):
            data = json.dumps(data)
        fernet = Fernet(self._derive_key(user_id))
        encrypted = fernet.encrypt(data.encode())
        logger.info(f'BlackBox encrypt user_id={user_id} len={len(encrypted)}')
        return encrypted

    def decrypt(self, user_id: int, encrypted_data: bytes) -> str:
        '''Decrypt bytes → JSON/str'''
        try:
            fernet = Fernet(self._derive_key(user_id))
            decrypted = fernet.decrypt(encrypted_data).decode()
            try:
                return json.loads(decrypted)
            except:
                return decrypted
        except InvalidToken:
            logger.error(f'BlackBox decrypt fail user_id={user_id}')
            raise ValueError('Dados corrompidos/inválidos')
    
    def get_column(self):
        '''SQLAlchemy column para model'''
        return LargeBinary()

# Global instance (init em config/dependencies)
blackbox = None

def init_blackbox(master_key: str):
    global blackbox
    blackbox = BlackBox(master_key)

