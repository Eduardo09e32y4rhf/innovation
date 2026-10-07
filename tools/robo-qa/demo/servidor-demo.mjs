// Sistema de MENTIRA, com defeitos de proposito, so para provar que o robo enxerga erros.
import http from 'node:http';

export const CONFIG_DEMO = {
  ADMIN: { email: 'admin@demo.test', senha: 'demo' },
  RH_RS: { email: 'rs@demo.test', senha: 'demo' },
};

const LOGIN = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Login demo</title><body style="font:16px system-ui;padding:40px">
<h1>Entrar (demo)</h1><form id="f"><label for="login-email">E-mail</label><br><input id="login-email" type="email" required><br><br>
<label>Senha</label><br><input type="password" required><br><br><button type="submit">Entrar</button><p id="msg" role="alert" style="color:#b00"></p></form>
<script>
const contas={'admin@demo.test':'ADMIN','rs@demo.test':'RH_RS'};
document.getElementById('f').addEventListener('submit',e=>{e.preventDefault();const r=contas[document.getElementById('login-email').value];
 if(!r){document.getElementById('msg').textContent='E-mail ou senha incorretos';return}
 localStorage.setItem('role',r);location.href='/demo/dashboard';});
</script></body></html>`;

const SHELL = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo</title>
<body style="margin:0;font:15px system-ui"><div style="display:flex;min-height:100vh"><aside id="menu" style="width:200px;background:#eee;padding:12px"></aside><main id="m" style="flex:1;padding:20px"></main></div>
<script>
const role=localStorage.getItem('role');const base='/demo/dashboard';
const MENU={ADMIN:[['Dashboard',''],['Funcionários','/employees'],['Escalas','/escalas'],['Férias','/vacations'],['Vagas','/jobs'],['Configurações','/settings'],['Suporte','/support']],
 RH_RS:[['Dashboard',''],['Vagas','/jobs'],['Funcionários','/employees']]}; /* DEFEITO: RH_RS ve "Funcionários" */
document.getElementById('menu').innerHTML='<nav>'+(MENU[role]||[]).map(([n,h])=>'<div><a href="'+base+h+'">'+n+'</a></div>').join('')+'</nav>';
const rota=location.pathname.replace(base,'').replace(/\\/$/,'');const m=document.getElementById('m');
const bloqueado=()=>{m.innerHTML='<h1>Acesso restrito</h1><p>Seu perfil não tem permissão para esta área.</p>'};
const modal=()=>{const d=document.createElement('div');d.className='fixed inset-0';d.setAttribute('role','dialog');d.style.cssText='position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center';
 d.innerHTML='<div style="background:#fff;padding:20px"><p>Novo funcionário (demo)</p><button id="x">Cancelar</button></div>';document.body.appendChild(d);d.querySelector('#x').onclick=()=>d.remove()};
(()=>{ if(rota===''){m.innerHTML=role==='RH_RS'
 ?'<h1>Bom dia, Demo!</h1><p>Vagas abertas 3</p><p>Candidaturas para triagem 2</p><p>Entrevistas próximas 1</p><p>Documentos a conferir 0</p><h2>Requer atenção</h2><p>Nada pendente.</p>'
 :'<h1>Boa tarde, Demo!</h1><p>Painel do administrador com folha, ponto e férias.</p><button>Atualizar painel</button>';}
else if(rota==='/employees'){m.innerHTML='<h1>Funcionários</h1><button id="n">Novo funcionário</button> <button id="e">Excluir tudo</button><p>Lista de 3 funcionários.</p>';
 document.getElementById('n').onclick=modal;document.getElementById('e').onclick=()=>fetch('/api/excluir',{method:'POST'});}
else if(rota==='/escalas'){if(role==='RH_RS')return bloqueado();m.innerHTML='<h1>Escalas</h1><div role="tablist"><button role="tab">Semana</button><button role="tab">Mês</button></div><p>Calendário da equipe.</p>';}
else if(rota==='/vacations'){m.innerHTML='<h1>Férias</h1><p>Saldo e períodos de férias de todos os colaboradores.</p>';} /* DEFEITO: nao bloqueia RH_RS */
else if(rota==='/settings'){if(role==='RH_RS')return bloqueado();m.innerHTML='<h1>Configurações</h1><p>Dados da empresa.</p><div style="width:1200px;background:#cde">Tabela larga demais para o celular</div>';}
else if(rota==='/support'){if(role==='RH_RS')return bloqueado();m.innerHTML='<h1>Suporte</h1><button id="c">Carregar chamados</button><p>Nenhum chamado carregado.</p>';
 document.getElementById('c').onclick=async()=>{await fetch('/api/falha');setTimeout(()=>{throw new Error('Falha ao montar a lista de chamados')},10)};}
else if(rota==='/jobs'){m.innerHTML='<h1>Vagas</h1><p><a href="'+base+'/jobs/1">Desenvolvedor (3 candidatos)</a></p>';}
else if(rota==='/jobs/1'){m.innerHTML='<h1>Funil de recrutamento</h1><details><summary>Responsáveis pela vaga (toda a equipe de R&S)</summary>Escolha quem cuida desta vaga.</details>'
 +'<article draggable="true" style="border:1px solid #999;padding:8px;margin:8px 0"><input type="checkbox"><button id="cand">Maria Teste</button></article><div id="gaveta"></div>';
 document.getElementById('cand').onclick=()=>{document.getElementById('gaveta').innerHTML='<div role="dialog" style="border:2px solid #333;padding:10px"><select aria-label="Etapa"><option>Inscritos</option><option>Entrevista</option><option>Contratado</option></select>'
  +'<div><button role="tab">Resumo</button><button role="tab">Avaliação</button><button role="tab">Notas</button><button role="tab">Entrevistas</button><button role="tab">Documentos</button><button role="tab">Histórico</button></div></div>'};}
else{m.innerHTML='<h1>Não encontrado</h1>';}})();
</script></body></html>`;

export async function iniciarDemo() {
  const estado = { excluido: false };
  const servidor = http.createServer((req, res) => {
    if (req.url?.startsWith('/api/falha')) { res.writeHead(500, { 'content-type': 'application/json' }); return res.end('{"erro":"falha interna"}'); }
    if (req.url?.startsWith('/api/excluir')) { estado.excluido = true; res.writeHead(200); return res.end('{}'); }
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(req.url?.startsWith('/login') ? LOGIN : SHELL);
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const { port } = servidor.address();
  return { url: `http://127.0.0.1:${port}`, estado: () => ({ ...estado, resumo: estado.excluido ? 'O ROBÔ APAGOU DADOS (ERRADO)' : 'nada apagado (certo)' }), parar: () => new Promise((ok) => servidor.close(ok)) };
}