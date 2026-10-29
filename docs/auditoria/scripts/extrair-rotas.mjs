#!/usr/bin/env node
/**
 * Inventario de rotas HTTP da API (NestJS + Fastify) via AST do TypeScript.
 *
 * Uso:  node docs/auditoria/scripts/extrair-rotas.mjs [--saida docs/auditoria]
 * Saidas (em --saida):
 *   01a-endpoints.csv            rotas dos modulos do escopo 01a (separador ';')
 *   01a-endpoints.md             resumo + achados (anexa scripts/01a-notas-manuais.md se existir)
 *   scripts/01a-rotas-todas.json todas as rotas de todos os controllers (base p/ duplicidade e conferencias)
 *
 * SOMENTE LEITURA sobre apps/api/src. Heuristicas (documentadas no .md):
 *  - prefixo: @Controller(path). main.ts nao usa setGlobalPrefix nem enableVersioning -> caminho final = prefixo + rota.
 *  - erros: segue chamadas this.servico.metodo() / this.metodo() / funcoes importadas (profundidade 8) e coleta
 *    `new XException(...)`, `new HttpException(msg, status)` e `throw new Error` (-> 500). Guards listados em
 *    @UseGuards tambem sao analisados (canActivate). Codigos com '*' sao inferidos pelo filtro global
 *    (Prisma P2002->409, P2025->404) a partir de create/upsert/update/delete no caminho.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SRC = path.join(ROOT, 'apps/api/src');
const argv = process.argv.slice(2);
const OUT = path.resolve(ROOT, argv.indexOf('--saida') >= 0 ? argv[argv.indexOf('--saida') + 1] : 'docs/auditoria');

const SCOPE = new Set(['auth', 'users', 'companies', 'platform', 'platform-hub', 'platform-audit', 'finance', 'coupons', 'support',
  'accounting', 'payroll', 'privacy', 'mail', 'notifications', 'lookup', 'queue', 'welcome', 'metrics', 'health']);

const HTTP_DECOS = { Get: 'GET', Post: 'POST', Put: 'PUT', Patch: 'PATCH', Delete: 'DELETE', Head: 'HEAD', Options: 'OPTIONS', All: 'ALL' };
const HTTP_STATUS = { OK: 200, CREATED: 201, ACCEPTED: 202, NO_CONTENT: 204, BAD_REQUEST: 400, UNAUTHORIZED: 401, PAYMENT_REQUIRED: 402, FORBIDDEN: 403,
  NOT_FOUND: 404, METHOD_NOT_ALLOWED: 405, NOT_ACCEPTABLE: 406, REQUEST_TIMEOUT: 408, CONFLICT: 409, GONE: 410, PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415, UNPROCESSABLE_ENTITY: 422, TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500, NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502, SERVICE_UNAVAILABLE: 503, GATEWAY_TIMEOUT: 504 };
const EXC = { BadRequestException: 400, UnauthorizedException: 401, PaymentRequiredException: 402, ForbiddenException: 403, NotFoundException: 404,
  MethodNotAllowedException: 405, NotAcceptableException: 406, RequestTimeoutException: 408, ConflictException: 409, GoneException: 410,
  PayloadTooLargeException: 413, UnsupportedMediaTypeException: 415, UnprocessableEntityException: 422, InternalServerErrorException: 500,
  NotImplementedException: 501, BadGatewayException: 502, ServiceUnavailableException: 503, GatewayTimeoutException: 504,
  AsaasRejectedException: 400 /* extends BadRequestException (finance/asaas.service.ts:25) */ };
const KNOWN_DECOS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Head', 'Options', 'All', 'UseGuards', 'Roles', 'Throttle', 'SkipThrottle',
  'HttpCode', 'Controller', 'ApiTags', 'ApiBearerAuth', 'ApiOperation', 'ApiConsumes', 'ApiResponse', 'Header']);
const VALIDATOR_IGNORE = new Set(['IsOptional', 'ValidateIf', 'Type', 'Transform', 'Exclude', 'Expose']);

// ---------------------------------------------------------------- utilidades de AST
const fileCache = new Map();
function loadFile(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  let info = null;
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    info = { file, sf, text, imports: new Map(), classes: new Map(), funcs: new Map(), types: new Map(), consts: new Map(), reexports: [] };
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && st.importClause) {
        const spec = st.moduleSpecifier.text;
        const typeOnlyClause = !!st.importClause.isTypeOnly;
        const add = (local, imported, typeOnly) => info.imports.set(local, { spec, imported, typeOnly, from: file });
        if (st.importClause.name) add(st.importClause.name.text, 'default', typeOnlyClause);
        const nb = st.importClause.namedBindings;
        if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) add(el.name.text, (el.propertyName || el.name).text, typeOnlyClause || !!el.isTypeOnly);
        if (nb && ts.isNamespaceImport(nb)) add(nb.name.text, '*', typeOnlyClause);
      } else if (ts.isClassDeclaration(st) && st.name) info.classes.set(st.name.text, st);
      else if (ts.isFunctionDeclaration(st) && st.name) info.funcs.set(st.name.text, st);
      else if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) info.types.set(st.name.text, st);
      else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (!ts.isIdentifier(d.name) || !d.initializer) continue;
          info.consts.set(d.name.text, d.initializer);
          if (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) info.funcs.set(d.name.text, d.initializer);
        }
      } else if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
        info.reexports.push({ spec: st.moduleSpecifier.text, names: st.exportClause && ts.isNamedExports(st.exportClause) ? st.exportClause.elements.map((e) => ({ exp: e.name.text, orig: (e.propertyName || e.name).text })) : null });
      }
    }
  }
  fileCache.set(file, info);
  return info;
}
function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base + '.ts', path.join(base, 'index.ts'), base]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}
/** procura declaracao (class/func/type) por nome no arquivo, seguindo imports e re-exports. */
function findDecl(file, name, depth = 0, seen = new Set()) {
  const info = loadFile(file);
  if (!info || depth > 6 || seen.has(file + '#' + name)) return null;
  seen.add(file + '#' + name);
  if (info.classes.has(name)) return { file, kind: 'class', node: info.classes.get(name) };
  if (info.types.has(name)) { const n = info.types.get(name); return { file, kind: ts.isInterfaceDeclaration(n) ? 'interface' : ts.isEnumDeclaration(n) ? 'enum' : 'type', node: n }; }
  if (info.funcs.has(name)) return { file, kind: 'func', node: info.funcs.get(name) };
  const imp = info.imports.get(name);
  if (imp) {
    const target = resolveSpec(file, imp.spec);
    if (!target) return { file, kind: 'external', node: null, typeOnly: imp.typeOnly, spec: imp.spec };
    const r = findDecl(target, imp.imported === 'default' ? name : imp.imported, depth + 1, seen);
    if (r && imp.typeOnly) r.typeOnly = true;
    return r;
  }
  for (const rx of info.reexports) {
    const t = resolveSpec(file, rx.spec);
    if (!t) continue;
    if (rx.names) { const m = rx.names.find((n) => n.exp === name); if (m) { const r = findDecl(t, m.orig, depth + 1, seen); if (r) return r; } }
    else { const r = findDecl(t, name, depth + 1, seen); if (r) return r; }
  }
  return null;
}
const decosOf = (n) => (ts.canHaveDecorators(n) ? ts.getDecorators(n) ?? [] : []);
function dinfo(d) {
  const e = d.expression;
  if (ts.isCallExpression(e)) return { name: e.expression.getText(), args: [...e.arguments], node: d };
  return { name: e.getText(), args: [], node: d };
}
const lineOf = (node) => node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1;

function evalConst(n, info, depth = 0) {
  if (!n || depth > 5) return undefined;
  if (ts.isStringLiteralLike(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text.replace(/_/g, ''));
  if (ts.isParenthesizedExpression(n)) return evalConst(n.expression, info, depth + 1);
  if (ts.isAsExpression(n)) return evalConst(n.expression, info, depth + 1);
  if (ts.isPropertyAccessExpression(n) && n.expression.getText() === 'HttpStatus') return HTTP_STATUS[n.name.text];
  if (ts.isBinaryExpression(n)) {
    const a = evalConst(n.left, info, depth + 1), b = evalConst(n.right, info, depth + 1);
    if (typeof a === 'number' && typeof b === 'number') {
      switch (n.operatorToken.kind) { case ts.SyntaxKind.AsteriskToken: return a * b; case ts.SyntaxKind.PlusToken: return a + b; case ts.SyntaxKind.MinusToken: return a - b; case ts.SyntaxKind.SlashToken: return a / b; }
    }
    if (typeof a === 'string' && typeof b === 'string' && n.operatorToken.kind === ts.SyntaxKind.PlusToken) return a + b;
    return undefined;
  }
  if (ts.isIdentifier(n) && info) {
    if (info.consts.has(n.text)) return evalConst(info.consts.get(n.text), info, depth + 1);
    const imp = info.imports.get(n.text);
    if (imp) { const t = resolveSpec(info.file, imp.spec); const ti = t && loadFile(t); if (ti && ti.consts.has(imp.imported)) return evalConst(ti.consts.get(imp.imported), ti, depth + 1); }
  }
  return undefined;
}
function objProp(obj, key) {
  if (!obj || !ts.isObjectLiteralExpression(obj)) return undefined;
  const p = obj.properties.find((x) => ts.isPropertyAssignment(x) && x.name.getText().replace(/['"]/g, '') === key);
  return p ? p.initializer : undefined;
}

// ---------------------------------------------------------------- analise de erros (segue chamadas)
/** Enclosing try/catch (mesma funcao) cujo bloco try contem o no: { caught, rethrows }. */
function tryContext(node) {
  let child = node, cur = node.parent;
  while (cur && !ts.isFunctionLike(cur)) {
    if (ts.isTryStatement(cur) && cur.catchClause && cur.tryBlock === child) {
      let rethrows = false;
      const scan = (x) => { if (ts.isThrowStatement(x)) rethrows = true; ts.forEachChild(x, scan); };
      scan(cur.catchClause.block);
      return { caught: true, rethrows };
    }
    child = cur; cur = cur.parent;
  }
  return { caught: false, rethrows: false };
}
const inTryWithCatch = (node) => tryContext(node).caught;
/** Erros vindos de uma chamada protegida por try/catch que NAO relanca sao engolidos pelo chamador. */
function swallowed(call, sub) {
  const c = tryContext(call);
  if (!c.caught || c.rethrows) return sub;
  return { ...sub, codes: new Map(), errAt: new Set(), rawError: false, inferred: new Set() };
}

const mergeInfo = (a, b) => {
  for (const [c, s] of b.codes) { if (!a.codes.has(c)) a.codes.set(c, new Set()); for (const x of s) a.codes.get(c).add(x); }
  for (const k of ['inferred', 'perm', 'authHints', 'ext', 'upload', 'errAt', 'writeAt', 'swallowAt']) for (const x of b[k]) a[k].add(x);
  a.hasTry ||= b.hasTry; a.writes ||= b.writes; a.manualStatus ||= b.manualStatus; a.rawError ||= b.rawError;
  for (const u of b.unresolved) a.unresolved.add(u);
};
const newInfo = () => ({ swallowAt: new Set(), errAt: new Set(), writeAt: new Set(), codes: new Map(), inferred: new Set(), perm: new Set(), authHints: new Set(), ext: new Set(), upload: new Set(), unresolved: new Set(), hasTry: false, writes: false, manualStatus: false, rawError: false });
const addCode = (info, code, origin) => { if (!info.codes.has(code)) info.codes.set(code, new Set()); info.codes.get(code).add(origin); };
const memo = new Map();

function classMember(classNode, name) {
  for (const m of classNode.members) {
    if (m.name && m.name.getText() === name && (ts.isMethodDeclaration(m) || ts.isGetAccessor(m) || (ts.isPropertyDeclaration(m) && m.initializer && (ts.isArrowFunction(m.initializer) || ts.isFunctionExpression(m.initializer))))) return m;
  }
  return null;
}
function typeRefName(t) {
  if (ts.isTypeReferenceNode(t)) return t.typeName.getText();
  if (ts.isUnionTypeNode(t)) { for (const x of t.types) { const r = typeRefName(x); if (r && r !== 'undefined') return r; } }
  return null;
}
function propTypeName(classNode, prop) {
  for (const m of classNode.members) {
    if (ts.isConstructorDeclaration(m)) {
      for (const p of m.parameters) if (p.name.getText() === prop && p.type) return typeRefName(p.type);
    }
    if (ts.isPropertyDeclaration(m) && m.name.getText() === prop && m.type) return typeRefName(m.type);
  }
  return null;
}
function heritage(classNode, file) {
  const h = classNode.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword);
  const e = h?.types[0]?.expression;
  if (e && ts.isIdentifier(e)) return findDecl(file, e.text);
  return null;
}
function findMethodDeep(decl, name) {
  let cur = decl, guard = 0;
  while (cur && cur.kind === 'class' && guard++ < 5) {
    const m = classMember(cur.node, name);
    if (m) return { member: m, decl: cur };
    cur = heritage(cur.node, cur.file);
  }
  return null;
}
function inheritedPropType(decl, prop) {
  let cur = heritage(decl.node, decl.file), g = 0;
  while (cur && cur.kind === 'class' && g++ < 4) { const t = propTypeName(cur.node, prop); if (t) return t; cur = heritage(cur.node, cur.file); }
  return null;
}

function analyzeNode(body, ctx, depth, stack) {
  const info = newInfo();
  if (!body) return info;
  const visit = (n) => {
    if (ts.isNewExpression(n)) {
      const nm = n.expression.getText();
      const at = `${path.relative(SRC, n.getSourceFile().fileName)}:${lineOf(n)}`;
      const tcx = tryContext(n);
      const dead = tcx.caught && !tcx.rethrows; // lancada dentro de try cujo catch nao relanca: nao chega ao cliente
      if (dead) { /* engolida */ }
      else if (EXC[nm]) addCode(info, EXC[nm], `${nm}@${at}`);
      else if (nm === 'HttpException') {
        const st = evalConst(n.arguments?.[1], ctx.info);
        addCode(info, typeof st === 'number' ? st : '?', `HttpException@${at}`);
      } else if (nm === 'Error' && n.parent && ts.isThrowStatement(n.parent) && !inTryWithCatch(n)) { addCode(info, 500, `throw new Error@${at}`); info.rawError = true; info.errAt.add(`${path.relative(SRC, n.getSourceFile().fileName)}:${lineOf(n)}`); }
      else if (/Exception$/.test(nm) && !EXC[nm]) info.unresolved.add('excecao:' + nm);
    }
    if (ts.isTryStatement(n)) {
      info.hasTry = true;
      if (n.catchClause && depth <= 1) {
        let thr = false; const scan = (x) => { if (ts.isThrowStatement(x)) thr = true; ts.forEachChild(x, scan); };
        scan(n.catchClause.block);
        if (!thr) info.swallowAt.add(`${path.relative(SRC, n.getSourceFile().fileName)}:${lineOf(n)}`);
      }
    }
    if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) {
      const t = ts.isIdentifier(n) ? n.text : n.name.text;
      if (/^(timingSafeEqual|createHmac|REFRESH_COOKIE|verifyAsync|verifyWebhook\w*|validateToken|assertAccessToken)$/.test(t)) info.authHints.add(t);
    }
    if (ts.isPropertyAccessExpression(n) && /^(file|files|parts|isMultipart|saveRequestFiles)$/.test(n.name.text) && n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n) info.upload.add(n.name.text);
    if (ts.isPropertyAccessExpression(n) && /^(status|code|redirect)$/.test(n.name.text) && /^(reply|res|response)$/.test(n.expression.getText()) && n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n) info.manualStatus = true;
    if (ts.isCallExpression(n)) handleCall(n);
    ts.forEachChild(n, visit);
  };
  const handleCall = (call) => {
    const callee = call.expression;
    const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : '';
    if (/^(assert|require|ensure|check|verify|can|has|authorize)\w*(Access|Permission|Role|Owner|Scope|Tenant|Company|Admin|Feature)\w*$/i.test(name) || /^(assertAccess|requireRole|authorize)/i.test(name)) info.perm.add(name);
    if (/^(fetch|axios)$/.test(name)) info.ext.add(name);
    // prisma: X.modelo.op()
    if (ts.isPropertyAccessExpression(callee) && ts.isPropertyAccessExpression(callee.expression)) {
      const op = callee.name.text, root = callee.expression.expression.getText();
      if (/(prisma|tx|trx|\bdb\b|client)/i.test(root)) {
        if (/^(create|createMany|upsert|update|updateMany|delete|deleteMany)$/.test(op)) { info.writes = true; info.writeAt.add(`${root}.${callee.expression.name.text}.${op} ${path.relative(SRC, call.getSourceFile().fileName)}:${lineOf(call)}`); }
        const tcp = tryContext(call);
        if (!(tcp.caught && !tcp.rethrows)) {
          if (/^(create|createMany|upsert)$/.test(op)) info.inferred.add('409*');
          if (/^(update|delete|findUniqueOrThrow|findFirstOrThrow)$/.test(op)) info.inferred.add('404*');
        }
      }
    }
    if (depth >= 8) return;
    let target = null;
    if (ts.isPropertyAccessExpression(callee)) {
      const obj = callee.expression;
      if (obj.kind === ts.SyntaxKind.ThisKeyword && ctx.decl) target = findMethodDeep(ctx.decl, callee.name.text);
      else if (ts.isPropertyAccessExpression(obj) && obj.expression.kind === ts.SyntaxKind.ThisKeyword && ctx.decl) {
        const tn = propTypeName(ctx.decl.node, obj.name.text) || inheritedPropType(ctx.decl, obj.name.text);
        if (tn) { const d = findDecl(ctx.decl.file, tn); if (d && d.kind === 'class') target = findMethodDeep(d, callee.name.text); }
        else if (/(Service|Repository|Repo|Hub|Gateway|Provider|Client)$/i.test(obj.name.text)) info.unresolved.add('this.' + obj.name.text);
      } else if (ts.isIdentifier(obj)) {
        const d = findDecl(ctx.decl ? ctx.decl.file : ctx.info.file, obj.text);
        if (d && d.kind === 'class') target = findMethodDeep(d, callee.name.text);
      }
    } else if (ts.isIdentifier(callee)) {
      const d = findDecl(ctx.decl ? ctx.decl.file : ctx.info.file, callee.text);
      if (d && d.kind === 'func') target = { member: d.node, decl: { file: d.file, kind: 'func', node: null } };
    }
    if (target) {
      const key = target.decl.file + '#' + (target.decl.node?.name?.text || 'fn') + '#' + (target.member.name?.getText?.() || lineOf(target.member));
      if (stack.has(key)) return;
      if (memo.has(key)) {
        mergeInfo(info, swallowed(call, memo.get(key)));
        return;
      }
      stack.add(key);
      const sub = analyzeNode(target.member.body || target.member.initializer?.body || target.member, { info: loadFile(target.decl.file), decl: target.decl.kind === 'class' ? target.decl : null }, depth + 1, stack);
      stack.delete(key);
      if (depth < 3) memo.set(key, sub);
      mergeInfo(info, swallowed(call, sub));
    }
  };
  visit(body);
  return info;
}

// guards
const guardCache = new Map();
function analyzeGuard(file, name) {
  const key = file + '#' + name;
  if (guardCache.has(key)) return guardCache.get(key);
  const d = findDecl(file, name);
  let res = newInfo();
  if (d && d.kind === 'class') {
    const m = findMethodDeep(d, 'canActivate');
    if (m) res = analyzeNode(m.member.body, { info: loadFile(m.decl.file), decl: m.decl }, 0, new Set());
  }
  guardCache.set(key, res);
  return res;
}

// ---------------------------------------------------------------- DTO
function dtoStatus(typeNode, file) {
  const out = { name: typeNode ? typeNode.getText() : '(sem tipo)', status: 'ok', props: 0, semValidador: [], soOpcional: [], validators: 0 };
  if (!typeNode) { out.status = 'sem-tipo'; return out; }
  if (ts.isArrayTypeNode(typeNode)) { out.status = 'array(sem-validacao)'; return out; }
  if (ts.isTypeLiteralNode(typeNode)) { out.status = 'inline(sem-validacao)'; return out; }
  if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) { out.status = 'uniao(sem-validacao)'; return out; }
  if ([ts.SyntaxKind.AnyKeyword, ts.SyntaxKind.UnknownKeyword, ts.SyntaxKind.ObjectKeyword].includes(typeNode.kind)) { out.status = 'any(sem-validacao)'; return out; }
  if ([ts.SyntaxKind.StringKeyword, ts.SyntaxKind.NumberKeyword, ts.SyntaxKind.BooleanKeyword].includes(typeNode.kind)) { out.status = 'primitivo'; return out; }
  if (!ts.isTypeReferenceNode(typeNode)) { out.status = 'outro'; return out; }
  const nm = typeNode.typeName.getText();
  if (/^(Record|Partial|Required|Readonly|Pick|Omit|Array|Map|Set|Promise|Object)$/.test(nm)) { out.status = 'utility/' + nm + '(sem-validacao)'; return out; }
  const d = findDecl(file, nm);
  if (!d) { out.status = 'nao-resolvido'; return out; }
  if (d.typeOnly) { out.status = 'import-type(sem-validacao)'; return out; }
  if (d.kind === 'interface' || d.kind === 'type') { out.status = d.kind + '(sem-validacao)'; return out; }
  if (d.kind === 'enum') { out.status = 'enum'; return out; }
  if (d.kind !== 'class') { out.status = d.kind; return out; }
  const walk = (decl, seen = 0) => {
    if (!decl || decl.kind !== 'class' || seen > 5) return;
    const info = loadFile(decl.file);
    const cvNames = new Set();
    for (const [local, imp] of info.imports) if (imp.spec === 'class-validator') cvNames.add(local);
    for (const m of decl.node.members) {
      if (!ts.isPropertyDeclaration(m)) continue;
      out.props++;
      const ds = decosOf(m).map(dinfo);
      const cv = ds.filter((x) => cvNames.has(x.name));
      const val = cv.filter((x) => !VALIDATOR_IGNORE.has(x.name));
      if (val.length) out.validators++;
      else if (cv.length) out.soOpcional.push(m.name.getText()); // so @IsOptional: passa no whitelist, mas sem checagem de tipo
      else if (!ds.some((x) => x.name === 'Allow' || x.name === 'Exclude')) out.semValidador.push(m.name.getText()); // rejeitada por forbidNonWhitelisted
    }
    const h = decl.node.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.expression;
    if (h) {
      if (ts.isIdentifier(h)) walk(findDecl(decl.file, h.text), seen + 1);
      else if (ts.isCallExpression(h)) { out.mapped = true; const a = h.arguments[0]; if (a && ts.isIdentifier(a)) walk(findDecl(decl.file, a.text), seen + 1); }
    }
  };
  walk(d);
  if (out.props === 0 && !out.mapped) out.status = 'classe-vazia';
  else if (out.validators === 0 && out.props > 0) out.status = 'classe-sem-validadores';
  else if (out.semValidador.length) out.status = 'props-sem-decorator(' + out.semValidador.length + ')';
  else if (out.soOpcional.length) out.status = 'props-so-IsOptional(' + out.soOpcional.length + ')';
  return out;
}

// ---------------------------------------------------------------- extracao
function listControllers() {
  const out = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.controller.ts')) out.push(p); } };
  walk(SRC);
  return out.sort();
}
function moduleOf(file) {
  const rel = path.relative(SRC, file).split(path.sep);
  if (rel[0] === 'modules' || rel[0] === 'common') return rel[1];
  return rel[0];
}
const normPath = (...parts) => { let p = '/' + parts.filter(Boolean).join('/'); p = p.replace(/\/+/g, '/'); if (p.length > 1) p = p.replace(/\/$/, ''); return p; };
const firstString = (n, info) => {
  if (!n) return '';
  if (ts.isArrayLiteralExpression(n)) return n.elements.map((e) => evalConst(e, info) ?? e.getText()).join('|');
  const v = evalConst(n, info);
  if (v !== undefined) return String(v);
  if (ts.isTemplateExpression(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.getText().replace(/`/g, '').replace(/\$\{([^}]+)\}/g, ':$1');
  return n.getText();
};

function fmtThrottle(d, info) {
  const o = d.args[0];
  if (!o || !ts.isObjectLiteralExpression(o)) return `Throttle(${o ? o.getText() : ''})`;
  const parts = [];
  for (const p of o.properties) {
    if (!ts.isPropertyAssignment(p)) continue;
    const lim = evalConst(objProp(p.initializer, 'limit'), info), ttl = evalConst(objProp(p.initializer, 'ttl'), info);
    const key = p.name.getText();
    parts.push(`${key === 'default' ? '' : key + ':'}${lim ?? '?'}/${typeof ttl === 'number' ? ttl / 1000 + 's' : '?'}`);
  }
  return parts.join(',');
}

const MUT = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
function extract(file) {
  const info = loadFile(file);
  const rel = path.relative(ROOT, file);
  const mod = moduleOf(file);
  const rows = [];
  for (const [cname, cnode] of info.classes) {
    const cds = decosOf(cnode).map(dinfo);
    const ctl = cds.find((d) => d.name === 'Controller');
    if (!ctl) continue;
    let prefix = '';
    const a0 = ctl.args[0];
    if (a0 && ts.isObjectLiteralExpression(a0)) prefix = firstString(objProp(a0, 'path'), info);
    else if (a0) prefix = firstString(a0, info);
    const extendsProm = cnode.heritageClauses?.some((h) => h.types.some((t) => /PrometheusController/.test(t.getText())));
    if (extendsProm && !prefix) prefix = 'metrics'; // PrometheusModule.register() usa path '/metrics' por padrao (app.module.ts:72)
    const classGuards = cds.filter((d) => d.name === 'UseGuards').flatMap((d) => d.args.map((a) => a.getText()));
    const classRolesDeco = cds.find((d) => d.name === 'Roles');
    const classSkipThrottle = cds.find((d) => d.name === 'SkipThrottle');
    const classThrottle = cds.find((d) => d.name === 'Throttle');
    const classOther = cds.filter((d) => !KNOWN_DECOS.has(d.name));
    const classDecl = { file, kind: 'class', node: cnode };

    for (const m of cnode.members) {
      if (!ts.isMethodDeclaration(m)) continue;
      const mds = decosOf(m).map(dinfo);
      const http = mds.filter((d) => HTTP_DECOS[d.name]);
      if (!http.length) continue;
      for (const h of http) {
        const verb = HTTP_DECOS[h.name];
        const sub = firstString(h.args[0], info);
        const fullPath = normPath(prefix, sub);
        const handler = m.name.getText();
        const guards = [...classGuards, ...mds.filter((d) => d.name === 'UseGuards').flatMap((d) => d.args.map((a) => a.getText()))];
        const rolesDeco = mds.find((d) => d.name === 'Roles') || classRolesDeco;
        const roles = rolesDeco ? rolesDeco.args.map((a) => String(evalConst(a, info) ?? a.getText())) : null;
        const hasJwt = guards.includes('JwtAuthGuard');
        const hasRolesGuard = guards.includes('RolesGuard');
        const others = [...classOther, ...mds.filter((d) => !KNOWN_DECOS.has(d.name))].map((d) => `@${d.name}(${d.args.map((a) => a.getText()).join(',')})`);
        const permDeco = others.filter((o) => /^@Require(Faturas)?Permission/.test(o));

        // parametros
        const params = [];
        let usesReq = null, usesRes = null, resPass = false, usesUploadedFile = false;
        const fieldOf = (d) => (d.args[0] ? evalConst(d.args[0], info) ?? d.args[0].getText() : null);
        for (const p of m.parameters) {
          for (const d of decosOf(p).map(dinfo)) {
            const pn = p.name.getText();
            if (['Body', 'Query', 'Param'].includes(d.name)) params.push({ kind: d.name.toLowerCase(), field: fieldOf(d), type: p.type, pipes: d.args.slice(1).map((x) => x.getText()) });
            else if (d.name === 'Headers') params.push({ kind: 'header', field: fieldOf(d) });
            else if (d.name === 'UploadedFile' || d.name === 'UploadedFiles') usesUploadedFile = true;
            else if (d.name === 'Req' || d.name === 'Request') usesReq = pn;
            else if (d.name === 'Res' || d.name === 'Response') { usesRes = pn; resPass = d.args.length > 0 && /passthrough\s*:\s*true/.test(d.args[0].getText()); }
          }
        }
        const bodyParams = params.filter((p) => p.kind === 'body'), queryParams = params.filter((p) => p.kind === 'query'), pathParams = params.filter((p) => p.kind === 'param');
        const dtoParts = [], dtoIssues = [];
        for (const p of [...bodyParams, ...queryParams]) {
          if (p.field) { dtoParts.push(`${p.kind}.${p.field}:${p.type ? p.type.getText() : 'string'}${p.pipes.length ? '(' + p.pipes.join(',') + ')' : ''}`); if (!p.pipes.length) dtoIssues.push({ where: p.kind, desc: `campo solto '${p.field}'`, status: 'campo-solto' }); continue; }
          const st = dtoStatus(p.type, file);
          dtoParts.push(`${p.kind}=${st.name}${st.status === 'ok' ? '' : ' [' + st.status + ((st.semValidador.length || st.soOpcional.length) ? ': ' + (st.semValidador.length ? st.semValidador : st.soOpcional).slice(0, 4).join('/') : '') + ']'}`);
          if (st.status !== 'ok') dtoIssues.push({ where: p.kind, desc: st.name, status: st.status, props: st.semValidador.length ? st.semValidador : st.soOpcional });
        }
        // API do Express usada sobre FastifyReply/FastifyRequest (nao existe: TypeError -> 500). Verificado em app isolado (ver notas).
        const expressApi = [];
        if (usesRes) {
          const rx = new RegExp(`\\b${usesRes}\\.(setHeader|set|json|attachment|sendFile|type|end|write)\\(`, 'g');
          for (const mm of m.getText().matchAll(rx)) expressApi.push(`${usesRes}.${mm[1]}()`);
          if (new RegExp(`\\.pipe\\(${usesRes}\\)`).test(m.getText())) expressApi.push(`stream.pipe(${usesRes})`);
        }
        if (mds.some((d) => d.name === 'UseInterceptors' && d.args.some((a) => /FilesInterceptor|FileInterceptor|AnyFilesInterceptor|FileFieldsInterceptor/.test(a.getText())))) expressApi.push('FileInterceptor (multer)');
        const bodyViaReq = usesReq && new RegExp(`\\b${usesReq}\\.body\\b`).test(m.getText());
        if (bodyViaReq) { dtoParts.push('body=req.body[sem-DTO]'); dtoIssues.push({ where: 'body', desc: 'req.body direto', status: 'req.body' }); }
        const paramNoPipe = pathParams.filter((p) => !p.pipes.length).map((p) => p.field);

        // analise de erros
        const an = analyzeNode(m.body, { info, decl: classDecl }, 0, new Set([cname + '#' + handler]));
        const guardCodes = new Map();
        const guardNotes = [];
        for (const g of guards) {
          if (g === 'RolesGuard' && !(roles && roles.length)) continue; // sem @Roles o RolesGuard libera
          const gi = analyzeGuard(file, g);
          for (const [c, s] of gi.codes) { if (!guardCodes.has(c)) guardCodes.set(c, new Set()); for (const x of s) guardCodes.get(c).add(g + ':' + x); }
          if (gi.rawError) guardNotes.push(`${g} lanca Error cru`);
        }
        const explicit = new Set([...an.codes.keys()].map(String));
        const codes = new Set([...explicit, ...[...guardCodes.keys()].map(String)]);
        if (hasJwt) codes.add('401');
        if (roles && roles.length && hasRolesGuard) codes.add('403');
        if ((bodyParams.length || queryParams.length) && dtoParts.some((x) => !/\[|campo|\.\w+:/.test(x))) codes.add('400');
        if (pathParams.some((p) => p.pipes.length)) codes.add('400');
        const throttleDeco = mds.find((d) => d.name === 'Throttle') || classThrottle;
        const skipThrottle = mds.find((d) => d.name === 'SkipThrottle') || classSkipThrottle;
        if (!skipThrottle) codes.add('429');
        if (paramNoPipe.length) an.inferred.add('400*'); // id invalido no Prisma -> P2023 -> 400 (filtro global)
        const inferred = [...an.inferred].filter((c) => !codes.has(c.replace('*', '')));
        const ordered = [...codes].sort((a, b) => parseInt(a) - parseInt(b));
        ordered.push('500*');

        // sucesso
        const hc = mds.find((d) => d.name === 'HttpCode');
        const hcVal = hc ? evalConst(hc.args[0], info) : undefined;
        let success = hcVal ?? (verb === 'POST' ? 201 : 200);
        if (usesRes && !resPass) success = hc ? success : 'manual(@Res)';
        else if (an.manualStatus && !hc) success = `${success}(+status manual)`;

        // acesso
        let acesso;
        const rolesTxt = roles && roles.length ? roles.join(',') : '';
        const permTxt = permDeco.map((x) => x.replace(/^@/, '')).join(',');
        if (!hasJwt) acesso = 'PUBLICO';
        else if (!roles || roles.length === 0) acesso = permTxt ? 'LOGADO+' + permTxt : 'LOGADO';
        else acesso = (hasRolesGuard ? 'ROLES:' : 'ROLES-SEM-RolesGuard:') + rolesTxt + (permTxt ? '+' + permTxt : '');
        const order = guards.indexOf('RolesGuard') >= 0 && guards.indexOf('JwtAuthGuard') >= 0 && guards.indexOf('RolesGuard') < guards.indexOf('JwtAuthGuard');

        // throttle
        let thr;
        if (skipThrottle) thr = 'SKIP';
        else if (throttleDeco) thr = fmtThrottle(throttleDeco, info);
        else thr = 'global 300/60s';
        const rl = others.find((o) => /^@RateLimit/.test(o));
        if (rl) thr += ' + ' + rl.replace('@', '') + (guards.includes('RateLimitGuard') ? '' : ' (SEM RateLimitGuard)');

        const obs = [`${rel.replace('apps/api/src/', '')}:${lineOf(m)}`];
        if (usesRes && !resPass) obs.push('usa @Res sem passthrough');
        if (expressApi.length) obs.push('API Express sobre Fastify: ' + [...new Set(expressApi)].join(', '));
        if (an.upload.size || usesUploadedFile) obs.push('upload multipart' + (usesUploadedFile ? ' (@UploadedFile/FileInterceptor = multer/Express)' : ''));
        if (an.authHints.size) obs.push('auth propria: ' + [...an.authHints].join('/'));
        const hdr = params.filter((p) => p.kind === 'header' && /token|secret|signature|authorization|access/i.test(String(p.field)));
        if (!hasJwt && hdr.length) obs.push(`header de auth proprio: ${hdr.map((p) => p.field).join(',')}`);
        if (an.perm.size) obs.push('checagem em servico: ' + [...an.perm].slice(0, 4).join('/'));
        if (others.length) obs.push('decorators: ' + others.join(' '));
        if (paramNoPipe.length) obs.push('param sem pipe: ' + paramNoPipe.join(','));
        if (inferred.length) obs.push('inferido pelo filtro: ' + inferred.join(','));
        if (an.rawError) obs.push('throw new Error -> 500 em ' + [...an.errAt].slice(0, 3).join(', '));
        if (order) obs.push('RolesGuard antes de JwtAuthGuard');
        if (guardNotes.length) obs.push(guardNotes.join('; '));
        if (an.unresolved.size) obs.push('nao resolvido: ' + [...an.unresolved].slice(0, 3).join(','));
        const origins = [...an.codes].map(([c, s]) => `${c}<-${[...s].slice(0, 2).join('/')}${s.size > 2 ? '/+' + (s.size - 2) : ''}`);
        if (origins.length) obs.push('origem: ' + origins.join(' '));
        const gorig = [...guardCodes].map(([c, s]) => `${c}<-${[...s].slice(0, 2).join('/')}`);
        if (gorig.length) obs.push('guards: ' + gorig.join(' '));

        rows.push({
          modulo: mod, controller: cname, arquivo: rel, linha: lineOf(m), metodo: verb, caminho: fullPath, handler: `${cname}.${handler}`, acesso, roles: roles && roles.length ? roles : [],
          hasJwt, hasRolesGuard, guards: guards.join('+') || '-', dto: dtoParts.join('; ') || '-', dtoIssues, sucesso: success, hcExplicit: hcVal ?? null,
          erros: [...ordered, ...inferred.sort()].join(','), explicitCodes: [...explicit], throttle: thr, throttleSkip: !!skipThrottle, throttleExplicit: !!throttleDeco,
          expressApi: [...new Set(expressApi)], swallowAt: [...an.swallowAt], writes: an.writes, writeAt: [...an.writeAt].slice(0, 4), errAt: [...an.errAt], hasTry: an.hasTry, rawError: an.rawError, upload: an.upload.size > 0 || usesUploadedFile, authHints: [...an.authHints], perm: [...an.perm], paramNoPipe,
          hasPathParam: /:/.test(fullPath), mutating: MUT.has(verb), bodyAccepted: bodyParams.length > 0 || !!bodyViaReq, pathParamCount: pathParams.length,
          orderWrong: order, observacao: obs.join(' | '),
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------- execucao
const controllers = listControllers();
const all = [];
for (const f of controllers) all.push(...extract(f));
const norm = (r) => r.metodo + ' ' + r.caminho.replace(/:[A-Za-z0-9_]+/g, ':_');
const dupMap = new Map();
for (const r of all) { const k = norm(r); (dupMap.get(k) ?? dupMap.set(k, []).get(k)).push(r); }
const dups = [...dupMap.entries()].filter(([, v]) => v.length > 1);
const scope = all.filter((r) => SCOPE.has(r.modulo));
fs.mkdirSync(path.join(OUT, 'scripts'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'scripts/01a-rotas-todas.json'), JSON.stringify(all, null, 1));

const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
const header = 'modulo;metodo;caminho;handler;acesso;guards;dto;sucesso;erros;observacao';
const csv = '﻿' + [header, ...scope.map((r) => [r.modulo, r.metodo, r.caminho, r.handler, r.acesso, r.guards, r.dto, r.sucesso, r.erros, `throttle: ${r.throttle} | ${r.observacao}`].map(q).join(';'))].join('\n') + '\n';
fs.writeFileSync(path.join(OUT, '01a-endpoints.csv'), csv);

// ---------------------------------------------------------------- relatorio (md)
const byMod = new Map();
for (const r of scope) (byMod.get(r.modulo) ?? byMod.set(r.modulo, []).get(r.modulo)).push(r);
const ref = (r) => `\`${r.arquivo.replace('apps/api/src/', '')}:${r.linha}\``;
const md = [];
const publicas = scope.filter((r) => r.acesso === 'PUBLICO');
const logados = scope.filter((r) => r.acesso.startsWith('LOGADO'));
const rolesSemGuard = scope.filter((r) => r.acesso.startsWith('ROLES-SEM'));
const comRoles = scope.filter((r) => r.acesso.startsWith('ROLES'));
md.push(`# 01a - Inventario de rotas HTTP (escopo 01a)\n`);
md.push(`Gerado por \`docs/auditoria/scripts/extrair-rotas.mjs\` (AST do TypeScript) sobre \`apps/api/src\`, somente leitura. CSV: \`docs/auditoria/01a-endpoints.csv\` (separador \`;\`, UTF-8 com BOM). Base completa (todos os ${controllers.length} controllers, ${all.length} rotas): \`docs/auditoria/scripts/01a-rotas-todas.json\`.\n`);
md.push(`## Resumo\n`);
md.push(`- Rotas no escopo 01a: **${scope.length}** (de ${all.length} em toda a API, ${controllers.length} controllers).`);
md.push(`- Publicas (sem JwtAuthGuard): **${publicas.length}**; so login (JwtAuthGuard sem @Roles): **${logados.length}**; com @Roles: **${comRoles.length}**, das quais sem RolesGuard (restricao NAO aplicada): **${rolesSemGuard.length}**.`);
md.push(`- Modulos \`mail\` e \`queue\` nao possuem controller (so servicos/workers Bull): 0 rotas. Nao existe \`app.controller\`; os controllers fora de \`modules/\` sao \`health\` e \`metrics\`.\n`);
md.push(`### Contagem por modulo\n`);
md.push('| Modulo | Rotas | Publicas | So login | Com @Roles | Mutacoes (POST/PUT/PATCH/DELETE) |\n|---|---:|---:|---:|---:|---:|');
for (const m of SCOPE) {
  const rs = byMod.get(m) ?? [];
  md.push(`| ${m} | ${rs.length} | ${rs.filter((r) => r.acesso === 'PUBLICO').length} | ${rs.filter((r) => r.acesso.startsWith('LOGADO')).length} | ${rs.filter((r) => r.acesso.startsWith('ROLES')).length} | ${rs.filter((r) => r.mutating).length} |`);
}
md.push(`| **Total** | **${scope.length}** | **${publicas.length}** | **${logados.length}** | **${comRoles.length}** | **${scope.filter((r) => r.mutating).length}** |\n`);
md.push(`Rotas por controller (escopo):\n`);
const byCtl = new Map();
for (const r of scope) byCtl.set(r.modulo + '/' + r.controller, (byCtl.get(r.modulo + '/' + r.controller) ?? 0) + 1);
md.push([...byCtl].map(([k, v]) => `\`${k}\` ${v}`).join(' · ') + '\n');

md.push(`## Premissas de roteamento e erros\n`);
md.push(`- \`main.ts\`: sem \`setGlobalPrefix\` e sem \`enableVersioning\`; caminho final = prefixo do \`@Controller\` + rota. \`/metrics\` vem de \`PrometheusModule.register({ controller: MetricsController })\` (\`app.module.ts:72\`, path padrao \`/metrics\`). Swagger em \`/api/docs\` so fora de producao (nao e rota de controller).`);
md.push(`- Pipes globais (\`main.ts\`): \`ValidationPipe({ whitelist, transform, forbidNonWhitelisted })\` => DTO invalido = 400; campo sem nenhum decorator class-validator e rejeitado (400) mesmo enviado de proposito; tipos que nao sao classe (interface, \`any\`, \`Record\`, \`import type\`) NAO sao validados.`);
md.push(`- Guards globais (\`app.module.ts:135-139\`): FeatureFlagGuard, UserThrottlerGuard (300 req/60s, chave por email/documento do corpo, token ou IP), MfaEnrollmentGuard, TenantGuard, SubscriptionActiveGuard. **JwtAuthGuard e RolesGuard NAO sao globais**: so protege quem declara \`@UseGuards(JwtAuthGuard[, RolesGuard])\`. \`@Roles\` sem \`RolesGuard\` nao restringe nada. Sem \`@Roles\` o \`RolesGuard\` libera qualquer logado.`);
md.push(`- Formato de sucesso (\`ResponseInterceptor\`): \`{ success: true, data }\` (exceto \`/metrics\`; \`PlainJsonInterceptor\` nas rotas /faturas).`);
md.push(`- Formato de erro (\`HttpExceptionFilter\`): \`{ success:false, statusCode, path, timestamp, error:{ message, code?, ... } }\`. Mapeamentos: 429 -> \`TOO_MANY_ATTEMPTS\`; Prisma P2002 -> 409 \`DUPLICATE\`, P2025 -> 404 \`NOT_FOUND\`, P2003 -> 409 \`RELATION\`, P2034 -> 409, P2000 -> 400 \`TOO_LONG\`, P2023 -> 400 \`INVALID_ID\`, PrismaClientValidationError -> 400; queda do banco (P1001/P1002/P1008/P1017/P2024, init error) -> 503 \`DB_UNAVAILABLE\`; erros Fastify 4xx (413 corpo grande, 415, JSON invalido 400) mantidos; qualquer outra excecao (inclusive \`throw new Error\`) -> **500** com \`requestId\`.`);
md.push(`- Colunas do CSV: \`erros\` = codigos explicitos (handler + servicos seguidos + guards) + 401 (JwtAuthGuard), 403 (RolesGuard com @Roles), 400 (DTO/pipe), 429 (salvo @SkipThrottle) e \`500*\`; codigos com \`*\` sao inferidos do filtro global (Prisma create/update/delete no caminho) e \`500*\` e o generico do filtro. A origem exata de cada codigo esta em \`observacao\` (\`origem:\`). O throttle e a localizacao (arquivo:linha) tambem ficam em \`observacao\`.\n`);

md.push(`## Rotas PUBLICAS (sem JwtAuthGuard) - ${publicas.length}\n`);
md.push('| Modulo | Metodo | Caminho | Handler | Arquivo | Throttle | Protecao propria |\n|---|---|---|---|---|---|---|');
// mecanismo de autenticacao proprio de cada rota publica (conferido lendo handler/servico; ver 01a-endpoints.md secao de validacao)
const PUBLIC_NOTES = {
  'GET /metrics': 'Bearer METRICS_TOKEN (timingSafeEqual); em producao sem token configurado responde 401; fora de producao e sem METRICS_TOKEN fica ABERTO',
  'GET /health/live': 'nenhuma (liveness, sem dados)', 'GET /health/ready': 'nenhuma (readiness; 503 se banco cair)', 'GET /health': 'nenhuma; expõe uptime, memoria heap e status de banco/redis',
  'GET /auth/public-plans': 'nenhuma (catalogo publico)', 'POST /auth/public-plans/quote': 'nenhuma (simulacao)',
  'POST /auth/register-company': 'Turnstile (so se TURNSTILE_SECRET_KEY existir)', 'POST /auth/login': 'Turnstile (idem) + senha/MFA',
  'POST /auth/mfa/verify': 'mfaToken (JWT do desafio) no corpo + codigo TOTP/recuperacao', 'POST /auth/refresh': 'cookie httpOnly irh_rt', 'POST /auth/logout': 'cookie irh_rt (sem cookie apenas limpa)',
  'POST /auth/verify-email': 'JWT de verificacao (purpose email) no corpo', 'POST /auth/password-reset/request': 'Turnstile + honeypot `website`',
  'POST /auth/password-reset/validate-code': 'codigo enviado por e-mail', 'POST /auth/password-reset/confirm': 'JWT de redefinicao (emitido apos validate-code)',
  'POST /finance/webhook/asaas': 'header asaas-access-token (timingSafeEqual com ASAAS_WEBHOOK_TOKEN); rejeita 403 se nao configurado',
  'POST /finance/webhook/mercadopago': 'header x-signature (HMAC) + reconsulta do pagamento na API do MP',
  'POST /support/public/tickets': 'somente honeypot `website` + throttle 5/min; SEM Turnstile', 'POST /support/public/password-reset': 'somente honeypot `website` + throttle 5/min; SEM Turnstile',
};
for (const r of publicas) {
  const prot = [PUBLIC_NOTES[r.metodo + ' ' + r.caminho] ?? 'NAO CLASSIFICADA'];
  if (/TurnstileGuard/.test(r.guards) && !/Turnstile/.test(prot[0])) prot.push('Turnstile');
  md.push(`| ${r.modulo} | ${r.metodo} | \`${r.caminho}\` | ${r.handler.split('.')[1]} | ${ref(r)} | ${r.throttle} | ${prot.join('; ')} |`);
}
md.push('');
md.push(`## Rotas sem @Roles (qualquer usuario logado) - ${logados.length}\n`);
md.push('So `JwtAuthGuard` (ou permissao por decorator proprio). A autorizacao real, quando existe, esta no servico (coluna "Checagem em servico" = funcoes assert/require/check encontradas no caminho).\n');
md.push('| Modulo | Metodo | Caminho | Handler | Arquivo | Acesso | Checagem em servico |\n|---|---|---|---|---|---|---|');
for (const r of logados) md.push(`| ${r.modulo} | ${r.metodo} | \`${r.caminho}\` | ${r.handler.split('.')[1]} | ${ref(r)} | ${r.acesso} | ${r.perm.slice(0, 3).join(', ') || '-'} |`);
md.push('');
if (rolesSemGuard.length) {
  md.push(`## @Roles sem RolesGuard (restricao nao aplicada) - ${rolesSemGuard.length}\n`);
  md.push('| Metodo | Caminho | Handler | Arquivo | Roles |\n|---|---|---|---|---|');
  for (const r of rolesSemGuard) md.push(`| ${r.metodo} | \`${r.caminho}\` | ${r.handler} | ${ref(r)} | ${r.roles.join(',')} |`);
  md.push('');
}

const weak = (i) => /^props-so-IsOptional/.test(i.status);
const semDto = scope.filter((r) => r.mutating && r.dtoIssues.some((i) => i.where === 'body' && !weak(i)));
md.push(`## Rotas que mudam dados com corpo sem DTO validado - ${semDto.length}\n`);
md.push('Corpo tipado como interface/`any`/`Record`/inline/`import type`/array, classe sem validadores, `@Body(\'campo\')` solto ou `req.body` direto: o `ValidationPipe` nao valida (ou, para classe com propriedades sem decorator, rejeita o campo).\n');
md.push('| Metodo | Caminho | Handler | Arquivo | Problema |\n|---|---|---|---|---|');
const issueTxt = (r, where, strict = true) => r.dtoIssues.filter((i) => i.where === where && (!strict || !weak(i))).map((i) => `${i.desc} [${i.status}${i.props?.length ? ': ' + i.props.slice(0, 4).join('/') : ''}]`).join('; ');
for (const r of semDto) md.push(`| ${r.metodo} | \`${r.caminho}\` | ${r.handler.split('.')[1]} | ${ref(r)} | ${issueTxt(r, 'body')} |`);
md.push('');
const semiDto = scope.filter((r) => r.mutating && r.dtoIssues.some((i) => i.where === 'body' && weak(i)));
md.push(`### Mutacoes com DTO parcialmente validado (propriedades so com @IsOptional, aceitam qualquer tipo) - ${semiDto.length}\n`);
md.push('A propriedade passa no whitelist, mas o `ValidationPipe` nao confere tipo/limite; a validacao, se existir, esta no servico/controller.\n');
for (const r of semiDto) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)}: ${issueTxt(r, 'body', false)}`);
md.push('');
const qIssues = scope.filter((r) => r.dtoIssues.some((i) => i.where === 'query'));
md.push(`### Query sem DTO validado (todos os verbos) - ${qIssues.length}\n`);
md.push('| Metodo | Caminho | Arquivo | Problema |\n|---|---|---|---|');
for (const r of qIssues) md.push(`| ${r.metodo} | \`${r.caminho}\` | ${ref(r)} | ${issueTxt(r, 'query')} |`);
md.push('');
const dtoPropsSemDec = scope.filter((r) => r.dtoIssues.some((i) => /^props-sem-decorator/.test(i.status)));
md.push(`### DTOs com propriedades SEM nenhum decorator class-validator (rejeitadas por whitelist+forbidNonWhitelisted, 400) - ${dtoPropsSemDec.length} rotas\n`);
for (const r of dtoPropsSemDec) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)}: ${r.dtoIssues.filter((i) => /^props-sem-decorator/.test(i.status)).map((i) => `${i.desc} (${i.props.join(', ')})`).join('; ')}`);
md.push('');

const isSensitive = (r) => /\/(login|register|register-company|forgot|reset|password|recover|validate-reset|verify|mfa|refresh|webhook|invite|accept|public|checkout|token)/i.test(r.caminho) || r.upload;
const semThr = scope.filter((r) => r.metodo !== 'GET' && !r.throttleExplicit && isSensitive(r));
md.push(`## Rotas sensiveis sem throttling proprio - ${semThr.length}\n`);
md.push('Sensiveis = login/cadastro/senha/MFA/verificacao/webhook/upload/publicas (nao-GET). "global" = apenas o limite de 300 req/60s do `UserThrottlerGuard`; "SKIP" = sem nenhum limite.\n');
md.push('| Metodo | Caminho | Handler | Arquivo | Throttle atual | Acesso |\n|---|---|---|---|---|---|');
for (const r of semThr) md.push(`| ${r.metodo} | \`${r.caminho}\` | ${r.handler.split('.')[1]} | ${ref(r)} | ${r.throttle} | ${r.acesso} |`);
md.push('');
const skips = scope.filter((r) => r.throttleSkip);
md.push(`### Rotas com @SkipThrottle - ${skips.length}\n`);
for (const r of skips) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)} (${r.acesso})`);
md.push('');
const pubNoThr = publicas.filter((r) => !r.throttleExplicit);
md.push(`### Publicas sem @Throttle proprio (so limite global) - ${pubNoThr.length}\n`);
for (const r of pubNoThr) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)} -> ${r.throttle}`);
md.push('');

md.push(`## Inconsistencias\n`);
const inc = [];
for (const r of all) {
  const h = r.handler.split('.')[1];
  const add = (t, d) => inc.push({ tipo: t, r, d, inScope: SCOPE.has(r.modulo) });
  if (r.metodo === 'GET' && r.writes) add('GET com escrita no banco', 'escreve em: ' + r.writeAt.slice(0, 2).join('; '));
  if (r.metodo === 'GET' && /^(create|delete|remove|update|send|approve|reject|cancel|generate|sync|process|reset|revoke|activate|close|resolve|register|confirm)/i.test(h)) add('GET com nome de mutacao', h);
  if (r.metodo === 'POST' && r.hcExplicit === 200 && /^(create|add|register|criar|novo)/i.test(h)) add('criacao com 200', h);
  if (r.metodo !== 'POST' && r.hcExplicit === 201) add('HttpCode 201 em verbo nao-POST', r.metodo);
  if (r.metodo === 'GET' && r.hcExplicit && r.hcExplicit !== 200) add('GET com HttpCode diferente de 200', String(r.hcExplicit));
  if (r.metodo === 'POST' && !r.hcExplicit && /^(login|verify|validate|check|search|list|get|find|query|quote|calculate|preview|simulate|logout|revoke|export|download|test)/i.test(h)) add('POST de leitura/acao sem HttpCode (devolve 201)', h);
  if (r.metodo !== 'DELETE' && /^(delete|remove|excluir)/i.test(h)) add('handler de exclusao em verbo ' + r.metodo, h);
  if (r.metodo !== 'POST' && /^(create|criar)/i.test(h)) add('handler de criacao em verbo ' + r.metodo, h);
  if (r.hcExplicit === 204) add('HttpCode 204 (corpo omitido; confirmar que o front nao le data)', h);
  if (r.orderWrong) add('RolesGuard antes de JwtAuthGuard (request.user ainda indefinido)', r.guards);
  if (r.expressApi.length) add('API do Express sobre Fastify (TypeError -> 500)', [...r.expressApi].join(', '));
  if (/SEM RateLimitGuard/.test(r.throttle)) add('@RateLimit sem RateLimitGuard (nao tem efeito)', r.throttle);
}
const grouped = new Map();
for (const i of inc) (grouped.get(i.tipo) ?? grouped.set(i.tipo, []).get(i.tipo)).push(i);
md.push('### Status code / verbo (toda a API; marcado [escopo] quando no escopo 01a)\n');
if (!grouped.size) md.push('Nenhuma ocorrencia pelas heuristicas.\n');
for (const [t, list] of grouped) {
  md.push(`**${t}** - ${list.length}`);
  for (const i of list) md.push(`- ${i.inScope ? '[escopo] ' : ''}${i.r.metodo} \`${i.r.caminho}\` ${ref(i.r)} (${i.d})`);
  md.push('');
}
md.push(`### Rotas duplicadas (mesmo verbo + caminho, parametros normalizados) - ${dups.length}\n`);
if (!dups.length) md.push('Nenhuma.\n');
for (const [k, v] of dups) md.push(`- \`${k}\`: ${v.map(ref).join(' e ')}`);
md.push('');
const ctlMap = new Map();
for (const r of all) (ctlMap.get(r.arquivo) ?? ctlMap.set(r.arquivo, []).get(r.arquivo)).push(r);
md.push(`### Controllers sem nenhum JwtAuthGuard (100% publicos) e controllers mistos\n`);
const noGuardCtl = [], mixedCtl = [];
for (const [f, rs] of ctlMap) {
  const pub = rs.filter((r) => !r.hasJwt).length;
  if (pub === rs.length) noGuardCtl.push([f, rs]); else if (pub > 0) mixedCtl.push([f, rs, pub]);
}
md.push('**Sem guard em nenhuma rota:**\n');
for (const [f, rs] of noGuardCtl) md.push(`- ${SCOPE.has(rs[0].modulo) ? '[escopo] ' : ''}\`${f.replace('apps/api/src/', '')}\` (${rs.length} rotas): ${rs.map((r) => r.metodo + ' ' + r.caminho).join(', ')}`);
md.push('\n**Mistos (rotas publicas no meio de rotas protegidas):**\n');
for (const [f, rs, pub] of mixedCtl) md.push(`- ${SCOPE.has(rs[0].modulo) ? '[escopo] ' : ''}\`${f.replace('apps/api/src/', '')}\`: ${pub} publicas de ${rs.length} -> ${rs.filter((r) => !r.hasJwt).map((r) => r.metodo + ' ' + r.caminho).join(', ')}`);
md.push('');
const raw = scope.filter((r) => r.rawError);
md.push(`### Handlers que podem estourar 500 por \`throw new Error\` (sem HttpException) - ${raw.length}\n`);
for (const r of raw) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)}`);
md.push('');
const swallow = scope.filter((r) => r.swallowAt.length && r.mutating);
md.push(`### Mutacoes cujo handler/servico direto tem try/catch que NAO relanca (erro engolido: o cliente recebe 2xx mesmo com falha) - ${swallow.length}\n`);
md.push('Candidatas: confira se o catch so faz log de efeito colateral (ok) ou esconde falha da operacao principal (problema).\n');
for (const r of swallow) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)} -> catch em ${r.swallowAt.map((x) => '\`' + x + '\`').join(', ')}`);
md.push('');
const notFound = scope.filter((r) => r.metodo === 'GET' && r.hasPathParam && !r.explicitCodes.includes('404') && !r.rawError);
md.push(`### GET com :param sem 404 explicito no caminho do handler (candidatos a devolver 200 com dado vazio) - ${notFound.length}\n`);
md.push('Heuristica: nenhum `NotFoundException`/`HttpException(404)` encontrado seguindo o servico. Conferir se a rota devolve lista (filtro) ou recurso unico.\n');
for (const r of notFound) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)}`);
md.push('');
const noHandling = scope.filter((r) => r.mutating && r.explicitCodes.length === 0 && !r.hasTry && r.pathParamCount > 0);
md.push(`### Mutacoes com :param sem nenhuma excecao explicita e sem try/catch no caminho (dependem so do filtro global/Prisma) - ${noHandling.length}\n`);
for (const r of noHandling) md.push(`- ${r.metodo} \`${r.caminho}\` ${ref(r)} (${r.erros})`);
md.push('');

const notes = path.join(OUT, 'scripts/01a-notas-manuais.md');
if (fs.existsSync(notes)) md.push(fs.readFileSync(notes, 'utf8'));
fs.writeFileSync(path.join(OUT, '01a-endpoints.md'), md.join('\n') + '\n');

console.log(JSON.stringify({ controllers: controllers.length, totalRotas: all.length, escopo: scope.length, publicas: publicas.length, logados: logados.length, comRoles: comRoles.length, rolesSemGuard: rolesSemGuard.length, duplicadas: dups.length, semDto: semDto.length, semThrottle: semThr.length }));
