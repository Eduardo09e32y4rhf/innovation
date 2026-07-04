const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/users',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer innovation-rh-connect-local-session'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
});
req.on('error', e => console.error('Error:', e));
req.end();
