// Database wrapper that switches between real and mock implementation
import { mockDb } from './mock-db';
import * as mockDbModule from './mock-db';
import * as realDbModule from './db';

// Check if we should use mock database
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true' || !process.env.DATABASE_URL || process.env.DATABASE_URL === 'postgresql://username:password@localhost:5432/arch_chat_db';

if (USE_MOCK_DB) {
  console.log('Using mock database implementation (PostgreSQL not required)');
}

// Export the appropriate implementation
export const pool = USE_MOCK_DB ? mockDbModule.default : realDbModule.default;
export const query = USE_MOCK_DB ? mockDbModule.query : realDbModule.query;
export const getClient = USE_MOCK_DB ? mockDbModule.getClient : realDbModule.getClient;
export const withTransaction = USE_MOCK_DB ? mockDbModule.withTransaction : realDbModule.withTransaction;

// Export mock database for direct access in API routes
export { mockDb };
export const isUsingMockDb = () => USE_MOCK_DB;