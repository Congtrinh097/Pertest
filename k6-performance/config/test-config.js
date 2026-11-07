/**
 * Dynamic Test Configuration Loader
 * Resolves environment configuration by evaluating __ENV.ENV or __ENV.TARGET_ENV.
 * Overridable via CLI parameters: e.g. -e ENV=staging -e BASE_URL=https://custom-url.com
 * Never relies on Node.js-specific global objects; uses K6 __ENV exclusively.
 */

const devConfig = JSON.parse(open('./environments/dev.json'));
const stagingConfig = JSON.parse(open('./environments/staging.json'));
const productionConfig = JSON.parse(open('./environments/production.json'));

const envMap = {
  dev: devConfig,
  development: devConfig,
  staging: stagingConfig,
  prod: productionConfig,
  production: productionConfig,
};

export function getEnvironmentConfig() {
  const targetEnv = (__ENV.ENV || __ENV.TARGET_ENV || 'dev').toLowerCase();
  const baseConfig = envMap[targetEnv] || devConfig;

  // Workload distribution configuration
  const weightGet = parseInt(__ENV.WEIGHT_GET || '70', 10);
  const weightPost = parseInt(__ENV.WEIGHT_POST || '15', 10);
  const weightPut = parseInt(__ENV.WEIGHT_PUT || '10', 10);
  const weightDelete = parseInt(__ENV.WEIGHT_DELETE || '5', 10);

  return {
    ...baseConfig,
    environment: targetEnv,
    baseUrl: __ENV.BASE_URL || baseConfig.baseUrl,
    timeout: __ENV.REQUEST_TIMEOUT || __ENV.TIMEOUT || baseConfig.timeout || '15s',
    mockMode: __ENV.MOCK_MODE !== undefined 
      ? __ENV.MOCK_MODE === 'true' 
      : Boolean(baseConfig.mockMode),
    auth: {
      ...baseConfig.auth,
      directToken: __ENV.AUTH_TOKEN || null,
      defaultUsername: __ENV.USERNAME || __ENV.AUTH_USERNAME || baseConfig.auth?.defaultUsername,
      defaultPassword: __ENV.PASSWORD || __ENV.AUTH_PASSWORD || baseConfig.auth?.defaultPassword,
    },
    cleanupEnabled: __ENV.CLEANUP_ENABLED !== undefined 
      ? __ENV.CLEANUP_ENABLED === 'true' 
      : true,
    workload: {
      mode: __ENV.WORKLOAD_MODE || 'mixed', // 'mixed' | 'workflow' | 'individual'
      weights: {
        get: weightGet,
        post: weightPost,
        put: weightPut,
        delete: weightDelete,
      },
    },
  };
}

export const activeConfig = getEnvironmentConfig();
export default activeConfig;
