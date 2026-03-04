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
};

// Log configuration on startup (without sensitive data)
if (config.isDevelopment) {
  console.log('[Config] Environment:', {
    NODE_ENV: config.nodeEnv,
    PORT: config.port,
    DATABASE_HOST: config.database.host,
    DATABASE_PORT: config.database.port,
    DATABASE_NAME: config.database.database,
    LOG_LEVEL: config.logging.level,
  });
}
