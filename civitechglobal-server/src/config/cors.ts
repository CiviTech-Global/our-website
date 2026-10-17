import type { CorsOptions } from 'cors';
import { env } from './env.js';

export const corsOptions: CorsOptions = {
  // An array: the apex, the www alias and — while a domain move is in
  // progress — the address the site answered on before. The cors package
  // compares the request's Origin against every entry and reflects the one
  // that matched, which is what credentialed requests require (a literal
  // "*" is rejected by the browser when credentials are sent).
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  // X-Client is how the mobile app asks for its tokens in the body (see
  // auth.controller.ts). Listed for completeness: native apps are not subject
  // to CORS, and a browser page on another origin cannot read the response.
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client'],
};
