import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Airtable Configuration
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

  // Mews Configuration
  mews: {
    apiUrl: process.env.MEWS_API_URL || 'https://api.mews.com',
    accessToken: process.env.MEWS_ACCESS_TOKEN || '',
    clientToken: process.env.MEWS_CLIENT_TOKEN || '',
    serviceId: process.env.MEWS_SERVICE_ID || '', // Hotel/property ID in Mews
  },

  // Langfuse Configuration (Analytics)
  langfuse: {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
    secretKey: process.env.LANGFUSE_SECRET_KEY || '',
    host: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
  },

  // General Configuration
  environment: process.env.NODE_ENV || 'development',
  pmsProvider: process.env.PMS_PROVIDER || 'airtable', // 'airtable' or 'mews'
};

export function validateConfig(): void {
  const provider = config.pmsProvider;

  if (provider === 'airtable') {
    // Validate Airtable configuration
    if (!config.airtable.apiKey) {
      throw new Error('AIRTABLE_API_KEY is required when using Airtable provider');
    }
    if (!config.airtable.baseId) {
      throw new Error('AIRTABLE_BASE_ID is required when using Airtable provider');
    }
  } else if (provider === 'mews') {
    // Validate Mews configuration
    if (!config.mews.accessToken) {
      throw new Error('MEWS_ACCESS_TOKEN is required when using Mews provider');
    }
    if (!config.mews.clientToken) {
      throw new Error('MEWS_CLIENT_TOKEN is required when using Mews provider');
    }
    if (!config.mews.serviceId) {
      throw new Error('MEWS_SERVICE_ID is required when using Mews provider');
    }
  } else {
    throw new Error(`Invalid PMS_PROVIDER: ${provider}. Must be 'airtable' or 'mews'`);
  }
}
