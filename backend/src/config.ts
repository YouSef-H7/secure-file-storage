
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  // Fix: Use path.resolve() instead of process.cwd() to resolve type issues with the process global
  DATA_DIR: process.env.DATA_DIR || path.join(path.resolve(), 'data'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_only',
  MAX_FILE_MB: parseInt(process.env.MAX_FILE_MB || '25'),
  ALLOWED_MIME: (process.env.ALLOWED_MIME || 'image/png,image/jpeg,application/pdf').split(','),
};
