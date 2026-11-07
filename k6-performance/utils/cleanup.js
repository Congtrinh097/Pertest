import { activeConfig } from '../config/test-config.js';
import { logger } from './logger.js';

/**
 * Data Cleanup Manager
 * Tracks entities created during test execution to clean them up,
 * preventing test pollution in long-running or shared environments.
 */

class CleanupRegistry {
  constructor() {
    this.records = [];
  }

  /**
   * Registers an item for future cleanup.
   * @param {string} resourceType - e.g. 'users', 'products'
   * @param {string|number} id - Entity identifier
   * @param {function} deleteCallback - Function to call to delete the entity
   */
  register(resourceType, id, deleteCallback) {
    if (!id || !activeConfig.cleanupEnabled) return;
    this.records.push({
      resourceType,
      id,
      deleteCallback,
      createdAt: Date.now(),
    });
    logger.debug(`Registered entity for cleanup: ${resourceType} [ID: ${id}]`);
  }

  /**
   * Runs cleanup for all registered entities for the current VU.
   */
  cleanupAll() {
    if (!activeConfig.cleanupEnabled) {
      logger.debug('Cleanup is disabled via configuration (CLEANUP_ENABLED=false)');
      this.records = [];
      return;
    }

    if (this.records.length === 0) return;

    logger.info(`Running cleanup for ${this.records.length} registered entities...`);
    let cleanedCount = 0;

    while (this.records.length > 0) {
      const item = this.records.pop();
      try {
        if (typeof item.deleteCallback === 'function') {
          item.deleteCallback(item.id);
          cleanedCount++;
        }
      } catch (err) {
        logger.error(`Cleanup failed for ${item.resourceType} [ID: ${item.id}]: ${err.message}`);
      }
    }

    logger.info(`Cleanup finished. Removed ${cleanedCount} entities.`);
  }

  /**
   * Clears registry without executing callbacks.
   */
  reset() {
    this.records = [];
  }
}

export const cleanupRegistry = new CleanupRegistry();
export default cleanupRegistry;
