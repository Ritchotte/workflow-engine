import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.logging.level,
  base: {
    service: 'workflow-engine',
    env: config.nodeEnv,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'password',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
});
