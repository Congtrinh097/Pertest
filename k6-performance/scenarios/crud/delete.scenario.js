import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import userApi from '../../services/api/user.api.js';
import productApi from '../../services/api/product.api.js';
import testData from '../../data/test-data.js';
import { checkStatus } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';

const deleteDuration = new Trend('scenario_delete_duration', true);
const deleteSuccessRate = new Rate('scenario_delete_success_rate');

export function runDeleteScenario() {
  const start = Date.now();
  let success = true;

  group('Scenario: Delete Resources', () => {
    // 1. Create and delete user
    const userPayload = testData.factories.user.create();
    const createdUser = userApi.createUser(userPayload, false);

    if (createdUser.success && createdUser.id) {
      randomSleep(0.5, 1.0);
      const delUserRes = userApi.deleteUser(createdUser.id);
      const delUserOk = checkStatus(delUserRes, [200, 202, 204], 'scenario_delete_user');
      success = success && delUserOk;
    }

    // 2. Create and delete product
    const prodPayload = testData.factories.product.create();
    const createdProd = productApi.createProduct(prodPayload, false);

    if (createdProd.success && createdProd.id) {
      randomSleep(0.5, 1.0);
      const delProdRes = productApi.deleteProduct(createdProd.id);
      const delProdOk = checkStatus(delProdRes, [200, 202, 204], 'scenario_delete_product');
      success = success && delProdOk;
    }
  });

  deleteDuration.add(Date.now() - start);
  deleteSuccessRate.add(success ? 1 : 0);
  return success;
}

export default runDeleteScenario;
