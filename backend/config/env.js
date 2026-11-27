const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('Set JWT_SECRET in the project .env file to a random value of at least 32 characters.');
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret,
  dbPath: path.resolve(__dirname, '../../', process.env.DB_PATH || './database/universe.db'),
  uploadsDir: path.resolve(__dirname, '../uploads'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};
