import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath("c:/Users/eduar/Desktop/innovation.ia/innovation"))

try:
    print("Checking imports...")
    from app.services.gemini_service import GeminiService
    print("✅ GeminiService imported")
    from app.services.claude_service import ClaudeService
    print("✅ ClaudeService imported")
    from app.api.payments import router as payments_router
    print("✅ Payments router imported")
    print("All new modules are importable.")
except ImportError as e:
    print(f"❌ ImportError: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
