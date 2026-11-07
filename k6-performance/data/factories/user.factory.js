import {
  generateVUSafeEmail,
  generateVUSafeIdentifier,
  getRandomElement,
  getRandomInt
} from '../../utils/random.js';

/**
 * Dynamic User Factory
 * Generates isolated User payloads for load tests without collisions between VUs.
 */

const ROLES = ['user', 'editor', 'viewer'];
const DEPARTMENTS = ['Engineering', 'Marketing', 'Product', 'Finance', 'Operations'];

export function createUserData(overrides = {}) {
  const identifier = generateVUSafeIdentifier('usr');
  const vu = typeof __VU !== 'undefined' ? __VU : 0;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;

  return Object.assign(
    {
      /* PLACEHOLDER: Replace field names with your backend User DTO schema */
      username: `${identifier}`,
      email: generateVUSafeEmail('user'),
      firstName: `PerfUser_VU${vu}`,
      lastName: `Iteration_${iter}`,
      password: `P@ssword_${vu}_${Date.now()}!`,
      role: getRandomElement(ROLES),
      department: getRandomElement(DEPARTMENTS),
      age: getRandomInt(21, 65),
      isActive: true,
      metadata: {
        generatedBy: 'k6-load-engine',
        vu,
        iteration: iter,
        createdAt: new Date().toISOString(),
      },
    },
    overrides
  );
}

export function createUpdatedUserData(originalData = {}, overrides = {}) {
  return Object.assign(
    {},
    originalData,
    {
      firstName: `${originalData.firstName || 'Updated'}_MOD`,
      department: getRandomElement(DEPARTMENTS),
      updatedAt: new Date().toISOString(),
    },
    overrides
  );
}
