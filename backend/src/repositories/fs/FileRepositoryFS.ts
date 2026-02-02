/**
 * Filesystem Implementation of FileRepository
 * 
 * Stores file metadata in JSON files within the data directory.
 * Physical files are stored in tenant/user subdirectories.
 * 
 * This implementation matches the behavior of the database implementation
 * but uses filesystem storage for local development.
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileRepository, FileMeta } from '../FileRepository';
import { config } from '../../config';
import { normalizeUserId } from '../../utils/userId';

const METADATA_DIR = path.join(config.DATA_DIR, 'metadata');
const FILES_METADATA_FILE = path.join(METADATA_DIR, 'files.json');
const SHARES_METADATA_FILE = path.join(METADATA_DIR, 'shares.json');

/** Coerce is_deleted from JSON (handles legacy "true", 1, etc.) to boolean */
function toBoolean(v: unknown): boolean {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return false;
}

interface FileRecord {
  id: string;
  filename: string;
  size: number;
  created_at: string;
  storage_path: string;
  folder_id?: string | null;
  tenant_id: string;
  user_id: string;
  mime_type?: string | null; // JSON can have null, but we convert to undefined for FileMeta
  is_deleted?: boolean; // Soft delete; missing = false
}

interface ShareRecord {
  id: string;
  file_id: string;
  owner_user_id: string;
  shared_with_user_id: string;
  tenant_id: string;
  permission: 'read';
  created_at: string;
}

class FileRepositoryFS implements FileRepository {
  private async ensureMetadataDir(): Promise<void> {
    await fs.ensureDir(METADATA_DIR);
    if (!(await fs.pathExists(FILES_METADATA_FILE))) {
      await fs.writeJSON(FILES_METADATA_FILE, []);
    }
    if (!(await fs.pathExists(SHARES_METADATA_FILE))) {
      await fs.writeJSON(SHARES_METADATA_FILE, []);
    }
  }

  private async readFiles(): Promise<FileRecord[]> {
    await this.ensureMetadataDir();
    return await fs.readJSON(FILES_METADATA_FILE);
  }

  private async writeFiles(files: FileRecord[]): Promise<void> {
    await this.ensureMetadataDir();
    await fs.writeJSON(FILES_METADATA_FILE, files, { spaces: 2 });
  }

  private async readShares(): Promise<ShareRecord[]> {
    await this.ensureMetadataDir();
    return await fs.readJSON(SHARES_METADATA_FILE);
  }

  private async writeShares(shares: ShareRecord[]): Promise<void> {
    await this.ensureMetadataDir();
    await fs.writeJSON(SHARES_METADATA_FILE, shares, { spaces: 2 });
  }

  async listUserFiles(input: { tenantId: string; userId: string }): Promise<FileMeta[]> {
    const files = await this.readFiles();
    const nUserId = normalizeUserId(input.userId);
    return files
      .filter(f => f.tenant_id === input.tenantId && normalizeUserId(f.user_id) === nUserId && !toBoolean(f.is_deleted))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(f => ({
        id: f.id,
        filename: f.filename,
        size: f.size ?? 0,
        created_at: f.created_at,
        storage_path: f.storage_path,
        folder_id: f.folder_id || null,
        tenant_id: f.tenant_id,
        user_id: f.user_id,
        mime_type: f.mime_type ?? undefined
      }));
  }

  async listUserTrashFiles(input: { tenantId: string; userId: string }): Promise<FileMeta[]> {
    const nUserId = normalizeUserId(input.userId);
    const tenantId = input.tenantId;
    console.log(`[TRASH] Searching for user: ${input.userId}`);
    const files = await this.readFiles();
    const totalRecords = files.length;
    const afterUserFilter = files.filter(f => f.tenant_id === tenantId && normalizeUserId(f.user_id) === nUserId);
    const afterUserCount = afterUserFilter.length;
    const afterDeletedFilter = afterUserFilter.filter(f => toBoolean(f.is_deleted));
    const afterDeletedCount = afterDeletedFilter.length;
    console.log(`[TRASH] Total records in files.json: ${totalRecords}, after user filter: ${afterUserCount}, after is_deleted===true: ${afterDeletedCount}`);
    return afterDeletedFilter
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(f => ({
        id: f.id,
        filename: f.filename,
        size: f.size ?? 0,
        created_at: f.created_at,
        storage_path: f.storage_path,
        folder_id: f.folder_id || null,
        tenant_id: f.tenant_id,
        user_id: f.user_id,
        mime_type: f.mime_type ?? undefined
      }));
  }

  async getFileById(input: { fileId: string; tenantId: string; userId: string }): Promise<FileMeta | null> {
    const files = await this.readFiles();
    const shares = await this.readShares();
    const nUserId = normalizeUserId(input.userId);

    const file = files.find(f => f.id === input.fileId && f.tenant_id === input.tenantId);
    if (!file || toBoolean(file.is_deleted)) return null;

    const isOwner = normalizeUserId(file.user_id) === nUserId;
    const hasDirectShare = shares.some(s =>
      s.file_id === input.fileId &&
      normalizeUserId(s.shared_with_user_id) === nUserId &&
      s.tenant_id === input.tenantId
    );

    if (isOwner || hasDirectShare) {
      return {
        id: file.id,
        filename: file.filename,
        size: file.size ?? 0,
        created_at: file.created_at,
        storage_path: file.storage_path,
        folder_id: file.folder_id || null,
        tenant_id: file.tenant_id,
        user_id: file.user_id,
        mime_type: file.mime_type ?? undefined
      };
    }

    return null;
  }

  async getFileForDownload(input: { fileId: string; tenantId: string; userId: string }): Promise<{ filename: string; storage_path: string } | null> {
    const file = await this.getFileById(input);
    if (!file) return null;
    return { filename: file.filename, storage_path: file.storage_path };
  }

  async saveFileMeta(meta: FileMeta): Promise<void> {
    if (typeof meta.is_deleted !== 'boolean') {
      meta.is_deleted = false;
    }
    const files = await this.readFiles();
    const record: FileRecord = {
      ...meta,
      size: meta.size ?? 0,
      created_at: typeof meta.created_at === 'string' ? meta.created_at : meta.created_at.toISOString(),
      mime_type: meta.mime_type || null,
      folder_id: meta.folder_id ?? null,
      is_deleted: meta.is_deleted === true
    };
    files.push(record);
    await this.writeFiles(files);
  }

  async deleteFileMeta(input: { fileId: string; tenantId: string; userId: string }): Promise<{ storage_path: string } | null> {
    const files = await this.readFiles();
    const nUserId = normalizeUserId(input.userId);
    const file = files.find(f =>
      f.id === input.fileId &&
      f.tenant_id === input.tenantId &&
      normalizeUserId(f.user_id) === nUserId
    );

    if (!file) return null;

    // Soft delete: set is_deleted = true (boolean); do not remove record or physical file
    const updatedFiles = files.map(f =>
      f.id === input.fileId ? { ...f, is_deleted: true as boolean } : f
    );
    await this.writeFiles(updatedFiles);

    return { storage_path: file.storage_path };
  }

  async restoreFileMeta(input: { fileId: string; tenantId: string; userId: string }): Promise<boolean> {
    const files = await this.readFiles();
    const nUserId = normalizeUserId(input.userId);
    const idx = files.findIndex(f =>
      f.id === input.fileId &&
      f.tenant_id === input.tenantId &&
      normalizeUserId(f.user_id) === nUserId
    );
    if (idx === -1) return false;

    files[idx] = { ...files[idx], is_deleted: false as boolean };
    await this.writeFiles(files);
    return true;
  }

  async listSharedFiles(input: { tenantId: string; userId: string }): Promise<Array<FileMeta & { shared_at: string | Date; owner_email: string }>> {
    const files = await this.readFiles();
    const shares = await this.readShares();
    const users = await this.readUsers();
    const nUserId = normalizeUserId(input.userId);

    const userShares = shares.filter(s => 
      normalizeUserId(s.shared_with_user_id) === nUserId && 
      s.tenant_id === input.tenantId
    );

    return userShares.map(share => {
      const file = files.find(f => f.id === share.file_id);
      if (!file || toBoolean(file.is_deleted)) return null;
      const owner = users.find(u => u.id === share.owner_user_id);
      return {
        id: file.id,
        filename: file.filename,
        size: file.size ?? 0,
        created_at: file.created_at,
        storage_path: file.storage_path,
        folder_id: file.folder_id || null,
        tenant_id: file.tenant_id,
        user_id: file.user_id,
        mime_type: file.mime_type ?? undefined,
        shared_at: share.created_at,
        owner_email: owner?.email || 'Unknown'
      };
    }).filter(Boolean) as Array<FileMeta & { shared_at: string | Date; owner_email: string }>;
  }

  private async readUsers(): Promise<Array<{ id: string; email: string; tenant_id: string }>> {
    const usersFile = path.join(METADATA_DIR, 'users.json');
    if (!(await fs.pathExists(usersFile))) {
      return [];
    }
    return await fs.readJSON(usersFile);
  }
}

export default FileRepositoryFS;
