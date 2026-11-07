import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import authApi from '../../services/api/auth.api.js';
import userApi from '../../services/api/user.api.js';
import testData from '../../data/test-data.js';
import { checkStatus } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';
import { cleanupRegistry } from '../../utils/cleanup.js';

const userMgmtDuration = new Trend('scenario_user_mgmt_duration', true);
const userMgmtSuccessRate = new Rate('scenario_user_mgmt_success_rate');

/**
 * User Management Workflow Scenario
 * Simulates administrator managing employees/users in a corporate portal.
 */
export function runUserManagementScenario() {
  const start = Date.now();
  let completed = true;

  group('Scenario: User Management Flow', () => {
    // 1. Admin logs in
    const loginRes = authApi.login();
    completed = completed && checkStatus(loginRes.response, [200, 201], 'user_mgmt_login');
    randomSleep(1, 2);

    // 2. View user directory / team page
    const listRes = userApi.listUsers(1, 25);
    completed = completed && checkStatus(listRes, [200, 204], 'user_mgmt_list');
    randomSleep(1, 2);

    // 3. Onboard new member
    const newUserPayload = testData.factories.user.create();
    const createResult = userApi.createUser(newUserPayload, true);
    completed = completed && checkStatus(createResult.response, [200, 201], 'user_mgmt_onboard');
    randomSleep(1, 2);

    // 4. Update member permissions/role
    if (createResult.id) {
      const updatePayload = testData.factories.user.update(newUserPayload, { role: 'editor' });
      const updateRes = userApi.updateUser(createResult.id, updatePayload);
      completed = completed && checkStatus(updateRes, [200, 204], 'user_mgmt_update_role');
      randomSleep(1, 2);
    }

    // 5. Cleanup transient test accounts
    cleanupRegistry.cleanupAll();
  });

  userMgmtDuration.add(Date.now() - start);
  userMgmtSuccessRate.add(completed ? 1 : 0);
  return completed;
}

export default runUserManagementScenario;
