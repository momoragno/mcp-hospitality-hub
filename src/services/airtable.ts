import Airtable, { FieldSet, Records } from 'airtable';
import { config } from '../config/index.js';
import type {
  Room,
  Booking,
  AvailabilityQuery,
} from '../types/index.js';

/**
 * ========================================
 * AIRTABLE SERVICE
 * ========================================
 *
 * This service handles all interactions with Airtable database.
 * It provides methods for managing rooms and bookings.
 *
 * Structure:
 * 1. Constructor & Initialization
 * 2. Room Operations
 * 3. Booking Operations
 * 4. Helper Methods
 * 5. Data Mapping Functions
 */
export class AirtableService {
  private base: Airtable.Base;

  // ========================================
  // 1. CONSTRUCTOR & INITIALIZATION
  // ========================================

  constructor() {
    Airtable.configure({
      apiKey: config.airtable.apiKey,
    });
    this.base = Airtable.base(config.airtable.baseId);
  }

  // ========================================
  // 2. ROOM OPERATIONS
  // ========================================

  /**
   * Get all rooms from Airtable
   */
  async getRooms(): Promise<Room[]> {
    const records = await this.base(config.airtable.tables.rooms)
      .select()
      .all();

    return records.map((record) => this.mapRecordToRoom(record));
  }

  /**
   * Get a specific room by its room number
   */
  async getRoomByNumber(roomNumber: string): Promise<Room | null> {
    const records = await this.base(config.airtable.tables.rooms)
      .select({
        filterByFormula: `{Number} = '${roomNumber}'`,
        maxRecords: 1,
      })
      .all();

    return records.length > 0 ? this.mapRecordToRoom(records[0]) : null;
  }

  /**
   * Check room availability based on date range and criteria
   */
  async checkAvailability(query: AvailabilityQuery): Promise<Room[]> {
    const { checkIn, checkOut, guests, roomType } = query;

    // Step 1: Get all rooms from the database
    const allRooms = await this.getRooms();

    // Step 2: Get bookings that overlap with requested dates
    const overlappingBookings = await this.getOverlappingBookings(
      checkIn,
      checkOut
    );

    // Step 3: Create a set of booked room IDs for fast lookup
    const bookedRoomIds = new Set(
      overlappingBookings.map((b) => b.roomId)
    );

    // Step 4: Filter available rooms (not occupied and not booked)
    let availableRooms = allRooms.filter(
      (room) =>
        room.status === 'available' && !bookedRoomIds.has(room.id)
    );

    // Step 5: Apply room type filter if specified
    if (roomType) {
      availableRooms = availableRooms.filter(
        (room) => room.type.toLowerCase() === roomType.toLowerCase()
      );
    }

    // Note: We intentionally do NOT filter by guest capacity here.
    // This allows the AI to suggest multi-room combinations for larger groups.
    // All available rooms are returned, and the AI agent can intelligently
    // combine them based on guest count and preferences.

    return availableRooms;
  }

  // ========================================
  // 3. BOOKING OPERATIONS
  // ========================================

  /**
   * Create a new booking in Airtable
   */
  async createBooking(booking: Booking): Promise<Booking> {
    const record = await this.base(config.airtable.tables.bookings).create({
      RoomId: booking.roomId,
      RoomNumber: booking.roomNumber || '',
      GuestName: booking.guestName,
      GuestEmail: booking.guestEmail || '',
      GuestPhone: booking.guestPhone || '',
      CheckIn: booking.checkIn,
      CheckOut: booking.checkOut,
      Guests: booking.guests,
      TotalPrice: booking.totalPrice || 0,
      Status: booking.status,
      SpecialRequests: booking.specialRequests || '',
    });

    return this.mapRecordToBooking(record);
  }

  /**
   * Update an existing booking
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<Booking> {
    const updateFields: FieldSet = {};

    if (updates.roomId) updateFields.RoomId = updates.roomId;
    if (updates.roomNumber) updateFields.RoomNumber = updates.roomNumber;
    if (updates.guestName) updateFields.GuestName = updates.guestName;
    if (updates.guestEmail) updateFields.GuestEmail = updates.guestEmail;
    if (updates.guestPhone) updateFields.GuestPhone = updates.guestPhone;
    if (updates.checkIn) updateFields.CheckIn = updates.checkIn;
    if (updates.checkOut) updateFields.CheckOut = updates.checkOut;
    if (updates.guests) updateFields.Guests = updates.guests;
    if (updates.totalPrice) updateFields.TotalPrice = updates.totalPrice;
    if (updates.status) updateFields.Status = updates.status;
    if (updates.specialRequests)
      updateFields.SpecialRequests = updates.specialRequests;

    const record = await this.base(config.airtable.tables.bookings).update(
      bookingId,
      updateFields
    );

    return this.mapRecordToBooking(record);
  }

  /**
   * Get active booking for a specific room number
   */
  async getBookingByRoomNumber(roomNumber: string): Promise<Booking | null> {
    // First get the room to get its ID
    const room = await this.getRoomByNumber(roomNumber);
    if (!room) return null;

    const records = await this.base(config.airtable.tables.bookings)
      .select({
        filterByFormula: `AND({RoomId} = '${room.id}', OR({Status} = 'confirmed', {Status} = 'checked-in'))`,
        maxRecords: 1,
      })
      .all();

    return records.length > 0 ? this.mapRecordToBooking(records[0]) : null;
  }

  /**
   * Search for active bookings by multiple criteria
   * Searches by room number, guest name, email, phone, or booking ID
   */
  async searchActiveBookings(query: {
    roomNumber?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    bookingId?: string;
  }): Promise<Booking[]> {
    const { roomNumber, guestName, guestEmail, guestPhone, bookingId } = query;

    // If bookingId is provided, search by ID directly
    if (bookingId) {
      try {
        const record = await this.base(config.airtable.tables.bookings).find(bookingId);
        const booking = this.mapRecordToBooking(record);
        // Check if booking is active
        if (booking.status === 'confirmed' || booking.status === 'checked-in') {
          return [booking];
        }
        return [];
      } catch (error) {
        return [];
      }
    }

    // Build filter formula for Airtable
    const conditions: string[] = [];

    // Always filter for active bookings
    conditions.push(`OR({Status} = 'confirmed', {Status} = 'checked-in')`);

    // Add search conditions - each one becomes an AND condition
    if (roomNumber) {
      const room = await this.getRoomByNumber(roomNumber);
      if (room) {
        // Search by BOTH RoomId and RoomNumber using OR
        // This handles data inconsistencies where RoomId might contain room number
        // instead of Airtable record ID
        conditions.push(`OR({RoomId} = '${room.id}', {RoomNumber} = '${roomNumber}')`);
      } else {
        // Room doesn't exist in Rooms table, search by RoomNumber only
        conditions.push(`{RoomNumber} = '${roomNumber}'`);
      }
    }

    if (guestName) {
      // Case-insensitive search using SEARCH function
      conditions.push(`SEARCH(LOWER('${guestName.toLowerCase()}'), LOWER({GuestName}))`);
    }

    if (guestEmail) {
      conditions.push(`SEARCH(LOWER('${guestEmail.toLowerCase()}'), LOWER({GuestEmail}))`);
    }

    if (guestPhone) {
      conditions.push(`SEARCH('${guestPhone}', {GuestPhone})`);
    }

    // Combine all conditions with AND (not OR)
    const filterFormula = conditions.length > 1
      ? `AND(${conditions.join(', ')})`
      : conditions[0];

    const records = await this.base(config.airtable.tables.bookings)
      .select({
        filterByFormula: filterFormula,
      })
      .all();

    return records.map((record) => this.mapRecordToBooking(record));
  }

  // ========================================
  // 4. HELPER METHODS
  // ========================================

  /**
   * Get bookings that overlap with a given date range
   * Used internally for availability checking
   */
  private async getOverlappingBookings(
    checkIn: string,
    checkOut: string
  ): Promise<Booking[]> {
    // Get all active bookings
    const formula = `OR({Status} = 'confirmed', {Status} = 'checked-in')`;

    const records = await this.base(config.airtable.tables.bookings)
      .select({
        filterByFormula: formula,
      })
      .all();

    const bookings = records.map((record) => this.mapRecordToBooking(record));

    // Filter overlapping bookings in memory
    const requestCheckIn = new Date(checkIn);
    const requestCheckOut = new Date(checkOut);

    return bookings.filter((booking) => {
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      // Check if bookings overlap
      return !(
        bookingCheckOut <= requestCheckIn || bookingCheckIn >= requestCheckOut
      );
    });
  }

  // ========================================
  // 5. DATA MAPPING FUNCTIONS
  // ========================================
  // These functions convert Airtable records to our TypeScript types

  /**
   * Map Airtable record to Room object
   */
  private mapRecordToRoom(record: Records<FieldSet>[0]): Room {
    return {
      id: record.id,
      number: record.get('Number') as string,
      type: record.get('Type') as string,
      price: record.get('Price') as number,
      capacity: record.get('Capacity') as number,
      amenities: (record.get('Amenities') as string)?.split(',').map(a => a.trim()) || [],
      status: record.get('Status') as Room['status'],
    };
  }

  /**
   * Map Airtable record to Booking object
   */
  private mapRecordToBooking(record: Records<FieldSet>[0]): Booking {
    return {
      id: record.id,
      roomId: record.get('RoomId') as string,
      roomNumber: record.get('RoomNumber') as string,
      guestName: record.get('GuestName') as string,
      guestEmail: record.get('GuestEmail') as string,
      guestPhone: record.get('GuestPhone') as string,
      checkIn: record.get('CheckIn') as string,
      checkOut: record.get('CheckOut') as string,
      guests: record.get('Guests') as number,
      totalPrice: record.get('TotalPrice') as number,
      status: record.get('Status') as Booking['status'],
      specialRequests: record.get('SpecialRequests') as string,
    };
  }
}
