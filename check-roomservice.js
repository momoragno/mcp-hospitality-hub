import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
const base = Airtable.base(process.env.AIRTABLE_BASE_ID);

async function check() {
  console.log('Checking RoomService table in detail...\n');

  const records = await base('RoomService').select({ maxRecords: 3 }).all();

  console.log('Found', records.length, 'records\n');

  records.forEach((record, i) => {
    console.log('Record', i + 1);
    console.log('  ID:', record.id);
    console.log('  Fields:', record.fields);
    console.log();
  });
}

check();
