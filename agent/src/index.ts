import { config, log, logWarn } from './config';
import { FileWatcher } from './watcher';
import { FileUploader } from './uploader';

/**
 * Local Sync Agent
 * Watches a local folder and syncs files to Secure File Storage backend
 * One-way sync: Local → Backend
 */
class SyncAgent {
  private watcher: FileWatcher;
  private uploader: FileUploader;
  private uploadCount: number = 0;

  constructor() {
    this.watcher = new FileWatcher();
    this.uploader = new FileUploader();
  }

  /**
   * Start the sync agent
   */
  async start(): Promise<void> {
    try {
      log('╔════════════════════════════════════════════════════╗');
      log('║   Secure File Storage - Local Sync Agent (PoC)      ║');
      log('╚════════════════════════════════════════════════════╝');
      log('');
      log(`Configuration:`);
      log(`  Watch Directory: ${config.watchDir}`);
      log(`  API Endpoint: ${config.apiBaseUrl}`);
      log(`  Debounce Delay: ${config.debounceDelay}ms`);
      log('');

      // Test backend connectivity
      log('Testing backend connectivity...');
      const isConnected = await this.uploader.testConnection();

      if (!isConnected) {
        logWarn('Warning: Could not reach backend');
        logWarn('Make sure:');
        logWarn('  1. Backend is running on ' + config.apiBaseUrl);
        logWarn('  2. SESSION_COOKIE is valid (sign in via web UI first)');
        logWarn('  3. Your session is still active');
        logWarn('');
        logWarn('Continuing anyway - will retry on file events...');
        log('');
      } else {
        log('✓ Backend is reachable');
        log('');
      }

      // Start watching
      log('Starting file watcher...');
      await this.watcher.start((filePath: string, eventType: string) =>
        this.onFileEvent(filePath, eventType)
      );

      log('✓ Sync agent is now running');
      log('Waiting for file changes...');
      log('Press Ctrl+C to stop');
      log('');
    } catch (error) {
      log('✗ Failed to start sync agent');
      if (error instanceof Error) {
        log('Error: ' + error.message);
      }
      process.exit(1);
    }
  }

  /**
   * Handle file change event
   */
  private async onFileEvent(filePath: string, eventType: string): Promise<void> {
    const success = await this.uploader.uploadFile(filePath);
    if (success) {
      this.uploadCount++;
    }
  }

  /**
   * Stop the sync agent
   */
  async stop(): Promise<void> {
    log('');
    log('Shutting down sync agent...');
    await this.watcher.stop();
    log(`Total files uploaded: ${this.uploadCount}`);
    log('Goodbye!');
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const agent = new SyncAgent();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await agent.stop();
    process.exit(0);
  });

  // Start the agent
  await agent.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SyncAgent };
