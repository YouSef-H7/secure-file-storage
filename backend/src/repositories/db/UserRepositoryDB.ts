/**
 * Database Implementation of UserRepository
 * 
 * This is a STUB file for future OCI database implementation.
 * DO NOT import or use this file until database migration is complete.
 */

import { UserRepository, UserMeta } from '../UserRepository';

export class UserRepositoryDB implements UserRepository {
  async findByEmail(input: { email: string; tenantId: string }): Promise<UserMeta | null> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }

  async findById(input: { userId: string; tenantId: string }): Promise<UserMeta | null> {
    throw new Error('Database repository not enabled yet. Set STORAGE_BACKEND=fs for filesystem mode.');
  }
}

export default UserRepositoryDB;
