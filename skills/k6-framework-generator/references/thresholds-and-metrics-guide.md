# Thresholds, Custom Metrics & SLA Customization Guide

This guide details how to implement, configure, and customize Service Level Agreements (SLAs), thresholds, and custom K6 metrics.

---

## 1. Built-in Metrics and Standard Thresholds

K6 provides core telemetry metrics that must be evaluated across all test profiles:

| Metric Name | Type | Description | Standard SLA Target |
| :--- | :--- | :--- | :--- |
| `http_req_duration` | Trend | End-to-end request latency (DNS, TCP, TLS, TTFB, transfer) | Smoke: `p(95)<400`, `p(99)<800`<br>Load: `p(90)<500`, `p(95)<800`, `p(99)<1500`<br>Stress: `p(95)<2000` |
| `http_req_failed` | Rate | Percentage of failed HTTP requests (status >= 400) | Smoke: `rate<0.01` (1%)<br>Load: `rate<0.02` (2%)<br>Stress: `rate<0.05` (5%) |
| `checks` | Rate | Percentage of functional assertion checks that passed | Smoke: `rate>0.99` (99%+)<br>Load: `rate>0.98` (98%+) |
| `http_reqs` | Counter | Total count and per-second throughput | Assessed for target RPS delivery |
| `iterations` | Counter | Total completed scenario iterations | Assessed for test volume |
| `vus` / `vus_max` | Gauge | Active and maximum Virtual Users | Verified against workload configuration |

---

## 2. Custom Business & Domain Metrics

Built-in HTTP metrics aggregate all requests together. To analyze specific business operations independently, declare custom metrics in init context:

```javascript
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Latency trends for specific domain operations
export const userCreateDuration = new Trend('user_create_duration', true); // true = include time metrics
export const userReadDuration = new Trend('user_read_duration', true);

// Success rates for multi-step scenarios
export const journeySuccessRate = new Rate('journey_success_rate');
export const fullCrudSuccessRate = new Rate('full_crud_success_rate');

// Error counters by operation
export const orderCreationFailures = new Counter('order_creation_failures');
```

---

## 3. Tagging Strategy for Deep Visibility

Every request in the framework should be enriched with meaningful tags:
- `endpoint`: Clean URL path template (e.g. `/api/v1/users`, not `/api/v1/users/12345` to avoid high cardinality).
- `method`: `GET`, `POST`, `PUT`, `DELETE`.
- `operation`: `user_create`, `user_list`, `auth_login`.
- `scenario`: `full_crud`, `user_journey`.
- `resource`: `users`, `products`, `auth`.

### Sub-Metric Thresholds by Tag
K6 allows filtering thresholds by tag:
```javascript
export const customThresholds = {
  // Global SLA
  'http_req_duration': ['p(95)<800'],

  // Strict SLA on critical login endpoint:
  'http_req_duration{operation:auth_login}': ['p(95)<300', 'p(99)<500'],

  // Relaxed SLA for heavy catalog search:
  'http_req_duration{operation:product_list}': ['p(95)<1200'],

  // Zero-tolerance failure on authentication:
  'http_req_failed{operation:auth_login}': ['rate<0.001'],
};
```

---

## 4. Safety Aborts (`abortOnFail`)

For destructive tests like **Breakpoint** or **Stress**, thresholds can automatically abort the execution to protect infrastructure before causing catastrophic outages:

```javascript
export const breakpointThresholds = {
  // If failure rate exceeds 20%, abort immediately after a 10s evaluation buffer
  http_req_failed: [
    { threshold: 'rate<0.20', abortOnFail: true, delayAbortEval: '10s' }
  ],
  // If P95 latency exceeds 5 seconds, abort
  http_req_duration: [
    { threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '10s' }
  ],
};
```
