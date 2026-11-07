/**
 * Dynamic Test Data Generation Utilities
 * Generates unique random identifiers, strings, emails, numbers, and UUIDs.
 */

export function getRandomInt(min, max) {
  const minVal = Math.ceil(min);
  const maxVal = Math.floor(max);
  return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
}

export function getRandomString(length = 8, charset = 'abcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

export function getRandomElement(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

export function generateUUID() {
  // Standard RFC4122 v4 UUID generator compatible with k6 ES5/ES6 runtime
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates an isolated, collision-resistant email for the current VU and iteration.
 */
export function generateVUSafeEmail(prefix = 'perf_user') {
  const vu = typeof __VU !== 'undefined' ? __VU : 0;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
  const uniqueToken = getRandomString(6);
  return `${prefix}_vu${vu}_it${iter}_${uniqueToken}@perf-test.internal`;
}

/**
 * Generates an isolated unique entity name or code.
 */
export function generateVUSafeIdentifier(prefix = 'entity') {
  const vu = typeof __VU !== 'undefined' ? __VU : 0;
  const iter = typeof __ITER !== 'undefined' ? __ITER : 0;
  const timestamp = Date.now().toString(36);
  const randomSuffix = getRandomString(4);
  return `${prefix}_${vu}_${iter}_${timestamp}_${randomSuffix}`;
}

export function getRandomPrice(min = 10, max = 500) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}
