// Extrator de rotas HTTP (modulos "B") via TypeScript compiler API. Somente leitura.
// Uso: node docs/auditoria/scripts/extrair-rotas-b.mjs  (na raiz do repo)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
const ts = require(path.resolve('node_modules/typescript'));

const SRC = path.resolve('apps/api/src');
const OUT = path.resolve('docs/auditoria');
// Modulos tratados por outro agente (excluidos desta saida).
const EXCLUDE = new Set(['auth','users','companies','platform','platform-hub','platform-audit','finance','coupons','support','accounting','payroll','privacy','mail','notifications','lookup','queue','welcome','metrics','common']);
const FROZEN = ['ai','partners','commercial-sales','proposals','manual-contracts','ceo-onboarding','communication','promotions'];

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const files = walk(SRC).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes('__tests__'));

const sfs = new Map();
for (const f of files) sfs.set(f, ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true));

// indices globais: classes e funcoes top-level
const interfaces = new Set();
const classes = new Map(); // nome -> {sf, node}
const funcs = new Map();   // nome -> [{sf,node}]
for (const [f, sf] of sfs) {
  sf.forEachChild((n) => {
    if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) interfaces.add(n.name.text);
    if (ts.isClassDeclaration(n) && n.name) classes.set(n.name.text, { sf, node: n });
    if (ts.isFunctionDeclaration(n) && n.name) { const a = funcs.get(n.name.text) ?? []; a.push({ sf, node: n }); funcs.set(n.name.text, a); }
    if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) { const a = funcs.get(d.name.text) ?? []; a.push({ sf, node: d.initializer }); funcs.set(d.name.text, a); }
  });
}

const STATUS = { BadRequest:400, Unauthorized:401, Forbidden:403, NotFound:404, MethodNotAllowed:405, NotAcceptable:406, RequestTimeout:408, Conflict:409, Gone:410, PayloadTooLarge:413, UnsupportedMediaType:415, UnprocessableEntity:422, InternalServerError:500, NotImplemented:501, BadGateway:502, ServiceUnavailable:503, GatewayTimeout:504, AsaasRejected:400 };
const HS = { OK:200, CREATED:201, ACCEPTED:202, NO_CONTENT:204, BAD_REQUEST:400, UNAUTHORIZED:401, PAYMENT_REQUIRED:402, FORBIDDEN:403, NOT_FOUND:404, CONFLICT:409, GONE:410, PAYLOAD_TOO_LARGE:413, UNPROCESSABLE_ENTITY:422, TOO_MANY_REQUESTS:429, INTERNAL_SERVER_ERROR:500, BAD_GATEWAY:502, SERVICE_UNAVAILABLE:503, GATEWAY_TIMEOUT:504, TOO_EARLY:425, LOCKED:423, PRECONDITION_FAILED:412, I_AM_A_TEAPOT:418 };

// Espelho de SCHEDULE_ACCESS (apps/api/src/modules/schedule/access/schedule-access.ts) para expandir rolesWith('cap').
const CAP = { 'calendar.read':'FUNCIONARIO,GESTOR,RH,ADMIN,DEV,CEO,CONSULTA', punch:'FUNCIONARIO,GESTOR,RH,ADMIN', 'requests.create':'FUNCIONARIO,GESTOR,RH,ADMIN,DEV', approvals:'GESTOR,RH,ADMIN,DEV', 'schedule.write':'GESTOR,RH,ADMIN,DEV', 'policy.write':'RH,ADMIN,DEV', 'closing.read':'FUNCIONARIO,GESTOR,RH,ADMIN,DEV,CEO,CONTABIL', 'closing.write':'RH,ADMIN,DEV', 'reports.read':'GESTOR,RH,ADMIN,DEV,CEO,CONTABIL,CONSULTA', diagnostics:'DEV' };
const expandRole = (t) => { const m = t.match(/^\.\.\.rolesWith\('([^']+)'\)$/); if (m) return CAP[m[1]].split(',').map((x) => x + '*'); if (t === '...REQUESTERS') return 'FUNCIONARIO,GESTOR,RH,ADMIN,DEV'.split(',').map((x) => x + '*'); if (t === '...APPROVERS') return 'GESTOR,RH,ADMIN,DEV'.split(',').map((x) => x + '*'); if (t === '...VIEWERS') return 'FUNCIONARIO,GESTOR,RH,ADMIN,DEV'.split(',').map((x) => x + '*'); if (/^\.\.\.SCHEDULE_MODULE_ROLES$/.test(t)) return ['FUNCIONARIO*','GESTOR*','RH*','ADMIN*','DEV*','CEO*','CONTABIL*','CONSULTA*']; return [t]; };
const decos = (n) => (ts.canHaveDecorators(n) ? ts.getDecorators(n) ?? [] : []);
const decoName = (d) => { const e = d.expression; return ts.isCallExpression(e) ? e.expression.getText() : e.getText(); };
const decoArgs = (d) => (ts.isCallExpression(d.expression) ? [...d.expression.arguments] : []);
const strVal = (a) => (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) ? a.text : a ? a.getText() : '');
const findDeco = (n, name) => decos(n).find((d) => decoName(d) === name);
const HTTP = ['Get','Post','Put','Patch','Delete','Head','Options','All'];

// Constantes string no arquivo (ex.: const ROUTE = '...')
function fileConsts(sf) { const m = new Map(); sf.forEachChild((n) => { if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer && (ts.isStringLiteral(d.initializer) || ts.isNoSubstitutionTemplateLiteral(d.initializer))) m.set(d.name.text, d.initializer.text); }); return m; }

function ctorTypes(cls) { // prop -> Tipo
  const m = new Map();
  for (const mem of cls.members) if (ts.isConstructorDeclaration(mem)) for (const p of mem.parameters) if (ts.isIdentifier(p.name) && p.type) m.set(p.name.text, p.type.getText().replace(/<.*$/, ''));
  for (const mem of cls.members) if (ts.isPropertyDeclaration(mem) && mem.type && ts.isIdentifier(mem.name)) m.set(mem.name.text, mem.type.getText().replace(/<.*$/, ''));
  return m;
}

// Coleta excecoes alcancaveis a partir de um corpo (nome do erro -> Set(status)), seguindo this.x(), this.svc.m() e funcoes livres.
function collectErrors(body, cls, depth, seen, out) {
  if (!body || depth < 0) return;
  const types = cls ? ctorTypes(cls) : new Map();
  const visit = (n) => {
    if (ts.isNewExpression(n)) {
      const nm = n.expression.getText();
      const m = nm.match(/^(\w+?)Exception$/);
      if (m && STATUS[m[1]]) out.add(STATUS[m[1]]);
      else if (nm === 'HttpException') {
        const a = n.arguments?.[1]; let code = null;
        if (a) { const t = a.getText(); const h = t.match(/HttpStatus\.(\w+)/); if (h) code = HS[h[1]] ?? t; else if (/^\d+$/.test(t)) code = Number(t); else code = '?'; }
        out.add(code ?? 500);
      } else if (nm === 'Error') out.add('500*');
    }
    if (ts.isCallExpression(n)) {
      const e = n.expression;
      if (ts.isPropertyAccessExpression(e)) {
        if (e.expression.kind === ts.SyntaxKind.ThisKeyword && cls) {
          const mem = cls.members.find((x) => ts.isMethodDeclaration(x) && x.name.getText() === e.name.text);
          const key = `${cls.name?.text}.${e.name.text}`;
          if (mem && !seen.has(key)) { seen.add(key); collectErrors(mem.body, cls, depth - 1, seen, out); }
        } else if (ts.isPropertyAccessExpression(e.expression) && e.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
          const t = types.get(e.expression.name.text); const c = t && classes.get(t);
          if (c) {
            const mem = c.node.members.find((x) => ts.isMethodDeclaration(x) && x.name.getText() === e.name.text);
            const key = `${t}.${e.name.text}`;
            if (mem && !seen.has(key)) { seen.add(key); collectErrors(mem.body, c.node, depth - 1, seen, out); }
          }
        }
      } else if (ts.isIdentifier(e)) {
        const fl = funcs.get(e.text);
        if (fl && fl.length === 1 && !seen.has('fn.' + e.text)) { seen.add('fn.' + e.text); collectErrors(fl[0].node.body, null, depth - 1, seen, out); }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(body);
}

function collectText(body, cls, depth, seen, acc) {
  if (!body || depth < 0) return; acc.push(body.getText());
  const types = cls ? ctorTypes(cls) : new Map();
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const e = n.expression;
      if (ts.isPropertyAccessExpression(e)) {
        if (e.expression.kind === ts.SyntaxKind.ThisKeyword && cls) {
          const mem = cls.members.find((x) => ts.isMethodDeclaration(x) && x.name.getText() === e.name.text); const key = `${cls.name?.text}.${e.name.text}`;
          if (mem && !seen.has(key)) { seen.add(key); collectText(mem.body, cls, depth - 1, seen, acc); }
        } else if (ts.isPropertyAccessExpression(e.expression) && e.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
          const t = types.get(e.expression.name.text); const c = t && classes.get(t);
          if (c) { const mem = c.node.members.find((x) => ts.isMethodDeclaration(x) && x.name.getText() === e.name.text); const key = `${t}.${e.name.text}`; if (mem && !seen.has(key)) { seen.add(key); collectText(mem.body, c.node, depth - 1, seen, acc); } }
        }
      } else if (ts.isIdentifier(e)) { const fl = funcs.get(e.text); if (fl && fl.length === 1 && !seen.has('fn.' + e.text)) { seen.add('fn.' + e.text); collectText(fl[0].node.body, null, depth - 1, seen, acc); } }
    }
    ts.forEachChild(n, visit);
  };
  visit(body);
}
function usesCompany(body) { const t = body?.getText() ?? ''; return /companyId|company\b|actor|user\b/i.test(t); }

const rows = []; const notes = { rolesSemGuard: [], semDto: [], duplicadas: [], sombra: [], statusIncoerente: [], postAcao201: [], escritaPerfilLeitura: [], idorSuspeitas: [], revisarEscopo: [], frozenSemFlag: [] };
const ctrlFiles = files.filter((f) => /@Controller\(/.test(fs.readFileSync(f, 'utf8')));
const modOf = (f) => { const rel = path.relative(SRC, f).split(path.sep); return rel[0] === 'modules' ? rel[1] : rel[0]; };

for (const f of ctrlFiles) {
  const mod = modOf(f); if (EXCLUDE.has(mod)) continue;
  const sf = sfs.get(f); const consts = fileConsts(sf);
  for (const cls of sf.statements.filter(ts.isClassDeclaration)) {
    const cd = findDeco(cls, 'Controller'); if (!cd) continue;
    const arg = decoArgs(cd)[0]; let prefix = '';
    if (arg) { if (ts.isObjectLiteralExpression(arg)) { const p = arg.properties.find((x) => x.name?.getText() === 'path'); prefix = p ? strVal(p.initializer) : ''; } else prefix = consts.get(arg.getText()) ?? strVal(arg); }
    const guardsOf = (n) => decos(n).filter((d) => decoName(d) === 'UseGuards').flatMap((d) => decoArgs(d).map((a) => a.getText()));
    const rolesOf = (n) => { const d = findDeco(n, 'Roles'); return d ? decoArgs(d).flatMap((a) => expandRole(ts.isStringLiteral(a) ? a.text : a.getText())).map((x) => x.replace(/\*$/, '')) : null; };
    const cGuards = guardsOf(cls), cRoles = rolesOf(cls);
    const cFeature = findDeco(cls, 'RequiresFeature') ? strVal(decoArgs(findDeco(cls, 'RequiresFeature'))[0]) : null;
    const cModule = findDeco(cls, 'RequireModule') ? strVal(decoArgs(findDeco(cls, 'RequireModule'))[0]) : null;
    const cThrottle = findDeco(cls, 'Throttle')?.getText() ?? (findDeco(cls, 'SkipThrottle') ? 'SkipThrottle' : '');
    const cSkipSub = !!findDeco(cls, 'SkipSubscriptionCheck');
    const ctypes = ctorTypes(cls.node ?? cls);
    for (const m of cls.members.filter(ts.isMethodDeclaration)) {
      const hd = decos(m).filter((d) => HTTP.includes(decoName(d)));
      if (!hd.length) continue;
      const mGuards = guardsOf(m), mRoles = rolesOf(m);
      const guards = [...new Set([...cGuards, ...mGuards])];
      const roles = mRoles ?? cRoles;
      const feature = findDeco(m, 'RequiresFeature') ? strVal(decoArgs(findDeco(m, 'RequiresFeature'))[0]) : cFeature;
      const reqMod = findDeco(m, 'RequireModule') ? strVal(decoArgs(findDeco(m, 'RequireModule'))[0]) : cModule;
      const thr = findDeco(m, 'Throttle')?.getText().replace(/\s+/g, ' ') ?? (findDeco(m, 'SkipThrottle') ? 'SkipThrottle' : cThrottle);
      const hc = findDeco(m, 'HttpCode'); const hcVal = hc ? (() => { const t = decoArgs(hc)[0].getText(); const h = t.match(/HttpStatus\.(\w+)/); return h ? (HS[h[1]] ?? t) : Number(t); })() : null;
      const hasJwt = guards.some((g) => /JwtAuthGuard/.test(g));
      const hasRolesGuard = guards.some((g) => /RolesGuard/.test(g));
      const otherGuards = guards.filter((g) => !/JwtAuthGuard|RolesGuard/.test(g));
      // parametros
      let pipes = false, queryDto = false; let body = '-', query = [], params = [], usesReqBody = false, res = false, hasCompany = false, hasActor = false, bodyInline = false;
      for (const p of m.parameters) {
        for (const d of decos(p)) {
          const dn = decoName(d); const ty = p.type?.getText() ?? 'any'; const a0 = decoArgs(d)[0];
          if (dn === 'Body') { if (a0) { body = `campo:${strVal(a0)}:${ty}`; } else { body = ty; } const base = ty.replace(/\[\]$/, ''); const isIface = interfaces.has(base); bodyInline = !a0 && (/^[{(]|^Record<|^any$|^unknown$|^object$/.test(ty) || (!classes.has(base))); if (isIface) { body = ty + ' (INTERFACE: sem validacao)'; bodyInline = true; } else if (classes.has(base) && !a0) { const cn = classes.get(base).node; const nv = cn.members.filter((x) => ts.isPropertyDeclaration(x)).length; const wv = cn.members.filter((x) => ts.isPropertyDeclaration(x) && decos(x).length).length; if (nv > 0 && wv === 0) { body = ty + ' (DTO sem decorators)'; bodyInline = true; } else if (nv === 0 && !cn.heritageClauses) { body = ty + ' (DTO vazio)'; } } }
          else if (dn === 'Query') { query.push(a0 ? `${strVal(a0)}` : ty); if (!a0 && classes.has(ty)) queryDto = true; if (decoArgs(d).length > 1) pipes = true; }
          else if (dn === 'Param') { params.push(a0 ? strVal(a0) : ty); if (decoArgs(d).length > 1) pipes = true; }
          else if (dn === 'Req') usesReqBody = /body|parts|isMultipart|file\(/.test(m.body?.getText() ?? '');
          else if (dn === 'Res') res = true;
          else if (dn === 'CurrentCompany') hasCompany = true;
          else if (dn === 'CurrentUser') hasActor = true;
        }
      }
      const retType = res ? 'stream' : '';
      for (const h of hd) {
        const verb = decoName(h).toUpperCase();
        const pa = decoArgs(h)[0];
        const sub = !pa ? [''] : ts.isArrayLiteralExpression(pa) ? pa.elements.map((e) => strVal(e)) : [consts.get(pa.getText()) ?? strVal(pa)];
        for (const s of sub) {
          const full = ('/' + [prefix, s].filter(Boolean).join('/')).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
          const acc = []; collectText(m.body, cls, 4, new Set(), acc); const allTxt = acc.join('\n'); const scoped = /companyId/.test(allTxt); const selfEv = /userId|actor\.sub|\.sub\b|scopeOf|FUNCIONARIO|assert[A-Z]\w*|canAccess|visible|team|scope/i.test(allTxt);
          const errs = new Set(); collectErrors(m.body, cls, 4, new Set(), errs);
          if (hasJwt) errs.add(401);
          if (hasJwt && !cSkipSub && !findDeco(m, 'SkipSubscriptionCheck')) errs.add(402);
          if (hasRolesGuard && roles?.length) errs.add(403);
          if (hasJwt) errs.add(403);
          if ((body !== '-' && !body.startsWith('campo:') && !bodyInline) || pipes || queryDto) errs.add(400);
          if (thr || true) errs.add(429);
          if (feature) errs.add(404);
          if (otherGuards.length) errs.add(401);
          const success = hcVal ?? (verb === 'POST' ? 201 : 200);
          let acesso;
          if (!hasJwt && otherGuards.length) acesso = 'token/guard proprio';
          else if (!hasJwt) acesso = 'PUBLICO';
          else if (roles?.length) acesso = hasRolesGuard ? 'Roles: ' + roles.join(',') : 'Roles SEM RolesGuard (nao aplicado): ' + roles.join(',');
          else acesso = 'qualquer logado';
          const writes = ['POST','PUT','PATCH','DELETE'].includes(verb);
          const dtoTxt = body === '-' ? (usesReqBody ? 'req.body (sem DTO)' : (query.length ? 'query:' + query.join('|') : '-')) : (bodyInline && !/\(INTERFACE|\(DTO sem/.test(body) ? body + ' (SEM DTO classe)' : body);
          const obs = [];
          if (feature) obs.push(`FEATURE_${feature.toUpperCase().replace(/-/g, '_')}`);
          if (thr) { const tm = thr.match(/limit:\s*([\d_]+).*?ttl:\s*([\d_]+)/); obs.push(tm ? `Throttle ${tm[1].replace(/_/g,'')}/${Number(tm[2].replace(/_/g,''))/1000}s` : thr); }
          if (reqMod) obs.push(`RequireModule:${reqMod}`);
          if (!hasJwt && !otherGuards.length) obs.push('sem guard de auth');
          if (res) obs.push('resposta via @Res (stream/arquivo)');
          if (hasJwt && !roles?.length) obs.push(`isolamento:${hasCompany ? 'CurrentCompany' : ''}${hasActor ? '+CurrentUser' : ''}${!hasCompany && !hasActor ? 'NENHUM' : ''}`);
          const row = { modulo: mod, metodo: verb, caminho: full, handler: `${cls.name.text}.${m.name.getText()}`, acesso, guards: guards.join('+') || '-', dto: dtoTxt, sucesso: res ? `${success}(stream)` : String(success), erros: [...errs].sort().join(','), observacao: obs.join('; '), _file: path.relative(process.cwd(), f), _line: sf.getLineAndCharacterOfPosition(m.getStart()).line + 1, _writes: writes, _hasCompany: hasCompany, _hasActor: hasActor, _hasParam: params.length > 0, _feature: feature, _roles: roles, _hasJwt: hasJwt, _bodyInline: bodyInline, _bodyNone: body === '-' && !usesReqBody, _mRoles: !!mRoles, _scoped: scoped, _selfEv: selfEv, _verb: verb, _name: m.name.getText(), _file2: f };
          rows.push(row);
        }
      }
    }
  }
}

// ---- analises
const key = (r) => `${r.metodo} ${r.caminho}`;
const dup = new Map(); for (const r of rows) { const a = dup.get(key(r)) ?? []; a.push(r); dup.set(key(r), a); }
for (const [k, a] of dup) if (a.length > 1) notes.duplicadas.push(`${k}: ${a.map((r) => `${r._file}:${r._line}`).join(' | ')}`);
// sombra: rota estatica depois de parametrica no mesmo metodo e mesmo prefixo
const byCtrl = new Map(); for (const r of rows) { const k = r.handler.split('.')[0] + r.metodo; const a = byCtrl.get(k) ?? []; a.push(r); byCtrl.set(k, a); }
for (const a of byCtrl.values()) for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
  const A = a[i].caminho.split('/'), B = a[j].caminho.split('/');
  if (A.length !== B.length) continue;
  let shadow = true, hasParamAt = false;
  for (let x = 0; x < A.length; x++) { if (A[x] === B[x]) continue; if (A[x].startsWith(':') && !B[x].startsWith(':')) { hasParamAt = true; continue; } shadow = false; break; }
  if (shadow && hasParamAt) notes.sombra.push(`${a[i].metodo} ${a[i].caminho} (${a[i]._file}:${a[i]._line}) declarada ANTES de ${a[j].caminho} (linha ${a[j]._line}) -> a estatica nunca e alcancada`);
}
for (const r of rows) {
  if (r.acesso.startsWith('Roles SEM')) notes.rolesSemGuard.push(`${r.metodo} ${r.caminho} ${r._file}:${r._line}`);
  if (r._writes && r._verb !== 'DELETE' && (r._bodyInline || r.dto.includes('SEM DTO') || r.dto.startsWith('req.body'))) notes.semDto.push(`${r.metodo} ${r.caminho} [${r.dto}] ${r._file}:${r._line}`);
  if (r._verb === 'GET' && r.sucesso !== '200' && !r.sucesso.startsWith('200')) notes.statusIncoerente.push(`GET ${r.caminho} sucesso=${r.sucesso} ${r._file}:${r._line}`);
  if (r._verb === 'DELETE' && r.sucesso.startsWith('201')) notes.statusIncoerente.push(`DELETE ${r.caminho} sucesso=${r.sucesso} ${r._file}:${r._line}`);
  if (r._verb === 'POST' && r.sucesso === '201' && /(^|\/)(list|search|query|export|preview|validate|check|calculate|simulate|resolve|verify|lookup|find|get)/i.test(r.caminho.split('/').pop() + '/' + r._name)) notes.statusIncoerente.push(`POST ${r.caminho} (${r._name}) devolve 201 padrao mas parece consulta/acao ${r._file}:${r._line}`);
  if (r._verb === 'POST' && r.sucesso === '201' && /\/(cancel|approve|reject|send|submit|close|reopen|decide|archive|finish|complete|confirm|revoke|resend|start|publish|unpublish|pause|resume|reactivate|duplicate|sync|retry|mark|read|decline|return|peer|forward|advance|move|hire|restore)[^/]*$/i.test(r.caminho)) (notes.postAcao201 ??= []).push(`${r.metodo} ${r.caminho} ${r._file}:${r._line}`);
  if (r._verb === 'POST' && r.sucesso === '200' && /^(create|add|register|criar)/i.test(r._name)) notes.statusIncoerente.push(`POST ${r.caminho} (${r._name}) devolve 200 mas parece criacao ${r._file}:${r._line}`);
  if (r._hasJwt && r._roles?.some((x) => ['FUNCIONARIO','CONSULTA'].includes(x)) && r._hasParam && !r._hasActor) notes.idorSuspeitas.push(`[baixo privilegio sem CurrentUser] ${r.metodo} ${r.caminho} ${r._file}:${r._line}`);
  if (r._hasJwt && !r._hasCompany && r._hasParam && !r._scoped) notes.idorSuspeitas.push(`[sem companyId em todo o fluxo] ${r.metodo} ${r.caminho} ${r._file}:${r._line}`);
  if (r._hasJwt && !r._roles?.length && (r._hasParam || r._verb === 'GET') && !r._hasCompany && !r._hasActor) notes.idorSuspeitas.push(`${r.metodo} ${r.caminho} ${r._file}:${r._line}`);
}
for (const r of rows) if (r._hasJwt && r._roles?.some((x) => ['FUNCIONARIO','CONSULTA','GESTOR'].includes(x)) && r._hasParam && !r._selfEv) (notes.revisarEscopo ??= []).push(`${r.metodo} ${r.caminho} ${r._file}:${r._line}`);
for (const r of rows) if (r._writes && r._hasJwt && !r._mRoles && r._roles?.some((x) => ['CONSULTA','FUNCIONARIO'].includes(x))) (notes.escritaPerfilLeitura ??= []).push(`${r.metodo} ${r.caminho} [${r._roles.join(',')}] ${r._file}:${r._line}`);
// controllers de modulos congelados sem @RequiresFeature
for (const r of rows) if (FROZEN.includes(r.modulo) && !r._feature) notes.frozenSemFlag.push(`${r.metodo} ${r.caminho} ${r._file}:${r._line}`);

// ---- saida
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const cols = ['modulo','metodo','caminho','handler','acesso','guards','dto','sucesso','erros','observacao'];
rows.sort((a, b) => a.modulo.localeCompare(b.modulo) || a.caminho.localeCompare(b.caminho) || a.metodo.localeCompare(b.metodo));
fs.writeFileSync(path.join(OUT, '01b-endpoints.csv'), '﻿' + cols.join(';') + '\n' + rows.map((r) => cols.map((c) => esc(r[c])).join(';')).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'scripts', '01b-notas.json'), JSON.stringify({ notes, rows: rows.map(({ _file2, ...r }) => r) }, null, 1));
const cnt = {}; for (const r of rows) cnt[r.modulo] = (cnt[r.modulo] ?? 0) + 1;
console.log(rows.length, 'rotas;', Object.keys(cnt).length, 'modulos'); console.log(cnt);
for (const [k, v] of Object.entries(notes)) console.log(k, v.length);
