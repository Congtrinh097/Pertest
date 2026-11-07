import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import userApi from '../../services/api/user.api.js';
import productApi from '../../services/api/product.api.js';
import testData from '../../data/test-data.js';
import { checkStatus } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';

const createDuration = new Trend('scenario_create_duration', true);
const createSuccessRate = new Rate('scenario_create_success_rate');

export function runCreateScenario() {
  const start = Date.now();
  let success = true;

  group('Scenario: Create Resources', () => {
    // 1. Create User
    const userPayload = testData.factories.user.create();
    const userResult = userApi.createUser(userPayload, true);
    const userOk = checkStatus(userResult.response, [200, 201], 'scenario_create_user');

    randomSleep(0.5, 1.5);

    // 2. Create Product
    const productPayload = testData.factories.product.create();
    const productResult = productApi.createProduct(productPayload, true);
    const productOk = checkStatus(productResult.response, [200, 201], 'scenario_create_product');

    success = userOk && productOk;
  });

  createDuration.add(Date.now() - start);
  createSuccessRate.add(success ? 1 : 0);
  return success;
}

export default runCreateScenario;
