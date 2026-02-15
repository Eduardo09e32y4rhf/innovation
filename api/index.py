import sys
import os

# Add backend/src to sys.path so we can import 'api', 'core', etc.
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend/src'))

from api.main import app
