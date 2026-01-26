/**
 * User Repository Interface
 * 
 * Abstraction layer for user lookup operations.
 * Used primarily for sharing validation.
 */

export interface UserMeta {
  id: string;
  email: string;
  tenant_id: string;
}

export interface UserRepository {
  /**
   * Find user by email within a tenant
   */
  findByEmail(input: {
    email: string;
    tenantId: string;
  }): Promise<UserMeta | null>;

  /**
   * Find user by ID within a tenant
   */
  findById(input: {
    userId: string;
    tenantId: string;
  }): Promise<UserMeta | null>;
}
