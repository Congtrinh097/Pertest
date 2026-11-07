import { sleep as k6Sleep } from 'k6';
import { DEFAULTS } from '../config/constants.js';

/**
 * Realistic user think time and pacing utilities.
 */

/**
 * Sleeps for a random duration between min and max seconds.
 * Simulates human reading / processing delay.
 */
export function randomSleep(min = DEFAULTS.THINK_TIME_MIN_SEC, max = DEFAULTS.THINK_TIME_MAX_SEC) {
  const duration = Math.random() * (max - min) + min;
  k6Sleep(duration);
  return duration;
}

/**
 * Fixed duration sleep in seconds.
 */
export function fixedSleep(seconds) {
  k6Sleep(seconds);
  return seconds;
}

/**
 * Gaussian / Normal distribution think time simulation around a mean.
 */
export function normalSleep(mean = 2.0, standardDeviation = 0.5) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const sleepTime = Math.max(0.2, mean + z0 * standardDeviation);
  k6Sleep(sleepTime);
  return sleepTime;
}
