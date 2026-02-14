import subprocess
import sys

try:
    process = subprocess.Popen(
        ['git', 'push', 'origin', 'main'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate()
    print("STDOUT:")
    print(stdout)
    print("STDERR:")
    print(stderr)
    print("EXIT CODE:", process.returncode)
except Exception as e:
    print("ERROR:", str(e))
