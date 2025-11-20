import { z } from 'zod';

// Tool Schemas for validation
export const CheckAvailabilitySchema = z.object({
  checkIn: z.string().describe('Check-in date in ISO format (YYYY-MM-DD)'),
  checkOut: z.string().describe('Check-out date in ISO format (YYYY-MM-DD)'),
  guests: z.number().optional().describe('Number of guests'),
  roomType: z.string().optional().describe('Preferred room type (e.g., single, double, suite)'),
});

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

export const UpdateBookingSchema = z.object({
  bookingId: z.string().describe('ID of the booking to update'),
  checkIn: z.string().optional().describe('New check-in date in ISO format (YYYY-MM-DD)'),
  checkOut: z.string().optional().describe('New check-out date in ISO format (YYYY-MM-DD)'),
  guests: z.number().optional().describe('New number of guests'),
  specialRequests: z.string().optional().describe('Updated special requests'),
});

export const GetMenuSchema = z.object({
  category: z.string().optional().describe('Filter menu by category (e.g., breakfast, lunch, dinner, drinks)'),
});

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

export const GetRoomByNumberSchema = z.object({
  roomNumber: z.string().describe('Room number to retrieve information for'),
});

export const GetBookingByRoomSchema = z.object({
  roomNumber: z.string().describe('Room number to find active booking'),
});

// Tool definitions for MCP
export const tools = [
  {
    name: 'check_availability',
    description: 'Check room availability for specified dates. Returns list of available rooms with details.',
    inputSchema: {
      type: 'object',
      properties: {
        checkIn: {
          type: 'string',
          description: 'Check-in date in ISO format (YYYY-MM-DD)',
        },
        checkOut: {
          type: 'string',
          description: 'Check-out date in ISO format (YYYY-MM-DD)',
        },
        guests: {
          type: 'number',
          description: 'Number of guests (optional)',
        },
        roomType: {
          type: 'string',
          description: 'Preferred room type like single, double, suite (optional)',
        },
      },
      required: ['checkIn', 'checkOut'],
    },
  },
  {
    name: 'create_booking',
    description: 'Create a new room booking. Returns the created booking details with confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'string',
          description: 'ID of the room to book',
        },
        guestName: {
          type: 'string',
          description: 'Guest full name',
        },
        guestEmail: {
          type: 'string',
          description: 'Guest email address (optional)',
        },
        guestPhone: {
          type: 'string',
          description: 'Guest phone number (optional)',
        },
        checkIn: {
          type: 'string',
          description: 'Check-in date in ISO format (YYYY-MM-DD)',
        },
        checkOut: {
          type: 'string',
          description: 'Check-out date in ISO format (YYYY-MM-DD)',
        },
        guests: {
          type: 'number',
          description: 'Number of guests',
        },
        specialRequests: {
          type: 'string',
          description: 'Special requests or notes (optional)',
        },
      },
      required: ['roomId', 'guestName', 'checkIn', 'checkOut', 'guests'],
    },
  },
  {
    name: 'update_booking',
    description: 'Update an existing booking (change dates, guests, or special requests).',
    inputSchema: {
      type: 'object',
      properties: {
        bookingId: {
          type: 'string',
          description: 'ID of the booking to update',
        },
        checkIn: {
          type: 'string',
          description: 'New check-in date in ISO format (YYYY-MM-DD) (optional)',
        },
        checkOut: {
          type: 'string',
          description: 'New check-out date in ISO format (YYYY-MM-DD) (optional)',
        },
        guests: {
          type: 'number',
          description: 'New number of guests (optional)',
        },
        specialRequests: {
          type: 'string',
          description: 'Updated special requests (optional)',
        },
      },
      required: ['bookingId'],
    },
  },
  {
    name: 'get_menu',
    description: 'Get the restaurant/room service menu. Can filter by category (breakfast, lunch, dinner, drinks).',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category: breakfast, lunch, dinner, drinks (optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_room_service_order',
    description: 'Create a room service order. Charges will be added to the room. Returns order confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        roomNumber: {
          type: 'string',
          description: 'Room number for delivery',
        },
        items: {
          type: 'array',
          description: 'List of items to order',
          items: {
            type: 'object',
            properties: {
              menuItemId: {
                type: 'string',
                description: 'ID of the menu item',
              },
              quantity: {
                type: 'number',
                description: 'Quantity to order',
              },
            },
            required: ['menuItemId', 'quantity'],
          },
        },
        specialInstructions: {
          type: 'string',
          description: 'Special instructions for the order (optional)',
        },
      },
      required: ['roomNumber', 'items'],
    },
  },
  {
    name: 'get_room_info',
    description: 'Get detailed information about a specific room by room number (useful for noise complaints to find adjacent rooms).',
    inputSchema: {
      type: 'object',
      properties: {
        roomNumber: {
          type: 'string',
          description: 'Room number to retrieve information for',
        },
      },
      required: ['roomNumber'],
    },
  },
  {
    name: 'get_active_booking',
    description: 'Get active booking information for a specific room number.',
    inputSchema: {
      type: 'object',
      properties: {
        roomNumber: {
          type: 'string',
          description: 'Room number to find active booking',
        },
      },
      required: ['roomNumber'],
    },
  },
];
