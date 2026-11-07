import { createUserData, createUpdatedUserData } from './factories/user.factory.js';
import { createProductData, createUpdatedProductData } from './factories/product.factory.js';
import { getRandomElement } from '../utils/random.js';

/**
 * Central Data Provider
 * In k6 init context, open() loads static JSON fixtures.
 * In VU context, factories generate isolated dynamic test payloads.
 */

const rawUsersFixture = JSON.parse(open('./fixtures/users.json'));
const rawProductsFixture = JSON.parse(open('./fixtures/products.json'));

export const testData = {
  // Fixtures (static pre-seeded records)
  fixtures: {
    users: rawUsersFixture,
    products: rawProductsFixture,
    getRandomUser: () => getRandomElement(rawUsersFixture),
    getRandomProduct: () => getRandomElement(rawProductsFixture),
  },

  // Dynamic factories
  factories: {
    user: {
      create: createUserData,
      update: createUpdatedUserData,
    },
    product: {
      create: createProductData,
      update: createUpdatedProductData,
    },
  },
};

export default testData;
