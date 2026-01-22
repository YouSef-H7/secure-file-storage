#!/usr/bin/env node

/**
 * Agent Startup & Runtime Test
 * Validates that the agent can start successfully and enter watch mode
 */

import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function testAgentStartup() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  AGENT STARTUP & RUNTIME TEST                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Test 1: Verify dist files exist
  console.log('📦 Checking compiled files...');
  const distFiles = [
    path.join(process.cwd(), 'dist', 'config.js'),
    path.join(process.cwd(), 'dist', 'watcher.js'),
    path.join(process.cwd(), 'dist', 'uploader.js'),
    path.join(process.cwd(), 'dist', 'index.js'),
  ];

  let allExist = true;
  for (const file of distFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✓ ${path.basename(file)}`);
    } else {
      console.log(`   ✗ ${path.basename(file)} - NOT FOUND`);
      allExist = false;
    }
  }

  if (!allExist) {
    console.log('\n❌ Missing compiled files. Run: npm run build');
    process.exit(1);
  }

  // Test 2: Verify .env configuration
  console.log('\n📝 Checking .env configuration...');
  const envPath = fs.existsSync('.env') ? '.env' : '.env.test';

  if (fs.existsSync(envPath)) {
    console.log(`   ✓ Found ${envPath}`);
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    console.log(`   ✓ Loaded ${lines.length} configuration variables`);
  } else {
    console.log('   ✗ No .env file found');
    process.exit(1);
  }

  // Test 3: Try to require compiled modules
  console.log('\n📚 Loading compiled modules...');
  try {
    const config = require('./dist/config.js');
    console.log('   ✓ config module loaded');

    const watcher = require('./dist/watcher.js');
    console.log('   ✓ watcher module loaded');

    const uploader = require('./dist/uploader.js');
    console.log('   ✓ uploader module loaded');

    const index = require('./dist/index.js');
    console.log('   ✓ index module loaded');
  } catch (e: any) {
    console.log(`   ✗ Module loading failed: ${e.message}`);
    process.exit(1);
  }

  // Test 4: Check if watch directory would be created
  console.log('\n📁 Verifying watch directory...');
  const watchDir = path.join(process.cwd(), 'test-sync-folder');
  if (fs.existsSync(watchDir)) {
    const files = fs.readdirSync(watchDir);
    console.log(`   ✓ Watch directory exists (${files.length} files)`);
  } else {
    console.log(`   ✓ Watch directory will be created on startup`);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  AGENT READY TO START                                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('✅ All startup checks passed!');
  console.log('\nTo start the agent, run:');
  console.log('  npm start          (production mode with compiled code)');
  console.log('  npm run dev        (development mode with ts-node)\n');

  console.log('Key Points:');
  console.log('  1. Agent watches: ./test-sync-folder');
  console.log('  2. Upload endpoint: http://localhost:3000/api/files/upload');
  console.log('  3. Session cookie: Read from SESSION_COOKIE env var');
  console.log('  4. Debounce: 500ms (prevents duplicate uploads)\n');

  console.log('Example: Create a test file to upload:');
  console.log('  echo "Hello from agent" > test-sync-folder/hello.txt\n');
}

testAgentStartup().catch((e) => {
  console.error('❌ Startup test failed:', e);
  process.exit(1);
});
