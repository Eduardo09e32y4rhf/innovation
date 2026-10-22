# Conta `any` em producao e em testes (API e web) para o item L7 e para a "catraca" de nao-regressao. Uso: python3 scripts/dev/count-any.py (rode na raiz do repo; grava /tmp/any.json)
import re,subprocess,collections,json,os
files=subprocess.check_output(['git','ls-files','apps/api/src','apps/web/app','apps/api/scripts'],text=True).split('\n')
files=[f for f in files if re.search(r'\.(ts|tsx)$',f) and not f.endswith('.d.ts') and os.path.exists(f)]
PAT=re.compile(r':\s*any\b|\bas any\b|<any[,>\]\s]|\bany\[\]|,\s*any>|\(any\)|=>\s*any\b|\bany\s*\|\s|\|\s*any\b|<any>|\bPromise<any>|Record<[^>]*,\s*any>')
def count(path):
    n=0
    for line in open(path,encoding='utf-8',errors='ignore'):
        t=line.strip()
        if t.startswith('//') or t.startswith('*') or t.startswith('/*'): continue
        n+=len(PAT.findall(line))
    return n
rows=[(f,count(f),bool(re.search(r'\.(spec|test)\.tsx?$',f))) for f in files]
def mod(f):
    p=f.split('/')
    if f.startswith('apps/api/src/modules/'): return 'api/modules/'+p[4]
    if f.startswith('apps/api/src/'): return 'api/'+(p[3] if len(p)>4 else 'raiz')
    if f.startswith('apps/api/scripts'): return 'api/scripts'
    if len(p)>6 and p[3]=='[tenant]' and p[4]=='dashboard': return 'web/dashboard/'+p[5]
    if len(p)>4: return 'web/'+p[3]
    return 'web/raiz'
tot=collections.defaultdict(int); totspec=collections.defaultdict(int)
for f,n,s in rows: (totspec if s else tot)[f.split('/')[1]]+=n
ns=[(f,n) for f,n,s in rows if not s and n]
bymod=collections.defaultdict(int)
for f,n in ns: bymod[mod(f)]+=n
json.dump({'rows':rows,'bymod':dict(bymod),'tot':dict(tot),'totspec':dict(totspec)},open('/tmp/any.json','w'))
print('API nao-spec',tot['api'],'| API spec',totspec['api'],'| WEB nao-spec',tot['web'],'| WEB spec',totspec['web'])
print('--- top 25 areas (nao-spec)')
for m,n in sorted(bymod.items(),key=lambda x:-x[1])[:25]: print(f'{n:5} {m}')
print('--- top 20 arquivos (nao-spec)')
for f,n in sorted(ns,key=lambda x:-x[1])[:20]: print(f'{n:4} {f}')
print('arquivos nao-spec com any:',len(ns),'de',len([1 for f,n,s in rows if not s]))
