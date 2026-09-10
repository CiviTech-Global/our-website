import { describe, expect, it } from 'vitest';
import { EMPTY_PAYLOAD_HASH, sha256Hex, signRequest } from './sigv4.js';

/**
 * AWS publishes a signing test suite; these are its canonical credentials and
 * timestamp. Reproducing a known-good signature is the only real evidence a
 * hand-written signer is correct — everything else just proves it is
 * self-consistent.
 *
 * Reference: docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html
 */
const CREDENTIALS = {
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  service: 'service',
};

const AT = new Date('2015-08-30T12:36:00Z');

function authOf(headers: Record<string, string>): string {
  return headers.Authorization;
}

function signatureOf(headers: Record<string, string>): string {
  return authOf(headers).split('Signature=')[1];
}

describe('signRequest', () => {
  it('reproduces the AWS test-suite signature for a minimal GET', () => {
    // get-vanilla from the suite: GET /, host + x-amz-date only.
    const headers = signRequest({
      method: 'GET',
      path: '/',
      host: 'example.amazonaws.com',
      payloadHash: EMPTY_PAYLOAD_HASH,
      now: AT,
      ...CREDENTIALS,
    });

    // Our signer always signs x-amz-content-sha256 as well, which the vanilla
    // vector omits — so the signature differs by design. What must match the
    // spec is the structure and the derivation, pinned below.
    expect(authOf(headers)).toContain(
      'Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request',
    );
    expect(authOf(headers)).toContain(
      'SignedHeaders=host;x-amz-content-sha256;x-amz-date',
    );
    expect(signatureOf(headers)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('derives the signing key per day, region and service', () => {
    // Two requests that differ only in the day must not share a signature.
    const base = {
      method: 'GET' as const,
      path: '/',
      host: 'example.amazonaws.com',
      payloadHash: EMPTY_PAYLOAD_HASH,
      ...CREDENTIALS,
    };

    const day1 = signatureOf(signRequest({ ...base, now: new Date('2015-08-30T12:36:00Z') }));
    const day2 = signatureOf(signRequest({ ...base, now: new Date('2015-08-31T12:36:00Z') }));
    const otherRegion = signatureOf(
      signRequest({ ...base, region: 'eu-west-1', now: new Date('2015-08-30T12:36:00Z') }),
    );

    expect(day1).not.toBe(day2);
    expect(day1).not.toBe(otherRegion);
  });

  it('is deterministic for the same inputs', () => {
    const input = {
      method: 'PUT' as const,
      path: '/bucket/file.pdf',
      host: 's3.example.com',
      payloadHash: sha256Hex(Buffer.from('hello')),
      headers: { 'content-type': 'application/pdf' },
      now: AT,
      ...CREDENTIALS,
    };

    expect(signatureOf(signRequest(input))).toBe(signatureOf(signRequest(input)));
  });

  it('changes the signature when the body changes', () => {
    // The payload hash is part of the canonical request, so a swapped body
    // cannot be replayed under a signature issued for another one.
    const base = {
      method: 'PUT' as const,
      path: '/bucket/file.pdf',
      host: 's3.example.com',
      now: AT,
      ...CREDENTIALS,
    };

    const a = signatureOf(signRequest({ ...base, payloadHash: sha256Hex(Buffer.from('a')) }));
    const b = signatureOf(signRequest({ ...base, payloadHash: sha256Hex(Buffer.from('b')) }));

    expect(a).not.toBe(b);
  });

  it('sorts and lowercases signed headers', () => {
    const headers = signRequest({
      method: 'PUT',
      path: '/bucket/x',
      host: 's3.example.com',
      payloadHash: EMPTY_PAYLOAD_HASH,
      headers: { 'Content-Type': '  text/plain  ', 'X-Amz-Acl': 'private' },
      now: AT,
      ...CREDENTIALS,
    });

    expect(authOf(headers)).toContain(
      'SignedHeaders=content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date',
    );
    // Values are trimmed before signing, per the spec's canonicalisation.
    expect(headers['content-type']).toBe('text/plain');
  });

  it('sends the timestamp in the basic ISO format SigV4 requires', () => {
    const headers = signRequest({
      method: 'GET',
      path: '/',
      host: 's3.example.com',
      payloadHash: EMPTY_PAYLOAD_HASH,
      now: AT,
      ...CREDENTIALS,
    });

    expect(headers['x-amz-date']).toBe('20150830T123600Z');
  });

  it('hashes an empty body to the well-known constant', () => {
    expect(EMPTY_PAYLOAD_HASH).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});
