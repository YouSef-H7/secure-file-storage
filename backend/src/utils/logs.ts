import db from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Add a log entry to the database
 * Global logging - no tenant filtering
 * @param userId - User email (AD identity)
 * @param action - Action type (e.g., 'FILE_UPLOAD', 'FOLDER_CREATED')
 * @param details - Action details
 */
export async function addLog(userId: string, action: string, details: string) {
  try {
    // Remove tenant filtering completely
    // Store the email directly as user_id
    await db.execute(
      'INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
      [uuidv4(), userId, action, details]
    );

    console.log(`[LOG SAVED] User: ${userId}, Action: ${action}`);
  } catch (error) {
    console.error('[LOG ERROR] Failed to write to DB:', error);
  }
}
