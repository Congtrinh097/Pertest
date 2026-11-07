import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import userApi from '../../services/api/user.api.js';
import productApi from '../../services/api/product.api.js';
import testData from '../../data/test-data.js';
import { checkStatus } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';

const readDuration = new Trend('scenario_read_duration', true);
const readSuccessRate = new Rate('scenario_read_success_rate');

export function runReadScenario() {
  const start = Date.now();
  let success = true;

  group('Scenario: Read Resources', () => {
    // 1. List Users
    const usersListRes = userApi.listUsers(1, 10);
    const usersListOk = checkStatus(usersListRes, [200, 204], 'scenario_read_user_list');

    randomSleep(0.5, 1.0);

    // 2. Read Single User by ID
    const seedUser = testData.fixtures.getRandomUser();
    const targetUserId = seedUser ? seedUser.id : 1;
    const userDetailRes = userApi.getUserById(targetUserId);
    const userDetailOk = checkStatus(userDetailRes, [200, 204], 'scenario_read_user_detail');

    randomSleep(0.5, 1.0);

    // 3. List Products
    const productListRes = productApi.listProducts({ page: 1, limit: 10 });
    const productListOk = checkStatus(productListRes, [200, 204], 'scenario_read_product_list');

    // 4. Read Single Product by ID
    const seedProduct = testData.fixtures.getRandomProduct();
    const targetProdId = seedProduct ? seedProduct.id : 101;
    const prodDetailRes = productApi.getProductById(targetProdId);
    const prodDetailOk = checkStatus(prodDetailRes, [200, 204], 'scenario_read_product_detail');

    success = usersListOk && userDetailOk && productListOk && prodDetailOk;
  });

  readDuration.add(Date.now() - start);
  readSuccessRate.add(success ? 1 : 0);
  return success;
}

export default runReadScenario;
