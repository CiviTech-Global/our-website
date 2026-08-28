// Re-exported from config/logger.ts so call sites can `import { logger } from '../utils/logger.js'`
// without caring whether the logger is considered "config" or "util".
export { logger, sensitivePaths } from '../config/logger.js';
