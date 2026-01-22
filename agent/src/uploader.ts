import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { config, log, logDebug, logError } from './config';

/**
 * File uploader using axios + multipart/form-data
 * Uploads files to backend /api/files/upload endpoint
 */
export class FileUploader {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000, // 30 second timeout
      headers: {
        Cookie: config.sessionCookie,
      },
    });

    // Add request interceptor for debugging
    this.client.interceptors.request.use((reqConfig) => {
      logDebug(`[Uploader] ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
      return reqConfig;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logDebug(`[Uploader] Response: ${response.status}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logError(
            `[Uploader] HTTP ${error.response.status}: ${error.response.data?.message || error.message}`
          );
        } else if (error.code === 'ECONNREFUSED') {
          logError('[Uploader] Cannot connect to backend - is it running?');
        } else {
          logError(`[Uploader] Error: ${error.message}`);
        }
        throw error;
      }
    );
  }

  /**
   * Upload a file to the backend
   * @param filePath Absolute path to the file to upload
   * @returns true if upload was successful
   */
  async uploadFile(filePath: string): Promise<boolean> {
    try {
      // Verify file exists
      if (!fs.existsSync(filePath)) {
        logError(`File not found: ${filePath}`);
        return false;
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        logDebug(`Skipping directory: ${filePath}`);
        return false;
      }

      const fileName = path.basename(filePath);
      const fileSize = stats.size;

      logDebug(`Preparing upload: ${fileName} (${this.formatBytes(fileSize)})`);

      // Create form data
      const form = new FormData();
      const fileStream = fs.createReadStream(filePath);
      form.append('file', fileStream, fileName);

      // Upload
      const response = await this.client.post('/api/files/upload', form, {
        headers: form.getHeaders(),
      });

      // Check response
      if (response.status === 200 || response.status === 201) {
        log(`✓ Uploaded: ${fileName} (${this.formatBytes(fileSize)})`);
        logDebug(`Response: ${JSON.stringify(response.data)}`);
        return true;
      } else {
        logError(`Unexpected response status: ${response.status}`);
        return false;
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(`Failed to upload ${filePath}: ${error.message}`);
      } else {
        logError(`Failed to upload ${filePath}: Unknown error`);
      }
      return false;
    }
  }

  /**
   * Test connectivity to backend
   */
  async testConnection(): Promise<boolean> {
    try {
      logDebug('Testing backend connectivity...');
      const response = await this.client.get('/auth/me', {
        timeout: 5000,
      });
      logDebug(`Backend is reachable (status: ${response.status})`);
      return true;
    } catch (error) {
      logError('Cannot reach backend at ' + config.apiBaseUrl);
      return false;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
