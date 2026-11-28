// Read-only HTTP load probe. Start small on a staging environment identical to VPS.
// node scripts/test/candidate-load.cjs --url=http://127.0.0.1:3333 --users=5 --rounds=10
// Optional --tokens-file points to a JSON array of staging candidate tokens.
// Never prints tokens, response bodies, query strings or candidate data.
const fs = require('node:fs');
const arg = key => process.argv.find(value => value.startsWith(`--${key}=`))?.slice(key.length + 3);
const base = new URL(arg('url') || 'http://127.0.0.1:3333');
const users = Number(arg('users') || 5), rounds = Number(arg('rounds') || 10);
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || !Number.isInteger(users) || users < 1 || users > 200 || !Number.isInteger(rounds) || rounds < 1 || rounds > 1000) throw new Error('Use a valid URL, users 1..200 and rounds 1..1000.');
const tokens = arg('tokens-file') ? JSON.parse(fs.readFileSync(arg('tokens-file'), 'utf8')) : [];
if (!Array.isArray(tokens) || tokens.some(token => typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) || (tokens.length && tokens.length < users)) throw new Error('Provide one distinct staging candidate token per user.');
if (new Set(tokens).size !== tokens.length) throw new Error('Use distinct sessions for distinct users.');
const durations = [], statuses = {}; let failures = 0;
(async () => {
  const start = performance.now();
  await Promise.all(Array.from({ length: users }, async (_, user) => {
    for (let n = 0; n < rounds; n++) {
      const route = tokens.length ? ['/candidate-portal/me', '/candidate-portal/assessments', '/candidate-portal/applications'][n % 3] : ['/health/live', '/public/jobs'][n % 2];
      const began = performance.now();
      try {
        const response = await fetch(new URL(route, base), { headers: tokens.length ? { Authorization: `Bearer ${tokens[user]}` } : {}, signal: AbortSignal.timeout(10000) });
        await response.arrayBuffer(); statuses[response.status] = (statuses[response.status] || 0) + 1;
        if (!response.ok) failures++;
      } catch { failures++; statuses.NETWORK = (statuses.NETWORK || 0) + 1; }
      durations.push(performance.now() - began);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }));
  durations.sort((a, b) => a - b);
  console.log(JSON.stringify({ target: base.origin, concurrentUsers: users, authenticated: Boolean(tokens.length), requests: durations.length, statuses, failures, durationSeconds: (performance.now() - start) / 1000, p95Ms: durations[Math.floor(durations.length * .95)], p99Ms: durations[Math.min(durations.length - 1, Math.floor(durations.length * .99))] }, null, 2));
  if (failures || durations[Math.floor(durations.length * .95)] > 2000) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
