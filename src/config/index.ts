import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    url: string;
  };
  logging: {
    level: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    url: string;
  };
  bullmq: {
    workflowRunQueueName: string;
  };
}

const getEnvironmentVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required but not defined`);
  }
  return value || defaultValue || '';
};

export const config: Config = {
  port: parseInt(getEnvironmentVariable('PORT', '3000'), 10),
  nodeEnv: getEnvironmentVariable('NODE_ENV', 'development'),
  isDevelopment: getEnvironmentVariable('NODE_ENV', 'development') === 'development',
  isProduction: getEnvironmentVariable('NODE_ENV', 'development') === 'production',
  database: {
    host: getEnvironmentVariable('POSTGRES_HOST', 'localhost'),
    port: parseInt(getEnvironmentVariable('POSTGRES_PORT', '5432'), 10),
    user: getEnvironmentVariable('POSTGRES_USER', 'postgres'),
    password: getEnvironmentVariable('POSTGRES_PASSWORD', 'postgres'),
    database: getEnvironmentVariable('POSTGRES_DB', 'workflow_db'),
    url: getEnvironmentVariable(
      'DATABASE_URL',
      'postgres://postgres:postgres@localhost:5432/workflow_db'
    ),
  },
  logging: {
    level: getEnvironmentVariable('LOG_LEVEL', 'info'),
  },
  jwt: {
    secret: getEnvironmentVariable('JWT_SECRET', 'your-secret-key-change-in-production'),
    expiresIn: getEnvironmentVariable('JWT_EXPIRES_IN', '24h'),
  },
  redis: {
    host: getEnvironmentVariable('REDIS_HOST', 'localhost'),
    port: parseInt(getEnvironmentVariable('REDIS_PORT', '6379'), 10),
    password: getEnvironmentVariable('REDIS_PASSWORD', ''),
    db: parseInt(getEnvironmentVariable('REDIS_DB', '0'), 10),
    url: getEnvironmentVariable('REDIS_URL', 'redis://localhost:6379'),
  },
  bullmq: {
    workflowRunQueueName: getEnvironmentVariable(
      'WORKFLOW_RUN_QUEUE_NAME',
      'workflow-runs'
    ),
  },
};

// Log configuration on startup (without sensitive data)
if (config.isDevelopment) {
  console.log('[Config] Environment:', {
    NODE_ENV: config.nodeEnv,
    PORT: config.port,
    DATABASE_HOST: config.database.host,
    DATABASE_PORT: config.database.port,
    DATABASE_NAME: config.database.database,
    REDIS_HOST: config.redis.host,
    REDIS_PORT: config.redis.port,
    LOG_LEVEL: config.logging.level,
  });
}
