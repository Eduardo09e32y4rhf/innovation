// Sistema de MENTIRA com varios usuarios, gates de primeiro acesso e defeitos plantados (so para testar o motor do robo).
import http from 'node:http';

const APP = String.raw`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo multiusuario</title>
<body style="margin:0;font:15px system-ui"><div id="raiz"></div>
<script>
const T='demo', ROTULO={ADMIN:'Administrador',RH:'RH - Empresas',RH_RS:'RH - R&S',GESTOR:'Gestor',FUNCIONARIO:'Funcionário',CONSULTA:'Consulta',COMERCIAL:'Comercial',CONTABIL:'Contábil'};
const MENU={DEV:[['Dashboard',''],['Funcionários','/employees'],['Escalas','/escalas'],['Férias','/vacations'],['Vagas','/jobs'],['Usuários','/users'],['Configurações','/settings'],['Suporte','/support']],
 ADMIN:[['Dashboard',''],['Funcionários','/employees'],['Escalas','/escalas'],['Férias','/vacations'],['Vagas','/jobs'],['Configurações','/settings'],['Suporte','/support']],
 RH_RS:[['Dashboard',''],['Vagas','/jobs'],['Funcionários','/employees']], /* DEFEITO: RH_RS ve Funcionarios */
 FUNCIONARIO:[['Dashboard',''],['Escalas','/escalas'],['Férias','/vacations'],['Configurações','/settings'],['Suporte','/support']]};
const sess=()=>{try{return JSON.parse(localStorage.getItem('sess')||'null')}catch{return null}};
const gravar=s=>localStorage.setItem('sess',JSON.stringify(s));
window.__app={navegar(c){history.pushState({},'',c);render()},
 sair(){localStorage.removeItem('sess');location.href='/login'}, /* recarrega a pagina de proposito: testa a retomada */
 usuario(){const s=sess();return s?{nome:s.nome,email:s.email,perfil:s.role}:null}};
addEventListener('popstate',()=>render());
const el=(h)=>{const d=document.createElement('div');d.innerHTML=h;return d.firstElementChild};
function render(){const r=document.getElementById('raiz');r.innerHTML='';const p=location.pathname;
 if(p.startsWith('/login')||p==='/'){return login(r)}
 const s=sess();if(!s){location.href='/login';return}
 const rota=p.replace('/'+T+'/dashboard','').replace(/\/$/,'');
 const shell=el('<div style="display:flex;min-height:100vh"><aside style="width:200px;background:#eee;padding:12px"><nav></nav></aside><main style="flex:1;padding:20px"></main></div>');
 shell.querySelector('nav').innerHTML=(MENU[s.role]||[]).map(([n,h])=>'<div><a href="/'+T+'/dashboard'+h+'">'+n+'</a></div>').join('');
 shell.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.__app.navegar(a.getAttribute('href'))}));
 r.appendChild(shell);const m=shell.querySelector('main');pagina(m,s,rota);gates(r,s)}
function login(r){r.innerHTML='<div style="padding:40px"><h1>Entrar</h1><form id="f"><label for="login-email">E-mail</label><br><input id="login-email" type="email"><br><br><label>Senha</label><br><input type="password"><br><br><button type="submit">Entrar</button><p id="msg" role="alert" style="color:#b00"></p></form></div>';
 document.getElementById('f').onsubmit=async e=>{e.preventDefault();const email=document.getElementById('login-email').value,senha=document.querySelector('input[type=password]').value;
  const x=await fetch('/api/login',{method:'POST',body:JSON.stringify({email,senha})});if(!x.ok){document.getElementById('msg').textContent='E-mail ou senha incorretos';return}
  gravar(await x.json());history.pushState({},'','/'+T+'/dashboard');render()}}
function gates(r,s){
 if(s.fpc){r.appendChild(el('<div class="fixed inset-0" style="position:fixed;inset:0;background:#fff;z-index:50;padding:30px"><h2>Troque sua senha</h2><p id="gerr" style="color:#b00"></p>'
  +'<label>Senha atual<input type="password" id="a"></label><br><label>Nova senha<input type="password" id="n"></label><br><label>Confirmar nova senha<input type="password" id="c"></label><br><button id="ok">Trocar senha</button></div>'));
  document.getElementById('ok').onclick=async()=>{const n=document.getElementById('n').value;if(n!==document.getElementById('c').value||n.length<10){document.getElementById('gerr').textContent='A nova senha precisa ter 10+ caracteres e a confirmação igual';return}
   const x=await fetch('/api/senha',{method:'POST',body:JSON.stringify({email:s.email,atual:document.getElementById('a').value,nova:n})});if(!x.ok){document.getElementById('gerr').textContent='Senha atual incorreta';return}
   s.fpc=false;gravar(s);render()};return}
 if(!s.consent){r.appendChild(el('<div class="fixed inset-0" style="position:fixed;inset:0;background:#000a;z-index:50"><section style="background:#fff;margin:20px auto;max-width:700px;display:flex;flex-direction:column;height:80vh"><h2>Termo de Uso e Política de Privacidade</h2>'
  +'<div class="overflow-y-auto" id="rol" style="flex:1;overflow-y:auto;padding:10px"><p style="height:2000px">Texto longo do termo...</p></div><footer><label><input type="checkbox" id="ck" disabled> Li e concordo</label> <button id="as" disabled>Assinar termo</button></footer></section></div>'));
  const rol=document.getElementById('rol'),ck=document.getElementById('ck'),as=document.getElementById('as');
  rol.addEventListener('scroll',()=>{if(rol.scrollTop+rol.clientHeight>=rol.scrollHeight-4)ck.disabled=false});ck.onchange=()=>{as.disabled=!ck.checked};
  as.onclick=()=>{s.consent=true;gravar(s);render()};return}
 if(!s.welcome){r.appendChild(el('<div role="dialog" aria-modal="true" style="position:fixed;inset:0;background:#fffe;z-index:50;padding:40px"><h1>Seja muito bem-vindo(a)!</h1><button id="go">Começar agora</button></div>'));
  document.getElementById('go').onclick=()=>{s.welcome=true;gravar(s);render()}}}
function pagina(m,s,rota){const role=s.role;
 if(rota===''){m.innerHTML=role==='RH_RS'?'<h1>Bom dia, '+s.nome.split(' ')[0]+'!</h1><p>Vagas abertas 3</p><p>Candidaturas para triagem 2</p><p>Entrevistas próximas 1</p><p>Documentos a conferir 0</p><h2>Requer atenção</h2><p>Nada pendente.</p>':'<h1>Boa tarde, '+s.nome.split(' ')[0]+'!</h1><p>Painel.</p><button>Atualizar painel</button>';return}
 if(rota==='/users'){m.innerHTML='<h1>Usuários</h1><button id="nv">Novo acesso</button><p>Lista de acessos.</p>';document.getElementById('nv').onclick=()=>modalNovo();return}
 if(rota==='/support'){m.innerHTML='<h1>Suporte</h1><button id="c">Carregar chamados</button>';document.getElementById('c').onclick=async()=>{await fetch('/api/falha');setTimeout(()=>{throw new Error('Falha ao montar a lista de chamados')},10)};return}
 if(rota==='/escalas'&&role==='RH_RS'){m.innerHTML='<h1>Acesso restrito</h1><p>Seu perfil não tem permissão.</p>';return}
 if(rota==='/settings'&&role==='RH_RS'){m.innerHTML='<h1>Acesso restrito</h1><p>Seu perfil não tem permissão.</p>';return}
 if(rota==='/support'&&role==='RH_RS'){m.innerHTML='<h1>Acesso restrito</h1>';return}
 if(rota==='/employees'){m.innerHTML='<h1>Funcionários</h1><button>Novo funcionário</button> <button id="e">Excluir tudo</button><p>3 funcionários.</p>';document.getElementById('e').onclick=()=>fetch('/api/excluir',{method:'POST'});return}
 if(rota==='/vacations'){m.innerHTML='<h1>Férias</h1><p>Saldos de todos os colaboradores.</p>';return} /* DEFEITO: nao bloqueia RH_RS */
 if(rota==='/jobs'){m.innerHTML='<h1>Vagas</h1><p>Vagas abertas da empresa.</p>';return}
 m.innerHTML='<h1>'+(rota||'Página')+'</h1><p>Conteúdo da página.</p>'}
function modalNovo(){let modo='employee';const d=el('<div role="dialog" class="fixed inset-0" style="position:fixed;inset:0;background:#0008;z-index:40;display:flex;align-items:center;justify-content:center"><div style="background:#fff;padding:20px;width:560px"><h2>Novo acesso</h2><form id="form"></form></div></div>');
 document.body.appendChild(d);const f=d.querySelector('#form');
 const desenhar=()=>{f.innerHTML='<div role="radiogroup"><button type="button" role="radio" id="r1">Funcionário já cadastrado</button><button type="button" role="radio" id="r2">Pessoa sem cadastro</button></div>'
  +(modo==='free'?'<label>Empresa<select><option value="">Selecione…</option><option value="1">Empresa Demo</option></select></label><br><label>Nome<input required id="nm"></label><br><label>E-mail de acesso<input required type="email" id="em"></label><fieldset><legend>Visão (perfil de acesso)</legend>'
   +Object.entries(ROTULO).map(([k,v])=>'<label><input type="radio" name="role" value="'+k+'"><span>'+v+'</span><span>texto</span></label>').join('')+'</fieldset>':'')
  +'<button type="button" id="cancelar">Cancelar</button> <button type="submit">Criar acesso</button><p id="err" role="alert" style="color:#b00"></p>';
  f.querySelector('#r1').onclick=()=>{modo='employee';desenhar()};f.querySelector('#r2').onclick=()=>{modo='free';desenhar()};f.querySelector('#cancelar').onclick=()=>d.remove()};desenhar();
 f.onsubmit=async e=>{e.preventDefault();if(modo!=='free')return;const role=f.querySelector('input[name=role]:checked');if(!role){f.querySelector('#err').textContent='Escolha a visão';return}
  const x=await fetch('/api/criar',{method:'POST',body:JSON.stringify({nome:f.querySelector('#nm').value,email:f.querySelector('#em').value,role:role.value})});
  if(!x.ok){f.querySelector('#err').textContent='Não foi possível criar o acesso.';return}const u=await x.json();
  d.querySelector('div').innerHTML='<h2>Acesso criado</h2><p>'+u.nome+' já pode entrar com '+u.email+' e a senha provisória abaixo.</p><code>'+u.senha+'</code><br><button id="fim">Concluir</button>';d.querySelector('#fim').onclick=()=>d.remove()}}
render();
</script><script src="/robo.js"></script></body></html>`;

export async function iniciarSpa(botJs) {
  const contas = new Map([['dev@demo.test', { senha: 'devpass', role: 'DEV', nome: 'Dev Demo', fpc: false, consent: true, welcome: true }]]);
  const estado = { excluido: false, criados: [] };
  const corpo = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b ? JSON.parse(b) : {})); });
  const json = (res, status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const servidor = http.createServer(async (req, res) => {
    const url = req.url ?? '/';
    if (url === '/robo.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(botJs); }
    if (url.startsWith('/api/falha')) return json(res, 500, { erro: 'falha interna' });
    if (url.startsWith('/api/excluir')) { estado.excluido = true; return json(res, 200, {}); }
    if (url.startsWith('/api/login')) { const { email, senha } = await corpo(req); const c = contas.get(email); if (!c || c.senha !== senha) return json(res, 401, {}); return json(res, 200, { email, role: c.role, nome: c.nome, fpc: c.fpc, consent: c.consent, welcome: c.welcome }); }
    if (url.startsWith('/api/senha')) { const { email, atual, nova } = await corpo(req); const c = contas.get(email); if (!c || c.senha !== atual) return json(res, 403, {}); c.senha = nova; c.fpc = false; return json(res, 200, {}); }
    if (url.startsWith('/api/criar')) { const { nome, email, role } = await corpo(req); const senha = `Prov${Math.random().toString(36).slice(2, 8)}`; contas.set(email, { senha, role, nome, fpc: true, consent: false, welcome: false }); estado.criados.push({ email, role }); return json(res, 200, { nome, email, senha }); }
    if (url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(APP);
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${servidor.address().port}`, estado, parar: () => new Promise((ok) => servidor.close(ok)) };
}