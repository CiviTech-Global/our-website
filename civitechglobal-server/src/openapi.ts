/**
 * OpenAPI description of the public API surface.
 *
 * Public meaning callable without a session: the catalog, the four intakes,
 * and tracking. The admin surface is deliberately absent — it is not a
 * published interface, it changes with the admin UI, and enumerating it in a
 * document anyone can fetch is free reconnaissance.
 *
 * Written by hand rather than generated from the zod schemas. A generator
 * needs either a dependency or a hand-rolled zod-to-JSON-Schema converter, and
 * a converter that quietly mishandles one of the trickier schemas produces a
 * document that is confidently wrong — worse than none. What keeps this honest
 * instead is `openapi.test.ts`, which drives every documented path through the
 * real app and fails if one no longer routes.
 */

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'CiviTech Global API',
    version: '1.0.0',
    description:
      'Public endpoints for the insurance catalog, the software-project, CV and contact ' +
      'intakes, and tracking. Administrative endpoints require a session and are not ' +
      'described here.',
    contact: { name: 'Security disclosures', email: 'security@civitechglobal.com' },
  },
  servers: [
    { url: '/api/v1', description: 'Versioned. Use this.' },
    { url: '/api', description: 'Unversioned alias, frozen at v1. Existing clients only.' },
  ],
  tags: [
    { name: 'Catalog', description: 'Insurance products. Cacheable; identical for everyone.' },
    { name: 'Intake', description: 'Submissions from the public site.' },
    { name: 'Tracking', description: 'Status by quotable reference code.' },
    { name: 'Telemetry', description: 'Browser error reports.' },
    {
      name: 'Marketplace',
      description:
        'The public job and freelance boards. Approved, open listings only; posting, ' +
        'applying and bidding all require a session and an approved verification, and are ' +
        'therefore not part of this document.',
    },
  ],
  paths: {
    '/health/live': {
      get: {
        tags: ['Catalog'],
        summary: 'Is the process up',
        description: 'Touches no dependency. This is what an orchestrator restarts on.',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Catalog'],
        summary: 'Is the service able to serve',
        description: 'Checks Postgres and Redis. 503 when either is unreachable.',
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          503: { description: 'A dependency is down.' },
        },
      },
    },
    '/market/stats': {
      get: {
        tags: ['Marketplace'],
        summary: 'Headline marketplace numbers for the landing page',
        description:
          'Open jobs, open projects, awards given and verified users. ' +
          'Cache-Control: public, max-age=300, stale-while-revalidate=900.',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/market/featured': {
      get: {
        tags: ['Marketplace'],
        summary: 'Featured and newest listings for the landing page',
        description:
          'Staff-curated featured jobs and projects, newest approved listings filling any ' +
          'un-curated slots. Cache-Control: public, max-age=60, stale-while-revalidate=600.',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/market/jobs': {
      get: {
        tags: ['Marketplace'],
        summary: 'The job board',
        description:
          'Only listings that are approved and open. Author identity flows through the public ' +
          'profile: listings whose author has chosen a username carry an authorProfile card, ' +
          'the rest stay anonymous by design. ' +
          'Cache-Control: public, max-age=60, stale-while-revalidate=600. ' +
          'Filters: search, employmentType, workArrangement, province, category, skills ' +
          '(comma list), salaryMin/salaryMax (range overlap, undisclosed salaries excluded), ' +
          'sort (newest | salaryAsc | salaryDesc | closingSoon); featured always sorts first. ' +
          'Money is a decimal string, in Toman.',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/market/jobs/{code}': {
      get: {
        tags: ['Marketplace'],
        summary: 'One posting, by its reference code',
        parameters: [{ $ref: '#/components/parameters/Code' }],
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/market/projects': {
      get: {
        tags: ['Marketplace'],
        summary: 'The freelance board',
        description:
          'Approved, open projects. Each carries a count of the offers it has drawn and ' +
          'nothing about them: bids are sealed, and a count conveys competition without ' +
          "handing the next bidder somebody else's number to undercut. " +
          'Filters: search, category, skills (comma list), budgetMin/budgetMax (range overlap, ' +
          'undisclosed budgets excluded), sort (newest | budgetAsc | budgetDesc); featured ' +
          'always sorts first. Money is a decimal string, in Toman.',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/market/projects/{code}': {
      get: {
        tags: ['Marketplace'],
        summary: 'One project, by its reference code',
        parameters: [{ $ref: '#/components/parameters/Code' }],
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/market/profiles/{username}': {
      get: {
        tags: ['Marketplace'],
        summary: 'A public profile, by username',
        description:
          'What an account that chose a username shows the world: handle, headline, ' +
          'verification state, reputation, public listings and received reviews. No email, ' +
          'phone or real name, and paused accounts are not here. 404 otherwise. ' +
          'Cache-Control: public, max-age=120, stale-while-revalidate=600.',
        parameters: [
          {
            name: 'username',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The self-chosen handle, without the leading @.',
          },
        ],
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/insurance/catalog': {
      get: {
        tags: ['Catalog'],
        summary: 'Every active category with its products',
        description:
          'Cache-Control: public, max-age=900, stale-while-revalidate=86400 — unless the ' +
          'request carries credentials, in which case no-store.',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/insurance/products': {
      get: {
        tags: ['Catalog'],
        summary: 'Flat product list',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/insurance/products/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'One product, with its full form schema',
        parameters: [{ $ref: '#/components/parameters/Slug' }],
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/insurance/requests': {
      post: {
        tags: ['Intake'],
        summary: 'Submit an insurance enquiry',
        description:
          'Requires a phone token from /insurance/otp/verify. Answers are validated against ' +
          "the product's own form schema at its catalog version.",
        responses: {
          201: { $ref: '#/components/responses/Created' },
          400: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/insurance/otp/send': {
      post: {
        tags: ['Intake'],
        summary: 'Send a one-time code to a phone number',
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/insurance/otp/verify': {
      post: {
        tags: ['Intake'],
        summary: 'Exchange a code for a phone token',
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/projects/requests': {
      post: {
        tags: ['Intake'],
        summary: 'Submit a software project brief',
        description:
          'multipart/form-data: a JSON `payload` field plus up to 8 attachments. Email and ' +
          'phone together identify the client and must always be used together afterwards.',
        responses: {
          201: { $ref: '#/components/responses/Created' },
          409: { description: 'Email and phone belong to different identities.' },
          413: { description: 'Attachment or payload too large.' },
          415: { description: "File contents do not match an accepted type." },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/resumes': {
      post: {
        tags: ['Intake'],
        summary: 'Submit a CV',
        description:
          'multipart/form-data: a JSON `payload` field plus exactly one PDF, DOCX or LaTeX ' +
          'file. Two submissions a day, an hour apart, on at most two days ever.',
        responses: {
          201: { $ref: '#/components/responses/Created' },
          409: { description: 'Email and phone belong to different identities.' },
          415: { description: "File contents do not match an accepted type." },
          422: { description: 'The file failed a malware scan.' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/resumes/allowance': {
      post: {
        tags: ['Intake'],
        summary: 'How much of the submission allowance an address has left',
        description: 'Answered before the form is filled in, so nobody types a page for nothing.',
        responses: { 200: { $ref: '#/components/responses/Ok' } },
      },
    },
    '/contact': {
      post: {
        tags: ['Intake'],
        summary: 'Send a message through the contact form',
        responses: {
          201: { $ref: '#/components/responses/Created' },
          400: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/track/{code}': {
      get: {
        tags: ['Tracking'],
        summary: 'Resolve any tracking code',
        description:
          'Codes from the three intakes are indistinguishable, and whoever holds one has no ' +
          'reason to know which system issued it. Resolves across all three and returns a ' +
          '`kind` discriminator. Status and dates only — never contact details or documents.',
        parameters: [{ $ref: '#/components/parameters/Code' }],
        responses: {
          200: { $ref: '#/components/responses/Ok' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/client-errors': {
      post: {
        tags: ['Telemetry'],
        summary: 'Report an uncaught browser error',
        description: 'Write-only. Answers 204 and says nothing back.',
        responses: {
          204: { description: 'Recorded.' },
          400: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
  },
  components: {
    parameters: {
      Slug: {
        name: 'slug',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Stable URL segment for a product. Display titles may change; this does not.',
      },
      Code: {
        name: 'code',
        in: 'path',
        required: true,
        schema: { type: 'string', minLength: 10, maxLength: 10 },
        description:
          'Ten characters from an alphabet with no ambiguous glyphs — it gets read down a phone line.',
      },
    },
    schemas: {
      Envelope: {
        type: 'object',
        description: 'Every response, success or failure, has this shape.',
        required: ['success'],
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {},
          errors: {
            type: 'array',
            description: 'Per-field validation detail. Present on 400s.',
            items: {
              type: 'object',
              properties: { path: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
    },
    responses: {
      Ok: {
        description: 'Success.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
      },
      Created: {
        description: 'Created. `data` carries the tracking code.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
      },
      ValidationError: {
        description: 'The request was rejected. `errors` says which field and why.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
      },
      NotFound: {
        description: 'No such record.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
      },
      RateLimited: {
        description:
          'Too many requests. Limits are applied at the edge, per caller, and per identity.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Envelope' } } },
      },
    },
  },
} as const;
