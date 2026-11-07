import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import userApi from '../../services/api/user.api.js';
import productApi from '../../services/api/product.api.js';
import testData from '../../data/test-data.js';
import { checkStatus } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';

const updateDuration = new Trend('scenario_update_duration', true);
const updateSuccessRate = new Rate('scenario_update_success_rate');

export function runUpdateScenario() {
  const start = Date.now();
  let success = true;

  group('Scenario: Update Resources', () => {
    // 1. Create a transient user to update (ensures isolation)
    const initialUser = testData.factories.user.create();
    const createdUser = userApi.createUser(initialUser, true);

    if (createdUser.success && createdUser.id) {
      randomSleep(0.5, 1.0);
      const updatePayload = testData.factories.user.update(initialUser);
      const updateRes = userApi.updateUser(createdUser.id, updatePayload);
      const updateOk = checkStatus(updateRes, [200, 204], 'scenario_update_user');
      success = success && updateOk;
    }

    // 2. Create a transient product to update
    const initialProduct = testData.factories.product.create();
    const createdProduct = productApi.createProduct(initialProduct, true);

    if (createdProduct.success && createdProduct.id) {
      randomSleep(0.5, 1.0);
      const updateProdPayload = testData.factories.product.update(initialProduct);
      const updateProdRes = productApi.updateProduct(createdProduct.id, updateProdPayload);
      const updateProdOk = checkStatus(updateProdRes, [200, 204], 'scenario_update_product');
      success = success && updateProdOk;
    }
  });

  updateDuration.add(Date.now() - start);
  updateSuccessRate.add(success ? 1 : 0);
  return success;
}

export default runUpdateScenario;
