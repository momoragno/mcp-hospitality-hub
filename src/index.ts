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
  GetMenuSchema,
  CreateRoomServiceOrderSchema,
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
  name: 'getMenu',
  description: 'Get restaurant menu with optional filters. Returns food and beverage items with prices, descriptions, and dietary information.',
  inputs: [
    { name: 'category', type: 'string', required: false, description: 'Filter by category: breakfast, lunch, dinner, drinks, or desserts' },
    { name: 'vegetarian', type: 'boolean', required: false, description: 'Show only vegetarian items' },
    { name: 'vegan', type: 'boolean', required: false, description: 'Show only vegan items' },
    { name: 'glutenFree', type: 'boolean', required: false, description: 'Show only gluten-free items' },
    { name: 'excludeAllergens', type: 'array', required: false, description: 'Exclude items containing these allergens' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'getMenu',
      metadata: { params },
      tags: ['mcp-tool', 'menu']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] getMenu called:`, JSON.stringify(params));

      const validated = GetMenuSchema.parse(params);
      const menu = await airtableService.getMenu(validated);

      if (menu.length === 0) {
        span?.end({ output: { success: true, itemCount: 0 } });
        return {
          content: [{
            type: 'text',
            text: 'No menu items found matching your criteria. Please try different filters or contact the kitchen for more options.',
          }],
        };
      }

      // Build human-readable response
      let response = `MENU`;

      // Add filter description
      const filterParts: string[] = [];
      if (validated.category) filterParts.push(`Category: ${validated.category}`);
      if (validated.vegetarian) filterParts.push('Vegetarian');
      if (validated.vegan) filterParts.push('Vegan');
      if (validated.glutenFree) filterParts.push('Gluten-Free');
      if (validated.excludeAllergens?.length) filterParts.push(`No ${validated.excludeAllergens.join(', ')}`);

      if (filterParts.length > 0) {
        response += ` (Filtered: ${filterParts.join(', ')})`;
      }
      response += `\n\nFound ${menu.length} item${menu.length === 1 ? '' : 's'}:\n\n`;

      // Group by category for better readability
      const categories = [...new Set(menu.map((item) => item.category))];

      categories.forEach((category) => {
        const categoryItems = menu.filter((item) => item.category === category);
        response += `=== ${category.toUpperCase()} ===\n\n`;

        categoryItems.forEach((item, idx) => {
          response += `${idx + 1}. ${item.name} - €${item.price.toFixed(2)}\n`;
          response += `   ${item.description}\n`;

          // Add dietary info
          const dietaryTags: string[] = [];
          if (item.vegetarian) dietaryTags.push('Vegetarian');
          if (item.vegan) dietaryTags.push('Vegan');
          if (item.glutenFree) dietaryTags.push('Gluten-Free');
          if (dietaryTags.length > 0) {
            response += `   Dietary: ${dietaryTags.join(', ')}\n`;
          }

          if (item.allergens && item.allergens.length > 0) {
            response += `   Allergens: ${item.allergens.join(', ')}\n`;
          }

          response += `   Item ID: ${item.id} (use this ID to place orders)\n\n`;
        });
      });

      response += `\nTo order any item, use the create_room_service_order tool with the Item ID.`;

      span?.end({ output: { success: true, itemCount: menu.length, categories: categories.length } });

      return {
        content: [{
          type: 'text',
          text: response,
        }],
      };
    } catch (error) {
      return handleError('getMenu', error, params, span);
    }
  },
});

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

      // Get room details first
      const room = await airtableService.getRoomByNumber(validated.roomId);
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
  name: 'addRoomServiceOrder',
  description: 'Place a room service order for food delivery to guest room. Use after getMenu to obtain menu item IDs.',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Room number' },
    { name: 'items', type: 'array', required: true, description: 'Array of menu items to order' },
    { name: 'specialInstructions', type: 'string', required: false, description: 'Special instructions for the order' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'addRoomServiceOrder',
      metadata: { params },
      tags: ['mcp-tool', 'room-service']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] addRoomServiceOrder called for room:`, params.roomNumber);

      const validated = CreateRoomServiceOrderSchema.parse(params);

      // Fetch menu item details and validate
      const itemsWithDetails: any[] = [];
      let totalAmount = 0;

      for (const item of validated.items) {
        const menuItem = await airtableService.getMenuItem(item.menuItemId);
        if (!menuItem) {
          span?.end({ level: 'WARNING', output: { success: false, reason: 'menu_item_not_found', itemId: item.menuItemId } });
          return {
            content: [{
              type: 'text',
              text: `Error: Menu item ${item.menuItemId} not found. Please use getMenu to see available items and use the correct Item ID.`
            }],
            isError: true
          };
        }
        if (!menuItem.available) {
          span?.end({ level: 'WARNING', output: { success: false, reason: 'menu_item_unavailable', itemName: menuItem.name } });
          return {
            content: [{
              type: 'text',
              text: `Error: Menu item "${menuItem.name}" is currently not available. Please choose a different item from the menu.`
            }],
            isError: true
          };
        }

        itemsWithDetails.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          name: menuItem.name,
          price: menuItem.price,
        });

        totalAmount += menuItem.price * item.quantity;
      }

      const order = await airtableService.createRoomServiceOrder({
        roomNumber: validated.roomNumber,
        items: itemsWithDetails,
        totalAmount,
        orderTime: new Date().toISOString(),
        status: 'pending',
        specialInstructions: validated.specialInstructions,
      });

      let response = `✓ ROOM SERVICE ORDER PLACED\n\n`;
      response += `Order ID: ${order.id}\n`;
      response += `Room Number: ${order.roomNumber}\n`;
      response += `Order Time: ${new Date(order.orderTime).toLocaleString()}\n`;
      response += `\nOrdered Items:\n`;

      order.items.forEach((item, idx) => {
        response += `${idx + 1}. ${item.name} × ${item.quantity}\n`;
        response += `   Price: €${item.price} each | Subtotal: €${(item.price! * item.quantity).toFixed(2)}\n`;
      });

      response += `\nTotal Amount: €${order.totalAmount.toFixed(2)}\n`;

      if (order.specialInstructions) {
        response += `\nSpecial Instructions: ${order.specialInstructions}\n`;
      }

      response += `\nStatus: ${order.status.toUpperCase()}\n`;
      response += `\nThe order has been sent to the kitchen. Charges will be added to room ${validated.roomNumber}. Estimated delivery: 30-45 minutes.`;

      span?.end({ output: { success: true, orderId: order.id, totalAmount, itemCount: order.items.length } });

      return {
        content: [{
          type: 'text',
          text: response,
        }],
      };
    } catch (error) {
      return handleError('addRoomServiceOrder', error, params, span);
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
  description: 'Get active booking information for a specific room number. Returns guest details and booking dates.',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Room number' },
  ],
  cb: async (params) => {
    const trace = langfuse?.trace({
      name: 'getActiveBooking',
      metadata: { params },
      tags: ['mcp-tool', 'booking']
    });
    const span = trace?.span({ name: 'execution', startTime: new Date() });

    try {
      console.error(`[${new Date().toISOString()}] getActiveBooking called:`, params.roomNumber);

      const validated = GetBookingByRoomSchema.parse(params);
      const booking = await airtableService.getBookingByRoomNumber(validated.roomNumber);

      if (!booking) {
        span?.end({ output: { success: true, hasBooking: false } });
        return {
          content: [{
            type: 'text',
            text: `No active booking found for room ${validated.roomNumber}. The room is either available or the booking has been checked out/cancelled.`,
          }],
        };
      }

      let response = `ACTIVE BOOKING FOR ROOM ${validated.roomNumber}\n\n`;
      response += `Booking ID: ${booking.id}\n`;
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

      span?.end({ output: { success: true, hasBooking: true, bookingStatus: booking.status } });

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
