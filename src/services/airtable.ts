import Airtable, { FieldSet, Records } from 'airtable';
import { config } from '../config/index.js';
import type {
  Room,
  Booking,
  MenuItem,
  RoomServiceOrder,
  AvailabilityQuery,
} from '../types/index.js';

export class AirtableService {
  private base: Airtable.Base;

  constructor() {
    Airtable.configure({
      apiKey: config.airtable.apiKey,
    });
    this.base = Airtable.base(config.airtable.baseId);
  }

  // ROOMS MANAGEMENT
  async getRooms(): Promise<Room[]> {
    const records = await this.base(config.airtable.tables.rooms)
      .select()
      .all();

    return records.map((record) => this.mapRecordToRoom(record));
  }

  async getRoomByNumber(roomNumber: string): Promise<Room | null> {
    const records = await this.base(config.airtable.tables.rooms)
      .select({
        filterByFormula: `{Number} = '${roomNumber}'`,
        maxRecords: 1,
      })
      .all();

    return records.length > 0 ? this.mapRecordToRoom(records[0]) : null;
  }

  // AVAILABILITY CHECKING
  async checkAvailability(query: AvailabilityQuery): Promise<Room[]> {
    const { checkIn, checkOut, guests, roomType } = query;

    // Get all rooms
    const allRooms = await this.getRooms();

    // Get existing bookings that overlap with requested dates
    const overlappingBookings = await this.getOverlappingBookings(
      checkIn,
      checkOut
    );

    // Get room IDs that are booked
    const bookedRoomIds = new Set(
      overlappingBookings.map((b) => b.roomId)
    );

    // Filter available rooms
    let availableRooms = allRooms.filter(
      (room) =>
        room.status === 'available' && !bookedRoomIds.has(room.id)
    );

    // Apply additional filters
    if (guests) {
      availableRooms = availableRooms.filter(
        (room) => room.capacity >= guests
      );
    }

    if (roomType) {
      availableRooms = availableRooms.filter(
        (room) => room.type.toLowerCase() === roomType.toLowerCase()
      );
    }

    return availableRooms;
  }

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

  // BOOKING MANAGEMENT
  async createBooking(booking: Booking): Promise<Booking> {
    const record = await this.base(config.airtable.tables.bookings).create({
      RoomId: booking.roomId,
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

  async updateBooking(
    bookingId: string,
    updates: Partial<Booking>
  ): Promise<Booking> {
    const updateFields: FieldSet = {};

    if (updates.roomId) updateFields.RoomId = updates.roomId;
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

  // MENU MANAGEMENT
  async getMenu(category?: string): Promise<MenuItem[]> {
    const selectOptions: any = {};

    if (category) {
      selectOptions.filterByFormula = `{Category} = '${category}'`;
    }

    const records = await this.base(config.airtable.tables.menu)
      .select(selectOptions)
      .all();

    // Filter by available in memory
    const allItems = records.map((record) => this.mapRecordToMenuItem(record));
    return allItems.filter((item) => item.available !== false);
  }

  async getMenuItem(itemId: string): Promise<MenuItem | null> {
    try {
      const record = await this.base(config.airtable.tables.menu).find(itemId);
      return this.mapRecordToMenuItem(record);
    } catch (error) {
      return null;
    }
  }

  // ROOM SERVICE MANAGEMENT
  async createRoomServiceOrder(
    order: RoomServiceOrder
  ): Promise<RoomServiceOrder> {
    // Calculate total if not provided
    let totalAmount = order.totalAmount;
    if (!totalAmount) {
      totalAmount = 0;
      for (const item of order.items) {
        const menuItem = await this.getMenuItem(item.menuItemId);
        if (menuItem) {
          totalAmount += menuItem.price * item.quantity;
        }
      }
    }

    const record = await this.base(config.airtable.tables.roomService).create({
      RoomNumber: order.roomNumber,
      Items: JSON.stringify(order.items),
      TotalAmount: totalAmount,
      OrderTime: order.orderTime,
      Status: order.status || 'pending',
      SpecialInstructions: order.specialInstructions || '',
    });

    return this.mapRecordToRoomServiceOrder(record);
  }

  // MAPPING FUNCTIONS
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

  private mapRecordToMenuItem(record: Records<FieldSet>[0]): MenuItem {
    return {
      id: record.id,
      name: record.get('Name') as string,
      description: record.get('Description') as string,
      category: record.get('Category') as string,
      price: record.get('Price') as number,
      available: record.get('Available') as boolean,
      allergens: (record.get('Allergens') as string)?.split(',').map(a => a.trim()) || [],
    };
  }

  private mapRecordToRoomServiceOrder(
    record: Records<FieldSet>[0]
  ): RoomServiceOrder {
    return {
      id: record.id,
      roomNumber: record.get('RoomNumber') as string,
      items: JSON.parse(record.get('Items') as string),
      totalAmount: record.get('TotalAmount') as number,
      orderTime: record.get('OrderTime') as string,
      status: record.get('Status') as RoomServiceOrder['status'],
      specialInstructions: record.get('SpecialInstructions') as string,
    };
  }
}
