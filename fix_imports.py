import os
import re

def fix_imports(directory):
    replacements = [
        (r'from \.\.db\.database import get_db', 'from infrastructure.database.sql.dependencies import get_db'),
        (r'from \.\.db\.dependencies import get_db', 'from infrastructure.database.sql.dependencies import get_db'),
        (r'from \.\.db\.database import (.*)', r'from infrastructure.database.sql.database import \1'),
        (r'from \.\.models\.(\w+) import (.*)', r'from domain.models.\1 import \2'),
        (r'from \.\.schemas\.(\w+) import (.*)', r'from domain.schemas.\1 import \2'),
        (r'from \.\.core\.dependencies import (.*)', r'from core.dependencies import \1'),
        (r'from \.\.services\.(\w+) import (.*)', r'from services.\1 import \2'),
    ]

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = content
                for pattern, subst in replacements:
                    new_content = re.sub(pattern, subst, new_content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed: {path}")

if __name__ == "__main__":
    src_dir = r"c:\Users\eduar\Desktop\innovation.ia\backend\src"
    fix_imports(src_dir)
