filepath = 'apps/web/app/dashboard/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

search = """              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-2">
                  <Stethoscope size={16} strokeWidth={2.5} className="text-teal-600" />
                  <h3 className="text-sm font-black text-slate-950">Alertas e Pendências do RH</h3>
                </div>
              <div className="p-4">"""

replace = """              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-2">
                  <Stethoscope size={16} strokeWidth={2.5} className="text-teal-600" />
                  <h3 className="text-sm font-black text-slate-950">Alertas e Pendências do RH</h3>
                </div>
              </div>
              <div className="p-4">"""

if search in content:
    with open(filepath, 'w') as f:
        f.write(content.replace(search, replace))
    print("Fixed successfully.")
else:
    print("Not found.")
