import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, service, correlationId, ...rest }) => {
    const svc = service ? `[${service}]` : '';
    const cid = correlationId ? `(${correlationId})` : '';
    const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    return `${timestamp} ${level} ${svc}${cid} ${message}${extra}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: config.nodeEnv === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.Console(),
  ],
});
