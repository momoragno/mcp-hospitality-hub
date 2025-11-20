#!/usr/bin/env node

/**
 * Script per testare i tool MCP direttamente senza Inspector
 */

import { AirtableService } from './dist/services/airtable.js';
import { config, validateConfig } from './dist/config/index.js';

console.log('🧪 Testing MCP Tools Directly\n');

try {
  validateConfig();
  console.log('✅ Configuration validated\n');
} catch (error) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

const service = new AirtableService();

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Get Menu');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const menu = await service.getMenu('dinner');
    console.log('✅ Success! Found', menu.length, 'dinner items');
    if (menu.length > 0) {
      console.log('Example item:', menu[0]);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
  console.log();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Check Availability');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const available = await service.checkAvailability({
      checkIn: '2024-12-15',
      checkOut: '2024-12-17',
      guests: 2,
    });
    console.log('✅ Success! Found', available.length, 'available rooms');
    if (available.length > 0) {
      console.log('Example room:', available[0]);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
  console.log();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Get All Rooms');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const rooms = await service.getRooms();
    console.log('✅ Success! Found', rooms.length, 'total rooms');
    if (rooms.length > 0) {
      console.log('First room:', rooms[0]);
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
  console.log();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ If all tests passed, your MCP server is working!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Use Claude Desktop to test with conversations');
  console.log('  2. Or integrate with ElevenLabs Agent');
  console.log('  3. See QUICKSTART.md for details');
}

runTests().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
