import { activeConfig } from '../config/test-config.js';
import { runCreateScenario } from './crud/create.scenario.js';
import { runReadScenario } from './crud/read.scenario.js';
import { runUpdateScenario } from './crud/update.scenario.js';
import { runDeleteScenario } from './crud/delete.scenario.js';
import { runFullCrudScenario } from './crud/full-crud.scenario.js';
import { executeUserJourney } from '../services/frontend/user-journey.js';
import { runUserManagementScenario } from './user-journeys/user-management.scenario.js';

/**
 * Universal Workload Dispatcher
 * Supports 3 execution models:
 * A. Individual API testing (GET, POST, PUT, DELETE)
 * B. Business workflow testing (Full CRUD, User Journeys)
 * C. Mixed workload testing (Configurable operation distribution)
 */
export function executeWorkload() {
  const mode = activeConfig.workload.mode;

  if (mode === 'individual') {
    return executeIndividualOperation();
  } else if (mode === 'workflow') {
    return executeWorkflow();
  } else {
    return executeMixedWorkload();
  }
}

/**
 * Mode A: Individual API Testing
 */
export function executeIndividualOperation(specificOp = __ENV.OPERATION) {
  const op = specificOp || 'get';
  switch (op.toLowerCase()) {
    case 'post':
    case 'create':
      return runCreateScenario();
    case 'put':
    case 'update':
      return runUpdateScenario();
    case 'delete':
      return runDeleteScenario();
    case 'get':
    case 'read':
    default:
      return runReadScenario();
  }
}

/**
 * Mode B: Business Workflow Testing
 */
export function executeWorkflow() {
  const roll = Math.random();
  if (roll < 0.45) {
    return runFullCrudScenario();
  } else if (roll < 0.85) {
    return executeUserJourney();
  } else {
    return runUserManagementScenario();
  }
}

/**
 * Mode C: Mixed Workload Testing with Configurable Percentages
 * Prevents accidental write overloading.
 */
export function executeMixedWorkload() {
  const weights = activeConfig.workload.weights;
  const totalWeight = weights.get + weights.post + weights.put + weights.delete;
  const roll = Math.random() * totalWeight;

  if (roll < weights.get) {
    return runReadScenario();
  } else if (roll < weights.get + weights.post) {
    return runCreateScenario();
  } else if (roll < weights.get + weights.post + weights.put) {
    return runUpdateScenario();
  } else {
    return runDeleteScenario();
  }
}

export default executeWorkload;
