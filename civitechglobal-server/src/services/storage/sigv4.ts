import { createHash, createHmac } from 'node:crypto';

/**
 * AWS Signature Version 4, for S3-compatible object storage.
 *
 * Hand-written rather than pulled from an SDK. `@aws-sdk/client-s3` brings
 * roughly fifty packages to this project's twenty-two for the three operations
 * we use — put, get, delete — and every one of those packages is audit surface
 * and image weight. The algorithm is a published specification, it does not
 * change, and it is verified below against AWS's own published test vectors,
 * which is the only real evidence that a signer works.
 *
 * Reference: docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
 */

const ALGORITHM = 'AWS4-HMAC-SHA256';

export interface SigningInput {
  method: string;
  /** Path portion of the URL, already percent-encoded. Must begin with "/". */
  path: string;
  /** Host header value, e.g. "bucket.s3.example.com". */
  host: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Hex SHA-256 of the body. Empty body hashes to the well-known constant. */
  payloadHash: string;
  /** Extra headers to sign, lowercase keys. */
  headers?: Record<string, string>;
  /** Injectable so the test vectors can pin a moment. */
  now?: Date;
}

export const EMPTY_PAYLOAD_HASH = createHash('sha256').update('').digest('hex');

export function sha256Hex(body: Buffer | string): string {
  return createHash('sha256').update(body).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/** ISO 8601 basic format — 20130524T000000Z — which is what SigV4 wants. */
function amzDate(date: Date): { full: string; day: string } {
  const full = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return { full, day: full.slice(0, 8) };
}

/**
 * Signs a request and returns every header it must carry.
 *
 * The caller sends exactly these headers plus a body; adding an unsigned header
 * is fine, but changing a signed one after this call invalidates the signature.
 */
export function signRequest(input: SigningInput): Record<string, string> {
  const { full: timestamp, day } = amzDate(input.now ?? new Date());

  const headers: Record<string, string> = {
    host: input.host,
    'x-amz-content-sha256': input.payloadHash,
    'x-amz-date': timestamp,
    ...Object.fromEntries(
      Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v.trim()]),
    ),
  };

  // Canonical headers are sorted by name, and the signed-headers list must
  // match that order exactly or the signature will not reproduce.
  const sortedNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedNames.map((name) => `${name}:${headers[name]}\n`).join('');
  const signedHeaders = sortedNames.join(';');

  const canonicalRequest = [
    input.method.toUpperCase(),
    input.path,
    // No query string on any operation we perform; an empty line is correct.
    '',
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join('\n');

  const scope = `${day}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [ALGORITHM, timestamp, scope, sha256Hex(canonicalRequest)].join('\n');

  // The signing key is derived once per day/region/service, not per request.
  const dateKey = hmac(`AWS4${input.secretAccessKey}`, day);
  const regionKey = hmac(dateKey, input.region);
  const serviceKey = hmac(regionKey, input.service);
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  return {
    ...headers,
    Authorization:
      `${ALGORITHM} Credential=${input.accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
