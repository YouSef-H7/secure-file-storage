/**
 * Database Implementation of UserRepository
 * 
 * Stores user metadata in MySQL database.
 */

import db from '../../db';
import { RowDataPacket } from 'mysql2';
import { UserRepository, UserMeta } from '../UserRepository';

export class UserRepositoryDB implements UserRepository {
  async findByEmail(input: { email: string; tenantId: string }): Promise<UserMeta | null> {
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT id, email, tenant_id
         FROM users
         WHERE LOWER(email) = LOWER(?) AND tenant_id = ?`,
        [input.email, input.tenantId]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      const user = rows[0];
      return {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id
      };
    } catch (err) {
      console.error('[UserRepositoryDB] findByEmail error:', err);
      return null;
    }
  }

  async findById(input: { userId: string; tenantId: string }): Promise<UserMeta | null> {
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT id, email, tenant_id
         FROM users
         WHERE id = ? AND tenant_id = ?`,
        [input.userId, input.tenantId]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      const user = rows[0];
      return {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id
      };
    } catch (err) {
      console.error('[UserRepositoryDB] findById error:', err);
      return null;
    }
  }
}

export default UserRepositoryDB;
