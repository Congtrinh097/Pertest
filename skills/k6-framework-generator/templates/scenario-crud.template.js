import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { checkStatus } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';

const fullCrudDuration = new Trend('scenario_full_crud_duration', true);
const fullCrudSuccessRate = new Rate('scenario_full_crud_success_rate');

/**
 * Full Atomic CRUD Lifecycle Scenario Template
 * 1. Create -> 2. Read -> 3. Update -> 4. Read Verified -> 5. Delete
 */
export function runFullCrudScenario(apiService, dataFactory) {
  const start = Date.now();
  let stepSuccess = true;

  group('Scenario: Full CRUD Lifecycle', () => {
    // 1. CREATE
    const initialPayload = dataFactory.create();
    const createResult = apiService.create(initialPayload, false);
    const createdId = createResult.id;
    stepSuccess = stepSuccess && checkStatus(createResult.response, [200, 201], 'full_crud_create');

    randomSleep(0.5, 1.0);

    if (createdId) {
      // 2. READ INITIAL
      const getRes = apiService.getById(createdId);
      stepSuccess = stepSuccess && checkStatus(getRes, [200, 204], 'full_crud_read_initial');

      randomSleep(0.5, 1.0);

      // 3. UPDATE
      const updatePayload = dataFactory.update(initialPayload);
      const updateRes = apiService.update(createdId, updatePayload);
      stepSuccess = stepSuccess && checkStatus(updateRes, [200, 204], 'full_crud_update');

      randomSleep(0.5, 1.0);

      // 4. READ VERIFICATION
      const verifyRes = apiService.getById(createdId);
      stepSuccess = stepSuccess && checkStatus(verifyRes, [200, 204], 'full_crud_read_verified');

      randomSleep(0.5, 1.0);

      // 5. DELETE
      const deleteRes = apiService.delete(createdId);
      stepSuccess = stepSuccess && checkStatus(deleteRes, [200, 202, 204], 'full_crud_delete');
    }
  });

  fullCrudDuration.add(Date.now() - start);
  fullCrudSuccessRate.add(stepSuccess ? 1 : 0);
  return stepSuccess;
}

export default runFullCrudScenario;
