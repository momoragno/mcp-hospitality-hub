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

// Schema for: getMenu
export const GetMenuSchema = z.object({
  category: z.string().optional().describe('Filter menu by category (e.g., breakfast, lunch, dinner, drinks)'),
  vegetarian: z.boolean().optional().describe('Show only vegetarian items'),
  vegan: z.boolean().optional().describe('Show only vegan items'),
  glutenFree: z.boolean().optional().describe('Show only gluten-free items'),
  excludeAllergens: z.array(z.string()).optional().describe('Exclude items with these allergens (e.g., ["dairy", "nuts"])'),
});

// Schema for: addRoomServiceOrder
export const CreateRoomServiceOrderSchema = z.object({
  roomNumber: z.string().describe('Room number for delivery'),
  items: z.array(
    z.object({
      menuItemId: z.string().describe('ID of the menu item'),
      quantity: z.number().describe('Quantity to order'),
    })
  ).describe('List of items to order'),
  specialInstructions: z.string().optional().describe('Special instructions for the order'),
});

// Schema for: getRoomInfo
export const GetRoomByNumberSchema = z.object({
  roomNumber: z.string().describe('Room number to retrieve information for'),
});

// Schema for: getActiveBooking
export const GetBookingByRoomSchema = z.object({
  roomNumber: z.string().describe('Room number to find active booking'),
});
