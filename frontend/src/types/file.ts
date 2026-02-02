export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  /** API may return filename instead of name; use name ?? filename when displaying */
  filename?: string;
  /** API may return created_at instead of createdAt; use createdAt ?? created_at when displaying */
  created_at?: string;
}
