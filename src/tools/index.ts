import { z } from 'zod';

// ========================================
// VALIDATION SCHEMAS
// ========================================
// These Zod schemas validate the parameters passed to each MCP tool.
// Tool names now match the ElevenLabs system prompt exactly.

// Schema for: getAvailableRooms
export const CheckAvailabilitySchema = z.object({
  checkIn: z.string().describe('Check-in date in ISO format (YYYY-MM-DD)'),
  checkOut: z.string().describe('Check-out date in ISO format (YYYY-MM-DD)'),
  guests: z.number().optional().describe('Number of guests'),
  roomType: z.string().optional().describe('Preferred room type (e.g., single, double, suite)'),
});

// Schema for: addBooking
export const CreateBookingSchema = z.object({
  roomId: z.string().describe('ID of the room to book'),
  guestName: z.string().describe('Guest full name'),
  guestEmail: z.string().email().optional().describe('Guest email address'),
  guestPhone: z.string().optional().describe('Guest phone number'),
  checkIn: z.string().describe('Check-in date in ISO format (YYYY-MM-DD)'),
  checkOut: z.string().describe('Check-out date in ISO format (YYYY-MM-DD)'),
  guests: z.number().describe('Number of guests'),
  specialRequests: z.string().optional().describe('Special requests or notes'),
});

// Schema for: updateBooking
export const UpdateBookingSchema = z.object({
  bookingId: z.string().describe('ID of the booking to update'),
  checkIn: z.string().optional().describe('New check-in date in ISO format (YYYY-MM-DD)'),
  checkOut: z.string().optional().describe('New check-out date in ISO format (YYYY-MM-DD)'),
  guests: z.number().optional().describe('New number of guests'),
  status: z.enum(['confirmed', 'checked-in', 'checked-out', 'cancelled']).optional().describe('Booking status'),
  specialRequests: z.string().optional().describe('Updated special requests'),
});

// Schema for: getRoomInfo
export const GetRoomByNumberSchema = z.object({
  roomNumber: z.string().describe('Room number to retrieve information for'),
});

// Schema for: getActiveBooking
export const GetBookingByRoomSchema = z.object({
  roomNumber: z.string().optional().describe('Room number to find active booking'),
  guestName: z.string().optional().describe('Guest name to search for (partial match supported)'),
  guestEmail: z.string().optional().describe('Guest email to search for (partial match supported)'),
  guestPhone: z.string().optional().describe('Guest phone number to search for'),
  bookingId: z.string().optional().describe('Booking ID for direct lookup'),
}).refine(
  (data) => data.roomNumber || data.guestName || data.guestEmail || data.guestPhone || data.bookingId,
  {
    message: 'At least one search parameter must be provided (roomNumber, guestName, guestEmail, guestPhone, or bookingId)',
  }
);
