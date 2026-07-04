import re

file_path = 'apps/web/app/lib/pdf-utils.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Margins
content = content.replace("const margin = landscape ? '8mm 10mm' : '10mm 10mm';", "const margin = landscape ? '5mm 10mm' : '5mm 10mm';")

# Font sizes
content = content.replace("font-size: 8.5pt;", "font-size: 8pt;")
content = content.replace("line-height: 1.4;", "line-height: 1.25;")

# Section padding/margins
content = content.replace("margin-bottom:12px;", "margin-bottom:6px;")
content = content.replace("padding:6px 12px;", "padding:4px 8px;")
content = content.replace("padding:10px 12px;", "padding:6px 8px;")

# Table compact padding
content = content.replace("const paddingY = options?.compact ? '3px' : '6px';", "const paddingY = options?.compact ? '1.5px' : '4px';")

# Header margin
content = content.replace("margin-bottom:16px;", "margin-bottom:8px;")
content = content.replace("padding-bottom:10px;", "padding-bottom:6px;")

# Signature block
content = content.replace("margin-top:28px;", "margin-top:16px;")
content = content.replace("margin-top:20px;", "margin-top:10px;")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('pdf-utils.ts layout shrunk')
