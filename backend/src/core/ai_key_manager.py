import os
import json
from pathlib import Path
from core.config import settings


class AIKeyManager:
    """
    Gerencia a rotação e o estado das chaves da API do Gemini.
    """

    def __init__(self):
        self.status_file = Path(__file__).parent.parent.parent / "keys_status.json"
        self.dynamic_keys_file = Path(__file__).parent.parent.parent / "dynamic_keys.json"
        self._keys = []
        self._dynamic_keys = []
        self._load_keys()
        self._load_status()
        self._load_dynamic_keys()

    def _load_dynamic_keys(self):
        try:
            if self.dynamic_keys_file.exists():
                with open(self.dynamic_keys_file, "r") as f:
                    content = f.read().strip()
                    if content:
                        self._dynamic_keys = json.loads(content)
                    else:
                        self._dynamic_keys = []
            else:
                self._dynamic_keys = []
        except Exception as e:
            print(f"⚠️ Erro ao carregar chaves dinâmicas: {e}")
            self._dynamic_keys = []

    def _save_dynamic_keys(self):
        with open(self.dynamic_keys_file, "w") as f:
            json.dump(self._dynamic_keys, f)

    def _load_keys(self):
        # Tenta carregar a nova variável (múltiplas chaves)
        keys_str = settings.GEMINI_API_KEYS or ""

        # Fallback para a variável antiga (chave única) caso a nova esteja vazia
        if not keys_str:
            keys_str = os.getenv("GEMINI_API_KEY", "")

        self._keys = [k.strip() for k in keys_str.split(",") if k.strip()]

    def _load_status(self):
        try:
            if self.status_file.exists():
                with open(self.status_file, "r") as f:
                    content = f.read().strip()
                    if content:
                        self.exhausted_keys = set(json.loads(content))
                    else:
                        self.exhausted_keys = set()
            else:
                self.exhausted_keys = set()
        except Exception as e:
            print(f"⚠️ Erro ao carregar status das chaves: {e}")
            self.exhausted_keys = set()

    def _save_status(self):
        with open(self.status_file, "w") as f:
            json.dump(list(self.exhausted_keys), f)

    def get_active_key(self):
        """Retorna a primeira chave disponível que não está exausta."""
        available_keys = [k for k in self._keys if k not in self.exhausted_keys]

        if not available_keys:
            return None

        return available_keys[0]

    def mark_as_exhausted(self, key: str):
        """Marca uma chave como exausta (deletada logicamente)."""
        if key in self._keys:
            self.exhausted_keys.add(key)
            self._save_status()

            remaining = [k for k in self._keys if k not in self.exhausted_keys]
            if len(remaining) == 1:
                print(
                    f"⚠️ ATENÇÃO: Resta apenas 1 chave do Gemini operacional: {remaining[0]}"
                )
            elif len(remaining) == 0:
                print("❌ CRÍTICO: Todas as chaves do Gemini foram exaustas!")

    def get_all_active_keys(self):
        all_keys = self._keys + self._dynamic_keys
        return [k for k in all_keys if k not in self.exhausted_keys]

    def add_key(self, key: str):
        """Adiciona uma nova chave dinamicamente."""
        key = key.strip()
        if key and key not in self._keys and key not in self._dynamic_keys:
            self._dynamic_keys.append(key)
            self._save_dynamic_keys()
            # Se estava exausta, remove do status
            if key in self.exhausted_keys:
                self.exhausted_keys.remove(key)
                self._save_status()
            return True
        return False

    def remove_key(self, key: str):
        """Remove uma chave dinâmica."""
        if key in self._dynamic_keys:
            self._dynamic_keys.remove(key)
            self._save_dynamic_keys()
            return True
        return False

    def get_keys_info(self):
        """Retorna informações sobre todas as chaves (mascaradas)."""
        info = []
        for k in self._keys:
            info.append({
                "key": f"{k[:10]}...{k[-4:]}",
                "id": k,
                "type": "static",
                "status": "exhausted" if k in self.exhausted_keys else "active"
            })
        for k in self._dynamic_keys:
            info.append({
                "key": f"{k[:10]}...{k[-4:]}",
                "id": k,
                "type": "dynamic",
                "status": "exhausted" if k in self.exhausted_keys else "active"
            })
        return info


ai_key_manager = AIKeyManager()
