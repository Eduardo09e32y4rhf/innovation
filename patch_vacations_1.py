import re

file_path = 'apps/web/app/dashboard/vacations/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix conflict logic
content = content.replace(
    "p.employeeId === employeeId &&",
    "p.employeeId !== employeeId &&"
)

# Fix tabs categorization
content = content.replace(
    "const activeRows = rows.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');",
    "const activeRows = rows.filter(r => r.status === 'PENDING');"
)
content = content.replace(
    "const historyRows = rows.filter(r => r.status === 'CANCELLED' || r.status === 'COMPLETED');",
    "const historyRows = rows.filter(r => r.status === 'CANCELLED' || r.status === 'COMPLETED' || r.status === 'APPROVED');"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Tabs and conflict logic updated')
