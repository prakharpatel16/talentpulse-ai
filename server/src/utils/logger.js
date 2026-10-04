const pino = require('pino');
const { NODE_ENV } = require('../config/env');

const logger = pino({
  level: NODE_ENV === 'development' ? 'debug' : 'info',
  transport: NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

module.exports = logger;
