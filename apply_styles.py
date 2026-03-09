import os
import re

FRONTEND_DIR = r"c:/Users/eduar/Desktop/innovation.ia/frontend/app"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Replace inter.className -> font-sans
    content = content.replace("${inter.className}", "font-sans")
    content = content.replace("className={inter.className}", "className=\"font-sans\"")
    content = re.sub(r'className={`\$\{inter\.className\}', "className={`font-sans", content)

    # 2. Add border and shadow to bg-white
    # We want to find bg-white and ensure it has the borders. Let's do a regex that finds bg-white but NOT if it already has border-slate-200.
    # A simple regex: find bg-white, replace with bg-white border border-slate-200 border-black/5 shadow-sm
    # But only if it doesn't already have border-slate-200 recently after or before
    # Let's just do a blanket regex: replace `bg-white` with `bg-white border border-slate-200 border-black/5 shadow-sm`
    # and then clean up any duplicates (e.g., if there's already `border ` or `shadow-sm` right near it? It might be messy).
    # Since the request says: "Todos os elementos que utilizavam bg-white foram atualizados para incluir border border-slate-200 border-black/5 shadow-sm", let's just do a naive replacement on "bg-white", then fix duplicates.
    
    # Split by quotes/backticks to only replace inside class names, or simply text replace because "bg-white" is universally used in tailwind classes.
    # regex for bg-white that is not already followed by the borders
    
    # Wait, we can just find 'bg-white' and replace it with 'TEMP_BG_WHITE'
    # Then replace 'TEMP_BG_WHITE' with 'bg-white border border-slate-200 border-black/5 shadow-sm'
    # Then run a cleanup: replace 'shadow-sm shadow-sm' -> 'shadow-sm', etc.
    # Actually, if we just find "bg-white" as a whole word (using \bbg-white\b) ...
    def replacer(match):
        return "bg-white border border-slate-200 border-black/5 shadow-sm"
        
    # Replace \bbg-white\b, but what if there's already 'shadow-sm'? 
    # Let's just do the naive replacement.
    content = re.sub(r'\bbg-white\b', replacer, content)
    
    # Let's clean up some obvious duplicates that might arise if the elements already had these classes
    content = re.sub(r'\bborder\s+border\b', 'border', content)
    content = re.sub(r'\bborder-slate-200\s+border-slate-200\b', 'border-slate-200', content)
    content = re.sub(r'\bshadow-sm\s+shadow-sm\b', 'shadow-sm', content)
    
    # Let's just clean up general duplicate classes in the string (naively)
    # We'll just leave them for now, Tailwind handles duplicate classes fine, or we can use a set.
    # But wait, we shouldn't replace text outside of classes. However, `bg-white` almost exclusively appears in class names.

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(FRONTEND_DIR):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            process_file(os.path.join(root, file))

print("Done")
