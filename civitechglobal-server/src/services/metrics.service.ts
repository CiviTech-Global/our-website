/**
 * Request metrics, in Prometheus text format.
 *
 * Hand-rolled rather than `prom-client`, for the same reason the SMS, email and
 * storage providers are: this needs four counters and one histogram, and a
 * dependency for that is weight and audit surface the project does not have to
 * carry. The exposition format is a stable, documented text format.
 *
 * Everything is in-process and resets when the container restarts, which is
 * exactly what a counter scraped by Prometheus is supposed to do — the scraper
 * handles resets. Nothing here is a substitute for the logs; it answers "is the
 * error rate climbing" rather than "what happened to this request".
 */

/** Route label. Raw paths would explode the cardinality — one series per id. */
function normalisePath(path: string): string {
  return (
    path
      .split('?')[0]
      // cuid, uuid, hex object names, and the tracking codes, all of which are
      // unbounded in practice.
      .replace(/\/c[a-z0-9]{20,}/g, '/:id')
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/[0-9A-Z]{10}(?=\/|$)/g, '/:code')
      .replace(/\/[0-9a-f]{24,}/gi, '/:id') || '/'
  );
}

/** Seconds. The tail matters more than the middle, so the buckets are skewed. */
const BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

interface RouteStats {
  count: number;
  sum: number;
  buckets: number[];
  byStatus: Map<number, number>;
}

const routes = new Map<string, RouteStats>();
let clientErrors = 0;
const startedAt = Date.now();

export function recordRequest(method: string, path: string, status: number, seconds: number): void {
  const key = `${method} ${normalisePath(path)}`;
  let stats = routes.get(key);
  if (!stats) {
    stats = { count: 0, sum: 0, buckets: new Array(BUCKETS.length).fill(0), byStatus: new Map() };
    routes.set(key, stats);
  }

  stats.count += 1;
  stats.sum += seconds;
  stats.byStatus.set(status, (stats.byStatus.get(status) ?? 0) + 1);
  for (let i = 0; i < BUCKETS.length; i += 1) {
    if (seconds <= BUCKETS[i]) stats.buckets[i] += 1;
  }
}

export function recordClientError(): void {
  clientErrors += 1;
}

/** Label values are quoted, so a quote or backslash inside one must be escaped. */
function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
}

export function renderMetrics(): string {
  const lines: string[] = [];

  lines.push('# HELP civitech_uptime_seconds Seconds since this process started.');
  lines.push('# TYPE civitech_uptime_seconds gauge');
  lines.push(`civitech_uptime_seconds ${((Date.now() - startedAt) / 1000).toFixed(0)}`);

  lines.push('# HELP civitech_http_requests_total Requests by route and status.');
  lines.push('# TYPE civitech_http_requests_total counter');
  for (const [key, stats] of routes) {
    const [method, path] = key.split(' ');
    for (const [status, count] of stats.byStatus) {
      lines.push(
        `civitech_http_requests_total{method="${escapeLabel(method)}",route="${escapeLabel(path)}",status="${status}"} ${count}`,
      );
    }
  }

  lines.push('# HELP civitech_http_request_duration_seconds Request duration by route.');
  lines.push('# TYPE civitech_http_request_duration_seconds histogram');
  for (const [key, stats] of routes) {
    const [method, path] = key.split(' ');
    const labels = `method="${escapeLabel(method)}",route="${escapeLabel(path)}"`;
    for (let i = 0; i < BUCKETS.length; i += 1) {
      lines.push(
        `civitech_http_request_duration_seconds_bucket{${labels},le="${BUCKETS[i]}"} ${stats.buckets[i]}`,
      );
    }
    lines.push(`civitech_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${stats.count}`);
    lines.push(`civitech_http_request_duration_seconds_sum{${labels}} ${stats.sum.toFixed(4)}`);
    lines.push(`civitech_http_request_duration_seconds_count{${labels}} ${stats.count}`);
  }

  lines.push('# HELP civitech_client_errors_total Uncaught errors reported by browsers.');
  lines.push('# TYPE civitech_client_errors_total counter');
  lines.push(`civitech_client_errors_total ${clientErrors}`);

  return `${lines.join('\n')}\n`;
}

/** Test seam. Nothing in the running application calls this. */
export function resetMetrics(): void {
  routes.clear();
  clientErrors = 0;
}

export { normalisePath as __normalisePath };
