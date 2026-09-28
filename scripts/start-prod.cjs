const path = require('node:path');
process.env.NODE_ENV = 'production';
require(path.resolve(__dirname, '..', 'dist', 'server.cjs'));
