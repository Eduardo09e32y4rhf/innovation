#!/usr/bin/env python3
'''Pre-commit: Block secrets/senhas em commits'''

import re
import sys
from pathlib import Path

PATTERNS = [
    r'api[_-]?key[\s:=]+["\']?[a-zA-Z0-9_-]+["\']?',  # API keys
    r'secret[_-]?key[\s:=]+["\']?[a-zA-Z0-9_-]+["\']?',
    r'password[\s:=]+["\']?[^ \t\n\r\f\v]+["\']?',  # passwords
    r'private[_-]?key[\s:=]+["\']?[a-zA-Z0-9_-]+["\']?',
    r'eyJ[A-Za-z0-9_-]+',  # JWT tokens
    r'-----BEGIN (RSA|PRIVATE|PUBLIC) KEY-----',  # PEM keys
]

def scan_file(file_path: Path) -> bool:
    try:
        content = file_path.read_text(errors='ignore')
        for pattern in PATTERNS:
            if re.search(pattern, content, re.IGNORECASE | re.MULTILINE):
                print(f'🚫 SECRET DETECTED: {file_path}')
                print(f'   Pattern: {pattern}')
                return True
    except:
        pass
    return False

if __name__ == '__main__':
    staged_files = sys.argv[1:] if len(sys.argv) > 1 else []
    for file_path_str in staged_files:
        path = Path(file_path_str)
        if path.is_file() and scan_file(path):
            sys.exit(1)
    sys.exit(0)

