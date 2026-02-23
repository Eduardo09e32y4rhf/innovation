import os
import threading

class AIKeyManager:
    def __init__(self):
        # Carrega chaves do ambiente
        gemini_keys = os.getenv("GEMINI_KEYS", "").split(",")
        self.gemini_keys = [k.strip() for k in gemini_keys if k.strip()]
        
        self.exhausted_keys = set()
        self.lock = threading.Lock()

    def get_all_active_keys(self):
        with self.lock:
            # Retorna chaves que não estão na lista de exaustão
            return [k for k in self.gemini_keys if k not in self.exhausted_keys] or self.gemini_keys

    def mark_as_exhausted(self, api_key: str):
        with self.lock:
            self.exhausted_keys.add(api_key)
            print(f"⚠️ Key marked as exhausted: {api_key[:10]}...")

    def reset_keys(self):
        with self.lock:
            self.exhausted_keys.clear()

ai_key_manager = AIKeyManager()
