import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { config, log, logDebug, logError } from './config';

export type FileEventCallback = (filePath: string, eventType: 'add' | 'change') => Promise<void>;

/**
 * Debounce helper to delay execution
 */
function debounce(func: () => void, wait: number): () => void {
  let timeout: NodeJS.Timeout | null = null;

  return function () {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func();
      timeout = null;
    }, wait);
  };
}

/**
 * File system watcher using chokidar
 * Watches for file additions and modifications
 */
export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private isReady: boolean = false;
  private pendingUploads: Set<string> = new Set();

  /**
   * Start watching the configured directory
   */
  async start(onFileEvent: FileEventCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        log(`Starting file watcher on: ${config.watchDir}`);

        const watcherOptions: chokidar.WatchOptions = {
          persistent: true,
          ignored: /(^|[\/\\])\.|node_modules/, // Ignore hidden files and node_modules
          awaitWriteFinish: {
            stabilityThreshold: 2000, // Wait 2s for file to stabilize
            pollInterval: 100,
          },
          usePolling: config.pollInterval > 0,
          interval: config.pollInterval || undefined,
        };

        this.watcher = chokidar.watch(config.watchDir, watcherOptions);

        this.watcher.on('ready', () => {
          this.isReady = true;
          log('File watcher is ready');
          resolve();
        });

        this.watcher.on('add', (filePath: string) => {
          if (!this.isReady) return; // Skip initial scan

          logDebug(`File added: ${filePath}`);
          this.handleFileEvent(filePath, 'add', onFileEvent);
        });

        this.watcher.on('change', (filePath: string) => {
          if (!this.isReady) return; // Skip initial scan

          logDebug(`File changed: ${filePath}`);
          this.handleFileEvent(filePath, 'change', onFileEvent);
        });

        this.watcher.on('error', (error: Error) => {
          logError('Watcher error', error);
        });
      } catch (error) {
        logError('Failed to start watcher', error as Error);
        reject(error);
      }
    });
  }

  /**
   * Handle file event with debouncing to avoid duplicate uploads
   */
  private handleFileEvent(
    filePath: string,
    eventType: 'add' | 'change',
    onFileEvent: FileEventCallback
  ): void {
    // Skip if already pending
    if (this.pendingUploads.has(filePath)) {
      logDebug(`File already pending upload: ${filePath}`);
      return;
    }

    // Skip if file doesn't exist (deleted after event)
    if (!fs.existsSync(filePath)) {
      logDebug(`File no longer exists: ${filePath}`);
      return;
    }

    // Skip directories
    if (fs.statSync(filePath).isDirectory()) {
      logDebug(`Skipping directory: ${filePath}`);
      return;
    }

    this.pendingUploads.add(filePath);

    // Debounce the upload
    const debouncedUpload = debounce(() => {
      this.pendingUploads.delete(filePath);
      onFileEvent(filePath, eventType).catch((error: Error) => {
        logError(`Failed to upload file ${filePath}`, error);
      });
    }, config.debounceDelay);

    debouncedUpload();
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      log('File watcher stopped');
    }
  }
}
