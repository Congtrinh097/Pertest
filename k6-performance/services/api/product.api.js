import httpClient from './http-client.js';
import { activeConfig } from '../../config/test-config.js';
import { cleanupRegistry } from '../../utils/cleanup.js';
import { checkStatus, checkJsonBody } from '../../utils/checks.js';

/**
 * Product Catalog API Client
 * Manages CRUD operations for Product entities.
 */
export class ProductApi {
  constructor(client = httpClient, config = activeConfig) {
    this.client = client;
    this.config = config;
    /* PLACEHOLDER: Base path for products endpoint */
    this.baseEndpoint = this.config.endpoints?.products || '/api/v1/products';
  }

  /**
   * Creates a new product.
   */
  createProduct(productData, registerForCleanup = true) {
    const createEndpoint = this.config.mockMode ? `${this.baseEndpoint}/add` : this.baseEndpoint;
    const response = this.client.post(createEndpoint, productData, {
      tags: { action: 'product_create' },
    });

    const isSuccess = checkStatus(response, [200, 201], 'product_create');
    let createdId = null;
    let bodyData = null;

    if (isSuccess) {
      const parsed = checkJsonBody(response, [], 'product_create_body');
      bodyData = parsed.data;

      if (this.config.mockMode) {
        createdId = 1;
      } else if (bodyData) {
        createdId = bodyData.id 
          || (bodyData.data && bodyData.data.id)
          || (bodyData.json && bodyData.json.sku)
          || productData.sku;
      } else {
        createdId = productData.sku;
      }

      if (registerForCleanup && createdId && !this.config.mockMode) {
        cleanupRegistry.register('products', createdId, (id) => this.deleteProduct(id));
      }
    }

    return {
      success: isSuccess,
      id: createdId,
      data: bodyData,
      response,
    };
  }

  /**
   * Retrieves a product by ID or SKU
   */
  getProductById(productId) {
    const endpoint = `${this.baseEndpoint}/${encodeURIComponent(productId)}`;
    const response = this.client.get(endpoint, {
      tags: { action: 'product_get_by_id' },
    });
    return response;
  }

  /**
   * Queries products with pagination and category filtering
   */
  listProducts(params = { page: 1, limit: 20, category: '' }) {
    let query = `?page=${params.page || 1}&limit=${params.limit || 20}`;
    if (params.category) {
      query += `&category=${encodeURIComponent(params.category)}`;
    }
    const endpoint = `${this.baseEndpoint}${query}`;
    const response = this.client.get(endpoint, {
      tags: { action: 'product_list' },
    });
    return response;
  }

  /**
   * Updates an existing product
   */
  updateProduct(productId, updateData) {
    const endpoint = `${this.baseEndpoint}/${encodeURIComponent(productId)}`;
    const response = this.client.put(endpoint, updateData, {
      tags: { action: 'product_update' },
    });
    return response;
  }

  /**
   * Deletes a product
   */
  deleteProduct(productId) {
    const endpoint = `${this.baseEndpoint}/${encodeURIComponent(productId)}`;
    const response = this.client.del(endpoint, {
      tags: { action: 'product_delete' },
    });
    return response;
  }
}

export const productApi = new ProductApi();
export default productApi;
