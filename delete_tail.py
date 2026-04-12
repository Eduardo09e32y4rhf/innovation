with open("apps/frontend/lib/api.ts", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "export const FinanceService = {} as any;" in line:
        break
    new_lines.append(line)

with open("apps/frontend/lib/api.ts", "w") as f:
    f.writelines(new_lines)
