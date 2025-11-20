import dotenv from 'dotenv';

dotenv.config();

export const config = {
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
    tables: {
      rooms: process.env.AIRTABLE_ROOMS_TABLE || 'Rooms',
      bookings: process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings',
      menu: process.env.AIRTABLE_MENU_TABLE || 'Menu',
      roomService: process.env.AIRTABLE_ROOM_SERVICE_TABLE || 'RoomService',
    },
  },
  environment: process.env.NODE_ENV || 'development',
};

export function validateConfig(): void {
  if (!config.airtable.apiKey) {
    throw new Error('AIRTABLE_API_KEY is required');
  }
  if (!config.airtable.baseId) {
    throw new Error('AIRTABLE_BASE_ID is required');
  }
}
