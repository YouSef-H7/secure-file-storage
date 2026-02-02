import db from '../db';

const initSchema = async () => {
  try {
    console.log('[SCHEMA] Initializing shared_files table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shared_files (
        id VARCHAR(36) PRIMARY KEY,
        file_id VARCHAR(36) NOT NULL,
        owner_user_id VARCHAR(36) NOT NULL,
        shared_with_user_id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) NOT NULL,
        permission ENUM('read') DEFAULT 'read',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shared_target (shared_with_user_id, tenant_id),
        INDEX idx_shared_file (file_id, tenant_id)
      ) ENGINE=InnoDB;
    `);

    // Folders Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS folders (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(36) NOT NULL,
        owner_user_id VARCHAR(36) NOT NULL,
        parent_folder_id VARCHAR(36) NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_folder_tenant (tenant_id),
        INDEX idx_folder_parent (parent_folder_id)
      ) ENGINE=InnoDB;
    `);

    // Folder Shares Table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS folder_shares (
            id VARCHAR(36) PRIMARY KEY,
            folder_id VARCHAR(36) NOT NULL,
            shared_with_user_id VARCHAR(36) NOT NULL,
            tenant_id VARCHAR(36) NOT NULL,
            permission ENUM('read') DEFAULT 'read',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_folder_share_target (shared_with_user_id, folder_id)
        ) ENGINE=InnoDB;
    `);

    // Add folder_id to files
    try {
      await db.execute(`
            ALTER TABLE files 
            ADD COLUMN folder_id VARCHAR(36) NULL,
            ADD INDEX idx_file_folder (folder_id);
        `);
    } catch (e: any) {
      // Ignore "Duplicate column name" error (Code 1060)
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn('[SCHEMA] Note on adding folder_id:', e.message);
      }
    }

    // Add is_deleted (soft delete) to files
    try {
      await db.execute(`ALTER TABLE files ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE`);
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn('[SCHEMA] Note on adding is_deleted:', e.message);
      }
    }

    console.log('[SCHEMA] shared_files, folders, folder_shares tables ready');
  } catch (err) {
    console.error('[SCHEMA] Failed to init shared_files:', err);
  }
};

export default initSchema;
