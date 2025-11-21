import { config } from '../config/index.js';
import { AirtableService } from './airtable.js';
import { MewsService } from './mews.js';
import type {
  Room,
  Booking,
  MenuItem,
  RoomServiceOrder,
  AvailabilityQuery,
  MenuFilters,
} from '../types/index.js';

/**
 * ========================================
 * PMS SERVICE INTERFACE
 * ========================================
 *
 * This interface defines the contract that all PMS (Property Management System) services must implement.
 * This allows us to easily switch between different PMS providers (Airtable, Mews, etc.)
 * without changing the rest of the application code.
 */
export interface PMSService {
  // Room Operations
  getRooms(): Promise<Room[]>;
  getRoomByNumber(roomNumber: string): Promise<Room | null>;
  checkAvailability(query: AvailabilityQuery): Promise<Room[]>;

  // Booking Operations
  createBooking(booking: Booking): Promise<Booking>;
  updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking>;
  getBookingByRoomNumber(roomNumber: string): Promise<Booking | null>;

  // Menu Operations
  getMenu(filters?: MenuFilters): Promise<MenuItem[]>;
  getMenuItem(itemId: string): Promise<MenuItem | null>;

  // Room Service Operations
  createRoomServiceOrder(order: RoomServiceOrder): Promise<RoomServiceOrder>;
}

/**
 * ========================================
 * SERVICE FACTORY
 * ========================================
 *
 * This factory function creates and returns the appropriate PMS service
 * based on the configuration (PMS_PROVIDER environment variable).
 *
 * Usage:
 *   const pmsService = createPMSService();
 *   const rooms = await pmsService.getRooms();
 *
 * Supported providers:
 *   - 'airtable': Uses Airtable as the backend database
 *   - 'mews': Uses Mews API for hotel management
 */
export function createPMSService(): PMSService {
  const provider = config.pmsProvider;

  switch (provider) {
    case 'airtable':
      return new AirtableService();

    case 'mews':
      return new MewsService();

    default:
      throw new Error(
        `Unsupported PMS provider: ${provider}. Supported providers: 'airtable', 'mews'`
      );
  }
}

/**
 * Export a singleton instance for convenience
 * This can be imported and used throughout the application
 */
export const pmsService = createPMSService();
