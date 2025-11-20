#!/usr/bin/env node

/**
 * Script di test locale per verificare la connessione Airtable
 * senza dover usare MCP Inspector
 *
 * Usage: node test-local.js
 */

import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error('❌ Errore: AIRTABLE_API_KEY o AIRTABLE_BASE_ID non configurati');
  console.error('   Assicurati di aver creato il file .env con le credenziali corrette');
  process.exit(1);
}

Airtable.configure({ apiKey: API_KEY });
const base = Airtable.base(BASE_ID);

async function testConnection() {
  console.log('🔍 Testing Airtable connection...\n');

  try {
    // Test 1: Rooms
    console.log('1️⃣  Testing Rooms table...');
    const rooms = await base('Rooms').select({ maxRecords: 3 }).all();
    console.log(`   ✅ Found ${rooms.length} rooms`);
    rooms.forEach(room => {
      console.log(`      - Room ${room.get('Number')}: ${room.get('Type')} (€${room.get('Price')}/night)`);
    });
    console.log();

    // Test 2: Menu
    console.log('2️⃣  Testing Menu table...');
    const menu = await base('Menu').select({ maxRecords: 3 }).all();
    console.log(`   ✅ Found ${menu.length} menu items`);
    menu.forEach(item => {
      console.log(`      - ${item.get('Name')}: €${item.get('Price')} (${item.get('Category')})`);
    });
    console.log();

    // Test 3: Bookings
    console.log('3️⃣  Testing Bookings table...');
    const bookings = await base('Bookings').select({ maxRecords: 3 }).all();
    console.log(`   ✅ Found ${bookings.length} bookings`);
    bookings.forEach(booking => {
      console.log(`      - ${booking.get('GuestName')}: Room ${booking.get('RoomNumber')} (${booking.get('Status')})`);
    });
    console.log();

    // Test 4: Room Service
    console.log('4️⃣  Testing RoomService table...');
    const orders = await base('RoomService').select({ maxRecords: 3 }).all();
    console.log(`   ✅ Found ${orders.length} room service orders`);
    orders.forEach(order => {
      console.log(`      - Room ${order.get('RoomNumber')}: €${order.get('TotalAmount')} (${order.get('Status')})`);
    });
    console.log();

    console.log('✅ All tests passed! Your Airtable is configured correctly.\n');
    console.log('Next steps:');
    console.log('  1. Run "npm run inspector" to test with MCP Inspector');
    console.log('  2. Or integrate with Claude Desktop / ElevenLabs');
    console.log('  3. See QUICKSTART.md for more details');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  - Wrong API Key or Base ID');
    console.error('  - Table names don\'t match (check .env)');
    console.error('  - Tables are empty (add some test data)');
    console.error('  - API Key doesn\'t have correct permissions');
    console.error('\nSee AIRTABLE_SETUP.md for configuration help');
    process.exit(1);
  }
}

testConnection();
