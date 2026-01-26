/**
 * Filesystem Implementation of UserRepository
 * 
 * Stores user metadata in JSON files.
 */

import fs from 'fs-extra';
import path from 'path';
import { UserRepository, UserMeta } from '../UserRepository';
import { config } from '../../config';

const METADATA_DIR = path.join(config.DATA_DIR, 'metadata');
const USERS_METADATA_FILE = path.join(METADATA_DIR, 'users.json');

interface UserRecord extends UserMeta {
  password?: string; // Only for local auth, not returned
}

class UserRepositoryFS implements UserRepository {
  private async ensureMetadataDir(): Promise<void> {
    await fs.ensureDir(METADATA_DIR);
    if (!(await fs.pathExists(USERS_METADATA_FILE))) {
      await fs.writeJSON(USERS_METADATA_FILE, []);
    }
  }

  private async readUsers(): Promise<UserRecord[]> {
    await this.ensureMetadataDir();
    return await fs.readJSON(USERS_METADATA_FILE);
  }

  private async writeUsers(users: UserRecord[]): Promise<void> {
    await this.ensureMetadataDir();
    await fs.writeJSON(USERS_METADATA_FILE, users, { spaces: 2 });
  }

  async findByEmail(input: { email: string; tenantId: string }): Promise<UserMeta | null> {
    const users = await this.readUsers();
    const user = users.find(u => 
      u.email.toLowerCase() === input.email.toLowerCase() && 
      u.tenant_id === input.tenantId
    );
    if (!user) return null;
    return { id: user.id, email: user.email, tenant_id: user.tenant_id };
  }

  async findById(input: { userId: string; tenantId: string }): Promise<UserMeta | null> {
    const users = await this.readUsers();
    const user = users.find(u => 
      u.id === input.userId && 
      u.tenant_id === input.tenantId
    );
    if (!user) return null;
    return { id: user.id, email: user.email, tenant_id: user.tenant_id };
  }
}

export default UserRepositoryFS;
