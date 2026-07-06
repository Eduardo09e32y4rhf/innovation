import re

file_path = 'apps/web/app/dashboard/management/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''<button onClick={handleSubmit} disabled={!title.trim() || !message.trim() || createMut.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">''',
    '''<button onClick={handleSubmit} disabled={!title.trim() || createMut.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">'''
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Button patched')
