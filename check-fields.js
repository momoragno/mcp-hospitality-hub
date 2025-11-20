import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

async function checkFields() {
  console.log('Checking Airtable table structures...\n');

  const tables = ['Rooms', 'Bookings', 'Menu', 'RoomService'];

  for (const tableName of tables) {
    try {
      console.log('Table:', tableName);
      const records = await base(tableName).select({ maxRecords: 1 }).all();

      if (records.length > 0) {
        const fields = Object.keys(records[0].fields);
        console.log('Fields:', fields);
      } else {
        console.log('(Empty table)');
      }
      console.log();
    } catch (error) {
      console.log('Error:', error.message);
      console.log();
    }
  }
}

checkFields();
