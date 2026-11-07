import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import userApi from '../../services/api/user.api.js';
import testData from '../../data/test-data.js';
import { checkStatus } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';

const fullCrudDuration = new Trend('scenario_full_crud_duration', true);
const fullCrudSuccessRate = new Rate('scenario_full_crud_success_rate');

/**
 * Full End-to-End CRUD Lifecycle Scenario
 * 1. Create Resource
 * 2. Read Resource by ID
 * 3. Update Resource
 * 4. Read again to verify state
 * 5. Delete Resource
 */
export function runFullCrudScenario() {
  const start = Date.now();
  let stepSuccess = true;

  group('Scenario: Full CRUD Lifecycle', () => {
    // 1. CREATE
    const initialPayload = testData.factories.user.create();
    const createResult = userApi.createUser(initialPayload, false);
    const createdId = createResult.id;
    stepSuccess = stepSuccess && checkStatus(createResult.response, [200, 201], 'full_crud_create');

    randomSleep(0.5, 1.0);

    if (createdId) {
      // 2. READ
      const getRes = userApi.getUserById(createdId);
      stepSuccess = stepSuccess && checkStatus(getRes, [200, 204], 'full_crud_read_initial');

      randomSleep(0.5, 1.0);

      // 3. UPDATE
      const updatePayload = testData.factories.user.update(initialPayload);
      const updateRes = userApi.updateUser(createdId, updatePayload);
      stepSuccess = stepSuccess && checkStatus(updateRes, [200, 204], 'full_crud_update');

      randomSleep(0.5, 1.0);

      // 4. READ VERIFICATION
      const verifyRes = userApi.getUserById(createdId);
      stepSuccess = stepSuccess && checkStatus(verifyRes, [200, 204], 'full_crud_read_verified');

      randomSleep(0.5, 1.0);

      // 5. DELETE
      const deleteRes = userApi.deleteUser(createdId);
      stepSuccess = stepSuccess && checkStatus(deleteRes, [200, 202, 204], 'full_crud_delete');
    }
  });

  fullCrudDuration.add(Date.now() - start);
  fullCrudSuccessRate.add(stepSuccess ? 1 : 0);
  return stepSuccess;
}

export default runFullCrudScenario;
