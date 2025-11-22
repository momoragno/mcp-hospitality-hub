#!/usr/bin/env node

import { createMCPServer } from 'mcp-use/server';
import { Langfuse } from 'langfuse';
import { ZodError } from 'zod';
import { AirtableService } from './services/airtable.js';
import { config, validateConfig } from './config/index.js';
import {
  CheckAvailabilitySchema,
  CreateBookingSchema,
  UpdateBookingSchema,
  GetRoomByNumberSchema,
  GetBookingByRoomSchema,
} from './tools/index.js';

// Initialize Langfuse for monitoring (optional)
let langfuse: Langfuse | null = null;
if (config.langfuse.publicKey && config.langfuse.secretKey) {
  langfuse = new Langfuse({
    publicKey: config.langfuse.publicKey,
    secretKey: config.langfuse.secretKey,
    baseUrl: config.langfuse.host,
  });
  console.error('✓ Langfuse monitoring enabled');
} else {
  console.error('⚠ Langfuse monitoring disabled (no API keys provided)');
}

// Initialize Airtable service at startup (fail fast if config invalid)
validateConfig();
const airtableService = new AirtableService();
console.error('✓ Airtable service initialized');

const server = createMCPServer('mcp-hospitality-hub', {
  version: '1.0.0',
  description: 'MCP server for AI Receptionist - Airtable integration for hotel management',
});

// Helper function to handle errors consistently
function handleError(toolName: string, error: unknown, params: any, span?: any) {
  console.error(`[${new Date().toISOString()}] Error in ${toolName}:`, error);

  let errorMessage = 'An unexpected error occurred';

  if (error instanceof ZodError) {
    const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    errorMessage = `Validation error: ${issues}`;
  } else if (error instanceof Error) {
    errorMessage = `Error: ${error.message}`;
  }

  // Log to Langfuse
  span?.end({ level: 'ERROR', statusMessage: errorMessage });

  return {
    content: [{
      type: 'text' as const,
      text: `${errorMessage}\n\nPlease verify your input and try again. If the problem persists, contact support.`
    }],
    isError: true
  };
}

// Define tools using mcp-use API
// NOTE: Tool order matters! Most commonly confused tools should be defined first with explicit descriptions.

server.tool({
  name: 'getAvailableRooms',
  description: 'Check room availability for specified dates. Returns list of available rooms with type, price, capacity, and amenities.',
  inputs: [
    { name: 'checkIn', type: 'string', required: true, description: 'Check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: true, description: 'Check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: false, description: 'Number of guests (tool returns all available rooms; combine multiple rooms for larger groups)' },
    { name: 'roomType', type: 'string', required: false, description: 'Room type filter (optional)' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'getAvailableRooms',
      metadata: { params },
      tags: ['mcp-tool', 'availability']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] getAvailableRooms called:`, JSON.stringify(params));

      const validated = CheckAvailabilitySchema.parse(params);
      const availableRooms = await airtableService.checkAvailability(validated);

      if (availableRooms.length === 0) {
        span?.end({ output: { success: true, roomCount: 0 } });
        return {
          content: [{
            type: 'text',
            text: `No rooms available from ${validated.checkIn} to ${validated.checkOut}${validated.guests ? ` for ${validated.guests} guest(s)` : ''}${validated.roomType ? ` of type ${validated.roomType}` : ''}. Please try different dates or contact reception for alternatives.`,
          }],
        };
      }

      const checkIn = new Date(validated.checkIn);
      const checkOut = new Date(validated.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      // Sort rooms by capacity (largest first) to help AI suggest optimal combinations
      const sortedRooms = [...availableRooms].sort((a, b) => b.capacity - a.capacity);
      const totalCapacity = sortedRooms.reduce((sum, room) => sum + room.capacity, 0);

      let response = `ROOM AVAILABILITY\n`;
      response += `Check-in: ${validated.checkIn} | Check-out: ${validated.checkOut} | ${nights} night(s)\n`;
      if (validated.guests) {
        response += `Requested Guests: ${validated.guests} | Total capacity across all rooms: ${totalCapacity} guests\n`;
      }
      if (validated.roomType) response += `Room Type Filter: ${validated.roomType}\n`;
      response += `\nFound ${sortedRooms.length} available room${sortedRooms.length === 1 ? '' : 's'}`;

      // Add multi-room note if guest count exceeds individual room capacity
      if (validated.guests && sortedRooms.length > 0) {
        const largestRoomCapacity = sortedRooms[0].capacity;
        if (validated.guests > largestRoomCapacity) {
          response += ` (multiple rooms recommended for ${validated.guests} guests)`;
        }
      }
      response += `:\n\n`;

      sortedRooms.forEach((room, idx) => {
        const totalPrice = room.price * nights;
        response += `${idx + 1}. Room ${room.number} - ${room.type}\n`;
        response += `   Capacity: ${room.capacity} guest${room.capacity > 1 ? 's' : ''}\n`;
        response += `   Price: €${room.price}/night | Total: €${totalPrice} for ${nights} night(s)\n`;
        if (room.amenities && room.amenities.length > 0) {
          response += `   Amenities: ${room.amenities.join(', ')}\n`;
        }
        response += `   Room ID: ${room.id} (use this ID to create booking)\n\n`;
      });

      if (validated.guests && sortedRooms.length > 1) {
        response += `\nNote: Multiple rooms can be combined to accommodate ${validated.guests} guests. `;
        response += `You can book multiple rooms using the create_booking tool for each room separately.`;
      } else {
        response += `\nTo book a room, use the create_booking tool with the Room ID.`;
      }

      span?.end({ output: { success: true, roomCount: sortedRooms.length, totalCapacity } });

      return {
        content: [{
          type: 'text',
          text: response,
        }],
      };
    } catch (error) {
      return handleError('getAvailableRooms', error, params, span);
    }
  },
});

server.tool({
  name: 'addBooking',
  description: 'Create a new room booking with guest details and date range. Returns booking confirmation with ID and total price.',
  inputs: [
    { name: 'roomId', type: 'string', required: true, description: 'Room ID from check_availability' },
    { name: 'guestName', type: 'string', required: true, description: 'Guest full name' },
    { name: 'guestEmail', type: 'string', required: false, description: 'Guest email' },
    { name: 'guestPhone', type: 'string', required: false, description: 'Guest phone number' },
    { name: 'checkIn', type: 'string', required: true, description: 'Check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: true, description: 'Check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: true, description: 'Number of guests' },
    { name: 'specialRequests', type: 'string', required: false, description: 'Special requests' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'addBooking',
      metadata: { params: { ...params, guestEmail: '***', guestPhone: '***' } }, // Hide PII
      tags: ['mcp-tool', 'booking']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] addBooking called for room:`, params.roomId);

      const validated = CreateBookingSchema.parse(params);

      // Get room details by ID (roomId is already the Airtable record ID)
      const allRooms = await airtableService.getRooms();
      const room = allRooms.find(r => r.id === validated.roomId);

      if (!room) {
        span?.end({ level: 'WARNING', output: { success: false, reason: 'room_not_found' } });
        return {
          content: [{
            type: 'text',
            text: `Error: Room ${validated.roomId} not found in the system. Please verify the room ID from the check_availability results and try again.`
          }],
          isError: true
        };
      }

      const checkIn = new Date(validated.checkIn);
      const checkOut = new Date(validated.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = room.price * nights;

      const booking = await airtableService.createBooking({
        roomId: room.id,
        guestName: validated.guestName,
        guestEmail: validated.guestEmail,
        guestPhone: validated.guestPhone,
        checkIn: validated.checkIn,
        checkOut: validated.checkOut,
        guests: validated.guests,
        totalPrice,
        status: 'confirmed',
        specialRequests: validated.specialRequests,
      });

      let response = `✓ BOOKING CONFIRMED\n\n`;
      response += `Booking ID: ${booking.id}\n`;
      response += `Room Number: ${room.number} (${room.type})\n`;
      response += `Guest: ${booking.guestName}\n`;
      if (booking.guestEmail) response += `Email: ${booking.guestEmail}\n`;
      if (booking.guestPhone) response += `Phone: ${booking.guestPhone}\n`;
      response += `\nCheck-in: ${booking.checkIn}\n`;
      response += `Check-out: ${booking.checkOut}\n`;
      response += `Guests: ${booking.guests}\n`;
      response += `\nTotal Cost: €${booking.totalPrice} (€${room.price}/night × ${nights} night${nights > 1 ? 's' : ''})\n`;
      if (booking.specialRequests) {
        response += `\nSpecial Requests: ${booking.specialRequests}\n`;
      }
      response += `\nStatus: ${booking.status.toUpperCase()}\n`;
      response += `\nThe booking has been successfully created and confirmed. The guest can check in on ${booking.checkIn}.`;

      span?.end({ output: { success: true, bookingId: booking.id, totalPrice } });

      return {
        content: [{
          type: 'text',
          text: response,
        }],
      };
    } catch (error) {
      return handleError('addBooking', error, params, span);
    }
  },
});

server.tool({
  name: 'updateBooking',
  description: 'Update an existing booking with new dates, guest count, or status. Returns updated booking details.',
  inputs: [
    { name: 'bookingId', type: 'string', required: true, description: 'Booking ID' },
    { name: 'checkIn', type: 'string', required: false, description: 'New check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: false, description: 'New check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: false, description: 'Number of guests' },
    { name: 'status', type: 'string', required: false, description: 'Booking status (confirmed, checked-in, checked-out, cancelled)' },
    { name: 'specialRequests', type: 'string', required: false, description: 'Special requests' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'updateBooking',
      metadata: { params },
      tags: ['mcp-tool', 'booking']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] updateBooking called:`, params.bookingId);

      const validated = UpdateBookingSchema.parse(params);
      const booking = await airtableService.updateBooking(validated.bookingId, validated);

      const changes: string[] = [];
      if (validated.checkIn) changes.push(`Check-in date to ${validated.checkIn}`);
      if (validated.checkOut) changes.push(`Check-out date to ${validated.checkOut}`);
      if (validated.guests) changes.push(`Number of guests to ${validated.guests}`);
      if (validated.status) changes.push(`Status to ${validated.status}`);
      if (validated.specialRequests) changes.push('Special requests');

      let response = `✓ BOOKING UPDATED\n\n`;
      response += `Booking ID: ${booking.id}\n`;
      if (booking.roomNumber) response += `Room: ${booking.roomNumber}\n`;
      response += `Guest: ${booking.guestName}\n`;
      response += `\nUpdated fields:\n`;
      changes.forEach((change, idx) => {
        response += `  ${idx + 1}. ${change}\n`;
      });
      response += `\nCurrent booking details:\n`;
      response += `Check-in: ${booking.checkIn}\n`;
      response += `Check-out: ${booking.checkOut}\n`;
      response += `Guests: ${booking.guests}\n`;
      response += `Status: ${booking.status.toUpperCase()}\n`;
      if (booking.totalPrice) response += `Total Price: €${booking.totalPrice}\n`;
      if (booking.specialRequests) response += `Special Requests: ${booking.specialRequests}\n`;
      response += `\nThe booking has been successfully updated.`;

      span?.end({ output: { success: true, changesCount: changes.length } });

      return {
        content: [{
          type: 'text',
          text: response,
        }],
      };
    } catch (error) {
      return handleError('updateBooking', error, params, span);
    }
  },
});

server.tool({
  name: 'getRoomInfo',
  description: 'Get detailed information about a specific room by room number. Returns room type, price, capacity, amenities, and current status.',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Numeric room number (e.g., "101", "305", NOT "menu" or other words)' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'getRoomInfo',
      metadata: { params },
      tags: ['mcp-tool', 'room']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] getRoomInfo called:`, params.roomNumber);

      const validated = GetRoomByNumberSchema.parse(params);
      const room = await airtableService.getRoomByNumber(validated.roomNumber);

      if (!room) {
        span?.end({ level: 'WARNING', output: { success: false, reason: 'room_not_found' } });
        return {
          content: [{
            type: 'text',
            text: `Room ${validated.roomNumber} not found in the system. Please verify the room number and try again.`,
          }],
        };
      }

      let response = `ROOM INFORMATION\n\n`;
      response += `Room Number: ${room.number}\n`;
      response += `Room Type: ${room.type}\n`;
      response += `Price: €${room.price}/night\n`;
      response += `Capacity: ${room.capacity} guest${room.capacity > 1 ? 's' : ''}\n`;
      response += `Status: ${room.status.toUpperCase()}\n`;

      if (room.amenities && room.amenities.length > 0) {
        response += `\nAmenities:\n`;
        room.amenities.forEach((amenity) => {
          response += `  • ${amenity}\n`;
        });
      }

      response += `\nRoom ID: ${room.id}`;

      span?.end({ output: { success: true, roomStatus: room.status } });

      return {
        content: [{
          type: 'text',
          text: response,
        }],
      };
    } catch (error) {
      return handleError('getRoomInfo', error, params, span);
    }
  },
});

server.tool({
  name: 'getActiveBooking',
  description: 'Search for active bookings by room number, guest name, email, phone, or booking ID. Returns guest details and booking dates. Supports partial matching for names and emails.',
  inputs: [
    { name: 'roomNumber', type: 'string', required: false, description: 'Room number to search' },
    { name: 'guestName', type: 'string', required: false, description: 'Guest name to search (partial match supported)' },
    { name: 'guestEmail', type: 'string', required: false, description: 'Guest email to search (partial match supported)' },
    { name: 'guestPhone', type: 'string', required: false, description: 'Guest phone number to search' },
    { name: 'bookingId', type: 'string', required: false, description: 'Booking ID for direct lookup' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'getActiveBooking',
      metadata: { params: { ...params, guestEmail: params.guestEmail ? '***' : undefined, guestPhone: params.guestPhone ? '***' : undefined } },
      tags: ['mcp-tool', 'booking']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] getActiveBooking called with:`, JSON.stringify({
        ...params,
        guestEmail: params.guestEmail ? '***' : undefined,
        guestPhone: params.guestPhone ? '***' : undefined
      }));

      const validated = GetBookingByRoomSchema.parse(params);
      const bookings = await airtableService.searchActiveBookings(validated);

      if (bookings.length === 0) {
        // Build search criteria description
        const searchCriteria: string[] = [];
        if (validated.roomNumber) searchCriteria.push(`room ${validated.roomNumber}`);
        if (validated.guestName) searchCriteria.push(`guest name "${validated.guestName}"`);
        if (validated.guestEmail) searchCriteria.push(`email "${validated.guestEmail}"`);
        if (validated.guestPhone) searchCriteria.push(`phone "${validated.guestPhone}"`);
        if (validated.bookingId) searchCriteria.push(`booking ID "${validated.bookingId}"`);

        const criteriaText = searchCriteria.join(', ');

        span?.end({ output: { success: true, bookingCount: 0 } });
        return {
          content: [{
            type: 'text',
            text: `No active bookings found matching ${criteriaText}. The booking may have been checked out, cancelled, or doesn't exist.`,
          }],
        };
      }

      let response = bookings.length === 1
        ? `ACTIVE BOOKING FOUND\n\n`
        : `ACTIVE BOOKINGS FOUND (${bookings.length})\n\n`;

      bookings.forEach((booking, index) => {
        if (index > 0) response += '\n---\n\n';

        response += `Booking ID: ${booking.id}\n`;
        response += `Room Number: ${booking.roomNumber}\n`;
        response += `Guest Name: ${booking.guestName}\n`;
        if (booking.guestEmail) response += `Email: ${booking.guestEmail}\n`;
        if (booking.guestPhone) response += `Phone: ${booking.guestPhone}\n`;
        response += `\nCheck-in: ${booking.checkIn}\n`;
        response += `Check-out: ${booking.checkOut}\n`;
        response += `Number of Guests: ${booking.guests}\n`;
        response += `Status: ${booking.status.toUpperCase()}\n`;
        if (booking.totalPrice) response += `Total Price: €${booking.totalPrice}\n`;
        if (booking.specialRequests) {
          response += `\nSpecial Requests: ${booking.specialRequests}\n`;
        }
      });

      span?.end({ output: { success: true, bookingCount: bookings.length } });

      return {
        content: [{
          type: 'text',
          text: response,
        }],
      };
    } catch (error) {
      return handleError('getActiveBooking', error, params, span);
    }
  },
});

const port = parseInt(process.env.PORT || '3000', 10);

server.listen(port).then(() => {
  console.error(`MCP Hospitality Hub running on port ${port}`);
  console.error(`MCP endpoint: http://localhost:${port}/mcp`);
  console.error(`Inspector: http://localhost:${port}/inspector`);
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown - flush Langfuse traces
process.on('SIGINT', async () => {
  console.error('\nShutting down gracefully...');
  await langfuse?.shutdownAsync();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\nShutting down gracefully...');
  await langfuse?.shutdownAsync();
  process.exit(0);
});
