import { group } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import authApi from '../api/auth.api.js';
import productApi from '../api/product.api.js';
import userApi from '../api/user.api.js';
import testData from '../../data/test-data.js';
import { checkStatus, checkJsonBody } from '../../utils/checks.js';
import { randomSleep } from '../../utils/sleep.js';
import { logger } from '../../utils/logger.js';
import { cleanupRegistry } from '../../utils/cleanup.js';

/**
 * High-Level Business Metrics for User Journey
 */
const journeyDuration = new Trend('journey_duration', true);
const journeySuccessRate = new Rate('journey_success_rate');

/**
 * Simulates a realistic Frontend Business User Journey:
 * 1. User arrives and logs in.
 * 2. User explores product catalog with search/filter.
 * 3. User views specific product details.
 * 4. User adds/creates dynamic order or item.
 * 5. User updates account settings/profile.
 * 6. User concludes session and logs out.
 */
export function executeUserJourney(options = {}) {
  const startTime = Date.now();
  let journeyCompleted = false;

  try {
    group('User Journey: Authentication', () => {
      const loginResult = authApi.login();
      checkStatus(loginResult.response, [200, 201], 'journey_login');
      randomSleep(1, 2);
    });

    group('User Journey: Browse Catalog', () => {
      const listRes = productApi.listProducts({ page: 1, limit: 10 });
      checkStatus(listRes, [200, 204], 'journey_browse_catalog');
      randomSleep(1, 3);
    });

    group('User Journey: Inspect Product Details', () => {
      const sample = testData.fixtures.getRandomProduct();
      const targetId = sample ? sample.id : 101;
      const detailRes = productApi.getProductById(targetId);
      checkStatus(detailRes, [200, 204], 'journey_product_detail');
      randomSleep(1, 2);
    });

    let createdProductId = null;
    group('User Journey: Create Business Entity (e.g. Order / Item)', () => {
      const payload = testData.factories.product.create();
      const createRes = productApi.createProduct(payload, true);
      createdProductId = createRes.id;
      checkStatus(createRes.response, [200, 201], 'journey_create_entity');
      randomSleep(1, 2);
    });

    group('User Journey: Account Activity / Profile View', () => {
      const profileRes = authApi.getProfile();
      checkStatus(profileRes, [200, 204], 'journey_profile_view');
      randomSleep(1, 2);
    });

    group('User Journey: Teardown & Logout', () => {
      // Execute cleanup for resources created during this journey iteration
      cleanupRegistry.cleanupAll();
      const logoutRes = authApi.logout();
      checkStatus(logoutRes, [200, 204], 'journey_logout');
    });

    journeyCompleted = true;
  } catch (err) {
    logger.error(`User journey failed on VU ${__VU}: ${err.message}`);
    journeyCompleted = false;
  } finally {
    const elapsed = Date.now() - startTime;
    journeyDuration.add(elapsed);
    journeySuccessRate.add(journeyCompleted ? 1 : 0);
  }

  return journeyCompleted;
}

export default executeUserJourney;
