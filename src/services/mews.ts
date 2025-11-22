import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import type {
  Room,
  Booking,
  AvailabilityQuery,
} from '../types/index.js';

/**
 * ========================================
 * MEWS SERVICE
 * ========================================
 *
 * This service handles all interactions with Mews API.
 * Mews is a hotel management system (PMS - Property Management System).
 * It provides methods for managing rooms and bookings.
 *
 * Structure:
 * 1. Constructor & Initialization
 * 2. Room Operations
 * 3. Booking Operations
 * 4. Helper Methods
 * 5. Data Mapping Functions
 *
 * API Documentation: https://mews-systems.gitbook.io/connector-api
 */
export class MewsService {
  private client: AxiosInstance;
  private accessToken: string;
  private clientToken: string;

  // ========================================
  // 1. CONSTRUCTOR & INITIALIZATION
  // ========================================

  constructor() {
    this.accessToken = config.mews.accessToken;
    this.clientToken = config.mews.clientToken;

    // Initialize HTTP client with base configuration
    this.client = axios.create({
      baseURL: config.mews.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ========================================
  // 2. ROOM OPERATIONS
  // ========================================

  /**
   * Get all rooms/spaces from Mews
   * In Mews terminology, rooms are called "Resources"
   */
  async getRooms(): Promise<Room[]> {
    const response = await this.client.post('/api/connector/v1/resources/getAll', {
      AccessToken: this.accessToken,
      ClientToken: this.clientToken,
      ServiceIds: [config.mews.serviceId],
    });

    return response.data.Resources.map((resource: any) =>
      this.mapMewsResourceToRoom(resource)
    );
  }

  /**
   * Get a specific room by its room number
   * Maps to Mews Resource by name/number
   */
  async getRoomByNumber(roomNumber: string): Promise<Room | null> {
    const allRooms = await this.getRooms();
    const room = allRooms.find(r => r.number === roomNumber);
    return room || null;
  }

  /**
   * Check room availability based on date range and criteria
   * Uses Mews Availability endpoint
   */
  async checkAvailability(query: AvailabilityQuery): Promise<Room[]> {
    const { checkIn, checkOut, guests, roomType } = query;

    // Step 1: Get availability from Mews API
    const response = await this.client.post('/api/connector/v1/resources/getAllAvailability', {
      AccessToken: this.accessToken,
      ClientToken: this.clientToken,
      ServiceId: config.mews.serviceId,
      StartUtc: checkIn,
      EndUtc: checkOut,
    });

    // Step 2: Filter available resources
    const availableResourceIds = response.data.ResourceAvailabilities
      .filter((ra: any) => ra.AvailableCount > 0)
      .map((ra: any) => ra.ResourceId);

    // Step 3: Get all rooms and filter by availability
    const allRooms = await this.getRooms();
    let availableRooms = allRooms.filter(room =>
      availableResourceIds.includes(room.id)
    );

    // Step 4: Apply room type filter if specified
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
   * Create a new booking (reservation) in Mews
   * In Mews, bookings are created through the Reservations endpoint
   */
  async createBooking(booking: Booking): Promise<Booking> {
    // Step 1: Create or get customer
    const customer = await this.createOrGetCustomer({
      name: booking.guestName,
      email: booking.guestEmail,
      phone: booking.guestPhone,
    });

    // Step 2: Create the reservation
    const response = await this.client.post('/api/connector/v1/reservations/add', {
      AccessToken: this.accessToken,
      ClientToken: this.clientToken,
      Reservations: [{
        ServiceId: config.mews.serviceId,
        ResourceId: booking.roomId,
        CustomerId: customer.Id,
        StartUtc: booking.checkIn,
        EndUtc: booking.checkOut,
        State: 'Confirmed',
        Notes: booking.specialRequests || '',
        AdultCount: booking.guests,
      }],
    });

    const mewsReservation = response.data.Reservations[0];
    return this.mapMewsReservationToBooking(mewsReservation);
  }

  /**
   * Update an existing booking/reservation
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<Booking> {
    const updateData: any = {
      AccessToken: this.accessToken,
      ClientToken: this.clientToken,
      ReservationId: bookingId,
    };

    // Map our updates to Mews format
    if (updates.checkIn) updateData.StartUtc = updates.checkIn;
    if (updates.checkOut) updateData.EndUtc = updates.checkOut;
    if (updates.guests) updateData.AdultCount = updates.guests;
    if (updates.specialRequests) updateData.Notes = updates.specialRequests;
    if (updates.status) updateData.State = this.mapStatusToMewsState(updates.status);

    const response = await this.client.post('/api/connector/v1/reservations/update', updateData);

    return this.mapMewsReservationToBooking(response.data.Reservations[0]);
  }

  /**
   * Get active booking for a specific room number
   * Searches for confirmed or checked-in reservations for the room
   */
  async getBookingByRoomNumber(roomNumber: string): Promise<Booking | null> {
    // Step 1: Get the room to get its ID
    const room = await this.getRoomByNumber(roomNumber);
    if (!room) return null;

    // Step 2: Get all reservations for this resource
    const response = await this.client.post('/api/connector/v1/reservations/getAll', {
      AccessToken: this.accessToken,
      ClientToken: this.clientToken,
      ServiceIds: [config.mews.serviceId],
      ResourceIds: [room.id],
      States: ['Confirmed', 'Started'], // Started = checked-in
    });

    const reservations = response.data.Reservations;
    if (reservations.length === 0) return null;

    // Return the first active reservation
    return this.mapMewsReservationToBooking(reservations[0]);
  }

  // ========================================
  // 4. HELPER METHODS
  // ========================================

  /**
   * Create or get a customer in Mews
   * Used internally when creating bookings
   */
  private async createOrGetCustomer(customerData: {
    name: string;
    email?: string;
    phone?: string;
  }): Promise<any> {
    // Try to find existing customer by email
    if (customerData.email) {
      try {
        const searchResponse = await this.client.post('/api/connector/v1/customers/search', {
          AccessToken: this.accessToken,
          ClientToken: this.clientToken,
          Email: customerData.email,
        });

        if (searchResponse.data.Customers.length > 0) {
          return searchResponse.data.Customers[0];
        }
      } catch (error) {
        // Customer not found, will create new one
      }
    }

    // Create new customer
    const response = await this.client.post('/api/connector/v1/customers/add', {
      AccessToken: this.accessToken,
      ClientToken: this.clientToken,
      Customers: [{
        FirstName: customerData.name.split(' ')[0],
        LastName: customerData.name.split(' ').slice(1).join(' '),
        Email: customerData.email || '',
        Phone: customerData.phone || '',
      }],
    });

    return response.data.Customers[0];
  }

  /**
   * Map our booking status to Mews state
   */
  private mapStatusToMewsState(status: Booking['status']): string {
    const statusMap: Record<Booking['status'], string> = {
      'confirmed': 'Confirmed',
      'checked-in': 'Started',
      'checked-out': 'Processed',
      'cancelled': 'Canceled',
    };
    return statusMap[status] || 'Confirmed';
  }

  /**
   * Map Mews state to our booking status
   */
  private mapMewsStateToStatus(state: string): Booking['status'] {
    const stateMap: Record<string, Booking['status']> = {
      'Confirmed': 'confirmed',
      'Started': 'checked-in',
      'Processed': 'checked-out',
      'Canceled': 'cancelled',
    };
    return stateMap[state] || 'confirmed';
  }

  // ========================================
  // 5. DATA MAPPING FUNCTIONS
  // ========================================
  // These functions convert Mews API responses to our TypeScript types

  /**
   * Map Mews Resource to Room object
   * In Mews, rooms are called "Resources"
   */
  private mapMewsResourceToRoom(resource: any): Room {
    return {
      id: resource.Id,
      number: resource.Name || resource.Number || '',
      type: resource.Type || 'standard',
      price: resource.Price?.Amount || 0,
      capacity: resource.Capacity || 2,
      amenities: resource.Description ? resource.Description.split(',').map((a: string) => a.trim()) : [],
      status: this.mapMewsResourceStateToStatus(resource.State),
    };
  }

  /**
   * Map Mews resource state to our room status
   */
  private mapMewsResourceStateToStatus(state: string): Room['status'] {
    // Mews resource states: Clean, Dirty, Inspected, OutOfService, OutOfOrder
    if (state === 'OutOfService' || state === 'OutOfOrder') {
      return 'maintenance';
    }
    return 'available'; // Default to available
  }

  /**
   * Map Mews Reservation to Booking object
   */
  private mapMewsReservationToBooking(reservation: any): Booking {
    return {
      id: reservation.Id,
      roomId: reservation.ResourceId,
      roomNumber: reservation.ResourceName || '',
      guestName: reservation.CustomerName || '',
      guestEmail: reservation.CustomerEmail || '',
      guestPhone: reservation.CustomerPhone || '',
      checkIn: reservation.StartUtc,
      checkOut: reservation.EndUtc,
      guests: reservation.AdultCount || 1,
      totalPrice: reservation.TotalAmount?.Amount || 0,
      status: this.mapMewsStateToStatus(reservation.State),
      specialRequests: reservation.Notes || '',
    };
  }
}
