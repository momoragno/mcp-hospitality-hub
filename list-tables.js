import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

console.log('Verifico accesso alle tabelle...\n');

const tables = ['Room Info', 'Bookings', 'Menu', 'RoomService'];

for (const table of tables) {
  try {
    Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
    const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    await base(table).select({ maxRecords: 1 }).firstPage();
    console.log('✅', table);
  } catch (error) {
    console.log('❌', table, '-', error.message);
  }
}
