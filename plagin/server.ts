import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'Axis Lab Pro Backend Active', port: 3000 }));
});

server.listen(3000, () => {
  console.log('Axis Lab Pro server running on http://localhost:3000');
});