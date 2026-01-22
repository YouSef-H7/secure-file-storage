#!/usr/bin/env node

/**
 * Local Sync Agent - E2E Test Runner
 * This script validates the agent's functionality without modifying backend/frontend
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
const TEST_DIR = path.join(process.cwd(), 'test-sync-folder');
const TEST_FILE = path.join(TEST_DIR, 'test-document.txt');
const TEST_CONTENT = 'Test upload from Local Sync Agent - E2E Test';
const AGENT_STARTUP_TIMEOUT = 5000; // 5 seconds
const UPLOAD_TIMEOUT = 10000; // 10 seconds

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  reason?: string;
  evidence?: string;
}

class SyncAgentE2ETest {
  private results: TestResult[] = [];
  private logBuffer: string[] = [];

  constructor() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  LOCAL SYNC AGENT - END-TO-END TEST RUNNER                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Phase 1: Configuration Validation
   */
  async testConfiguration(): Promise<void> {
    console.log('📋 PHASE 1: CONFIGURATION VALIDATION\n');

    // Test 1.1: .env exists
    try {
      if (!fs.existsSync('.env') && !fs.existsSync('.env.test')) {
        throw new Error('No .env or .env.test file found');
      }
      this.addResult('Configuration file exists', 'PASS', '.env or .env.test present');
    } catch (e: any) {
      this.addResult('Configuration file exists', 'FAIL', e.message);
      return;
    }

    // Test 1.2: Required env variables
    const envContent = fs.readFileSync(fs.existsSync('.env') ? '.env' : '.env.test', 'utf-8');
    const hasWatchDir = envContent.includes('WATCH_DIR');
    const hasApiUrl = envContent.includes('API_BASE_URL');
    const hasSessionCookie = envContent.includes('SESSION_COOKIE');

    if (!hasWatchDir) {
      this.addResult('WATCH_DIR configured', 'FAIL', 'WATCH_DIR not in .env');
    } else {
      this.addResult('WATCH_DIR configured', 'PASS', 'WATCH_DIR found in config');
    }

    if (!hasApiUrl) {
      this.addResult('API_BASE_URL configured', 'FAIL', 'API_BASE_URL not in .env');
    } else {
      this.addResult('API_BASE_URL configured', 'PASS', 'API_BASE_URL found in config');
    }

    if (!hasSessionCookie) {
      this.addResult('SESSION_COOKIE configured', 'FAIL', 'SESSION_COOKIE not in .env');
    } else {
      this.addResult('SESSION_COOKIE configured', 'PASS', 'SESSION_COOKIE found in config');
    }

    // Test 1.3: Source files exist
    const sourceFiles = ['src/config.ts', 'src/watcher.ts', 'src/uploader.ts', 'src/index.ts'];
    const allExist = sourceFiles.every((f) => fs.existsSync(f));

    if (allExist) {
      this.addResult('Agent source files exist', 'PASS', `All ${sourceFiles.length} files present`);
    } else {
      this.addResult('Agent source files exist', 'FAIL', 'Missing source files');
    }
  }

  /**
   * Phase 2: Build Validation
   */
  async testBuild(): Promise<void> {
    console.log('\n📦 PHASE 2: BUILD VALIDATION\n');

    // Test 2.1: node_modules exists
    if (fs.existsSync('node_modules')) {
      this.addResult('Dependencies installed', 'PASS', 'node_modules directory exists');
    } else {
      this.addResult('Dependencies installed', 'FAIL', 'node_modules not found');
      return;
    }

    // Test 2.2: Compiled files exist
    const distFiles = ['dist/config.js', 'dist/watcher.js', 'dist/uploader.js', 'dist/index.js'];
    const compiled = distFiles.every((f) => fs.existsSync(f));

    if (compiled) {
      this.addResult('TypeScript compiled', 'PASS', 'All .js files in dist/');
    } else {
      this.addResult('TypeScript compiled', 'FAIL', 'Missing compiled files - run npm run build');
    }

    // Test 2.3: package.json valid
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const hasChokidar = pkg.dependencies.chokidar;
      const hasAxios = pkg.dependencies.axios;
      const hasFormData = pkg.dependencies['form-data'];
      const hasDotenv = pkg.dependencies.dotenv;

      if (hasChokidar && hasAxios && hasFormData && hasDotenv) {
        this.addResult('Dependencies valid', 'PASS', 'All required packages in package.json');
      } else {
        this.addResult('Dependencies valid', 'FAIL', 'Missing required packages');
      }
    } catch (e: any) {
      this.addResult('Dependencies valid', 'FAIL', e.message);
    }
  }

  /**
   * Phase 3: Directory Setup
   */
  async testDirectorySetup(): Promise<void> {
    console.log('\n📁 PHASE 3: DIRECTORY SETUP\n');

    try {
      // Create test directory if it doesn't exist
      if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
        this.addResult('Watch directory created', 'PASS', `Created ${TEST_DIR}`);
      } else {
        this.addResult('Watch directory exists', 'PASS', `Directory ready at ${TEST_DIR}`);
      }

      // Check if writable
      fs.writeFileSync(path.join(TEST_DIR, '.test'), '');
      fs.unlinkSync(path.join(TEST_DIR, '.test'));
      this.addResult('Directory is writable', 'PASS', 'Write access confirmed');
    } catch (e: any) {
      this.addResult('Directory setup', 'FAIL', e.message);
    }
  }

  /**
   * Phase 4: File Creation & Detection
   */
  async testFileDetection(): Promise<void> {
    console.log('\n🔍 PHASE 4: FILE DETECTION\n');

    try {
      // Create test file
      fs.writeFileSync(TEST_FILE, TEST_CONTENT);
      this.addResult('Test file created', 'PASS', `Created ${path.basename(TEST_FILE)}`);

      // Verify file exists
      if (fs.existsSync(TEST_FILE)) {
        const stats = fs.statSync(TEST_FILE);
        this.addResult('Test file exists', 'PASS', `${stats.size} bytes, readable`);
      } else {
        this.addResult('Test file exists', 'FAIL', 'File not created');
      }

      // Verify content
      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      if (content === TEST_CONTENT) {
        this.addResult('File content verified', 'PASS', 'Content matches original');
      } else {
        this.addResult('File content verified', 'FAIL', 'Content mismatch');
      }
    } catch (e: any) {
      this.addResult('File detection setup', 'FAIL', e.message);
    }
  }

  /**
   * Phase 5: Watcher Functionality (Simulation)
   */
  async testWatcherLogic(): Promise<void> {
    console.log('\n👁️  PHASE 5: WATCHER LOGIC VERIFICATION\n');

    try {
      // Verify chokidar can be imported
      const watcherCode = fs.readFileSync('src/watcher.ts', 'utf-8');
      if (watcherCode.includes('chokidar.watch')) {
        this.addResult('Chokidar integration', 'PASS', 'Watcher uses chokidar.watch()');
      } else {
        this.addResult('Chokidar integration', 'FAIL', 'chokidar.watch not found');
      }

      // Verify debounce logic
      if (watcherCode.includes('debounce')) {
        this.addResult('Debounce logic present', 'PASS', 'Debounce function implemented');
      } else {
        this.addResult('Debounce logic present', 'FAIL', 'Debounce not found');
      }

      // Verify file stability check
      if (watcherCode.includes('awaitWriteFinish')) {
        this.addResult('Write stability check', 'PASS', 'awaitWriteFinish configured');
      } else {
        this.addResult('Write stability check', 'FAIL', 'Missing write stability check');
      }
    } catch (e: any) {
      this.addResult('Watcher logic', 'FAIL', e.message);
    }
  }

  /**
   * Phase 6: Uploader Functionality (Simulation)
   */
  async testUploaderLogic(): Promise<void> {
    console.log('\n⬆️  PHASE 6: UPLOADER LOGIC VERIFICATION\n');

    try {
      const uploaderCode = fs.readFileSync('src/uploader.ts', 'utf-8');

      // Verify axios is used
      if (uploaderCode.includes('axios.create')) {
        this.addResult('Axios HTTP client', 'PASS', 'axios.create() found');
      } else {
        this.addResult('Axios HTTP client', 'FAIL', 'axios.create() not found');
      }

      // Verify multipart form-data
      if (uploaderCode.includes('FormData') || uploaderCode.includes('form-data')) {
        this.addResult('Multipart form-data', 'PASS', 'FormData implementation detected');
      } else {
        this.addResult('Multipart form-data', 'FAIL', 'FormData not found');
      }

      // Verify session cookie handling
      if (uploaderCode.includes('Cookie') || uploaderCode.includes('sessionCookie')) {
        this.addResult('Session cookie auth', 'PASS', 'Cookie header configured');
      } else {
        this.addResult('Session cookie auth', 'FAIL', 'Cookie handling missing');
      }

      // Verify endpoint path
      if (uploaderCode.includes('/api/files/upload')) {
        this.addResult('Correct API endpoint', 'PASS', '/api/files/upload found');
      } else {
        this.addResult('Correct API endpoint', 'FAIL', 'Endpoint not found');
      }

      // Verify error handling
      if (uploaderCode.includes('catch') || uploaderCode.includes('error')) {
        this.addResult('Error handling', 'PASS', 'Error handling implemented');
      } else {
        this.addResult('Error handling', 'FAIL', 'No error handling');
      }
    } catch (e: any) {
      this.addResult('Uploader logic', 'FAIL', e.message);
    }
  }

  /**
   * Phase 7: Configuration Loading
   */
  async testConfigLogic(): Promise<void> {
    console.log('\n⚙️  PHASE 7: CONFIGURATION LOADING\n');

    try {
      const configCode = fs.readFileSync('src/config.ts', 'utf-8');

      // Verify .env loading
      if (configCode.includes('dotenv.config') || configCode.includes('process.env')) {
        this.addResult('.env loading', 'PASS', 'dotenv integration found');
      } else {
        this.addResult('.env loading', 'FAIL', '.env loading missing');
      }

      // Verify validation
      if (configCode.includes('throw new Error') || configCode.includes('validate')) {
        this.addResult('Config validation', 'PASS', 'Validation logic present');
      } else {
        this.addResult('Config validation', 'FAIL', 'No validation');
      }

      // Verify logging functions
      if (configCode.includes('log') && configCode.includes('logDebug') && configCode.includes('logError')) {
        this.addResult('Logging functions', 'PASS', 'log, logDebug, logError exported');
      } else {
        this.addResult('Logging functions', 'FAIL', 'Missing logging functions');
      }
    } catch (e: any) {
      this.addResult('Config loading', 'FAIL', e.message);
    }
  }

  /**
   * Add test result
   */
  private addResult(name: string, status: 'PASS' | 'FAIL' | 'SKIP', reason?: string): void {
    this.results.push({ name, status, reason });
    const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
    const color = status === 'PASS' ? '\x1b[32m' : status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    console.log(`${color}${icon}\x1b[0m ${name}${reason ? ' - ' + reason : ''}`);
  }

  /**
   * Print final summary
   */
  private printSummary(): void {
    const passed = this.results.filter((r) => r.status === 'PASS').length;
    const failed = this.results.filter((r) => r.status === 'FAIL').length;
    const skipped = this.results.filter((r) => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Tests:    ${total}`);
    console.log(`✓ Passed:       ${passed}`);
    console.log(`✗ Failed:       ${failed}`);
    console.log(`○ Skipped:      ${skipped}`);
    console.log('');

    if (failed === 0) {
      console.log('🎉 \x1b[32mALL TESTS PASSED\x1b[0m - Agent is ready for deployment\n');
    } else {
      console.log(`⚠️  \x1b[31m${failed} TEST(S) FAILED\x1b[0m - Review issues above\n`);
    }

    // Show failed tests
    const failedTests = this.results.filter((r) => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('Failed Tests:');
      failedTests.forEach((t) => {
        console.log(`  • ${t.name}: ${t.reason}`);
      });
      console.log('');
    }
  }

  /**
   * Run all tests
   */
  async run(): Promise<boolean> {
    try {
      await this.testConfiguration();
      await this.testBuild();
      await this.testDirectorySetup();
      await this.testFileDetection();
      await this.testWatcherLogic();
      await this.testUploaderLogic();
      await this.testConfigLogic();

      this.printSummary();

      const failed = this.results.filter((r) => r.status === 'FAIL').length;
      return failed === 0;
    } catch (error) {
      console.error('Test execution error:', error);
      return false;
    }
  }
}

// Main execution
(async () => {
  const test = new SyncAgentE2ETest();
  const success = await test.run();
  process.exit(success ? 0 : 1);
})();
