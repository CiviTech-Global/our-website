import { describe, expect, it } from 'vitest';
import { poolConfig } from './database.js';

describe('poolConfig', () => {
  it('turns the address parameters into the driver pool settings', () => {
    expect(poolConfig('postgresql://u:p@db:5432/app?connection_limit=10&pool_timeout=20')).toEqual({
      connectionString: 'postgresql://u:p@db:5432/app',
      max: 10,
      connectionTimeoutMillis: 20000,
    });
  });

  it('leaves an address without them alone', () => {
    expect(poolConfig('postgresql://u:p@db:5432/app')).toEqual({
      connectionString: 'postgresql://u:p@db:5432/app',
    });
  });

  it('keeps parameters the driver does use', () => {
    expect(poolConfig('postgresql://u:p@db:5432/app?sslmode=require&connection_limit=5')).toEqual({
      connectionString: 'postgresql://u:p@db:5432/app?sslmode=require',
      max: 5,
    });
  });

  it('survives having no address at all', () => {
    expect(poolConfig(undefined)).toEqual({ connectionString: undefined });
  });
});
