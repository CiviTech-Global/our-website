import { beforeEach, describe, expect, it } from 'vitest';
import {
  __normalisePath as normalisePath,
  recordClientError,
  recordRequest,
  renderMetrics,
  resetMetrics,
} from './metrics.service.js';

beforeEach(() => {
  resetMetrics();
});

describe('route normalisation', () => {
  it('collapses ids so one series does not become one per record', () => {
    // Unbounded label values are how a metrics system dies: a series per
    // tracking code is millions of series, not one useful chart.
    expect(normalisePath('/api/projects/admin/requests/cmtsykbm80002vcdwl4q266q9')).toBe(
      '/api/projects/admin/requests/:id',
    );
    expect(normalisePath('/api/resumes/admin/cmtudx6hf0002vckc5ybqh3ng/file')).toBe(
      '/api/resumes/admin/:id/file',
    );
  });

  it('collapses tracking codes', () => {
    expect(normalisePath('/api/track/36A6QM2HV6')).toBe('/api/track/:code');
  });

  it('collapses uuids', () => {
    expect(normalisePath('/api/x/6ba62de9-6277-4447-a1a7-1185339897d1')).toBe('/api/x/:id');
  });

  it('drops the query string, which carries reset tokens', () => {
    expect(normalisePath('/api/auth/verify-email?token=secret')).toBe('/api/auth/verify-email');
  });

  it('leaves ordinary routes alone', () => {
    expect(normalisePath('/api/insurance/catalog')).toBe('/api/insurance/catalog');
    expect(normalisePath('/api/health/ready')).toBe('/api/health/ready');
  });

  it('never returns an empty label', () => {
    expect(normalisePath('')).toBe('/');
  });
});

describe('exposition', () => {
  it('counts requests by route and status', () => {
    recordRequest('GET', '/api/insurance/catalog', 200, 0.02);
    recordRequest('GET', '/api/insurance/catalog', 200, 0.03);
    recordRequest('GET', '/api/insurance/catalog', 500, 1.5);

    const out = renderMetrics();
    expect(out).toContain(
      'civitech_http_requests_total{method="GET",route="/api/insurance/catalog",status="200"} 2',
    );
    expect(out).toContain(
      'civitech_http_requests_total{method="GET",route="/api/insurance/catalog",status="500"} 1',
    );
  });

  it('buckets durations cumulatively, as a histogram must', () => {
    recordRequest('GET', '/api/x', 200, 0.02);
    recordRequest('GET', '/api/x', 200, 2.0);

    const out = renderMetrics();
    // 0.02 is under every bucket from 0.05 up; 2.0 only from 2.5 up.
    expect(out).toContain('le="0.05"} 1');
    expect(out).toContain('le="2.5"} 2');
    expect(out).toContain('le="+Inf"} 2');
    expect(out).toContain('civitech_http_request_duration_seconds_count{method="GET",route="/api/x"} 2');
  });

  it('groups requests that differ only by id into one series', () => {
    recordRequest('GET', '/api/track/AAAAAAAAAA', 200, 0.01);
    recordRequest('GET', '/api/track/BBBBBBBBBB', 404, 0.01);

    const out = renderMetrics();
    expect(out).toContain('route="/api/track/:code",status="200"');
    expect(out).toContain('route="/api/track/:code",status="404"');
    expect(out).not.toContain('AAAAAAAAAA');
  });

  it('counts browser errors', () => {
    recordClientError();
    recordClientError();
    expect(renderMetrics()).toContain('civitech_client_errors_total 2');
  });

  it('escapes label values so a crafted path cannot forge a series', () => {
    recordRequest('GET', '/api/x"evil', 200, 0.01);
    // A raw quote would close the label and let the rest be read as more
    // labels — the metrics equivalent of an injection.
    expect(renderMetrics()).toContain('route="/api/x\\"evil"');
  });

  it('emits a type and help line for every metric', () => {
    recordRequest('GET', '/api/x', 200, 0.01);
    const out = renderMetrics();
    for (const name of [
      'civitech_uptime_seconds',
      'civitech_http_requests_total',
      'civitech_http_request_duration_seconds',
      'civitech_client_errors_total',
    ]) {
      expect(out).toContain(`# HELP ${name} `);
      expect(out).toContain(`# TYPE ${name} `);
    }
  });
});
