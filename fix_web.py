import re

with open('apps/web/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"const actionShortcuts = isFuncionario \? \[\] : \[",
    r"const actionShortcuts: { label: string; href: string; icon: any; color: string; onClick?: () => void; }[] = isFuncionario ? [] : [",
    content
)

with open('apps/web/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
