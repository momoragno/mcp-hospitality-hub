#!/usr/bin/env node

import { createMCPServer } from 'mcp-use/server';
import { AirtableService } from './services/airtable.js';
import { validateConfig } from './config/index.js';
import {
  CheckAvailabilitySchema,
  CreateBookingSchema,
  UpdateBookingSchema,
  GetMenuSchema,
  CreateRoomServiceOrderSchema,
  GetRoomByNumberSchema,
  GetBookingByRoomSchema,
} from './tools/index.js';

// Airtable service will be initialized after validation
let airtableService: AirtableService | null = null;

// Validate config and initialize service
function initializeAirtableService() {
  if (!airtableService) {
    validateConfig();
    airtableService = new AirtableService();
  }
  return airtableService;
}

// Create MCP server with mcp-use
const server = createMCPServer('mcp-hospitality-hub', {
  version: '1.0.0',
  description: 'MCP server for AI Receptionist - Airtable integration for hotel management',
  baseUrl: process.env.MCP_URL || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : 'http://localhost:3000'
});

// Define tools using mcp-use API
server.tool({
  name: 'check_availability',
  description: 'Check room availability for given dates',
  inputs: [
    { name: 'checkIn', type: 'string', required: true, description: 'Check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: true, description: 'Check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: true, description: 'Number of guests' },
    { name: 'roomType', type: 'string', required: false, description: 'Room type filter (optional)' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = CheckAvailabilitySchema.parse(params);
    const availableRooms = await service.checkAvailability(validated);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            availableRooms: availableRooms.map((room) => ({
              id: room.id,
              number: room.number,
              type: room.type,
              price: room.price,
              capacity: room.capacity,
              amenities: room.amenities,
            })),
            totalAvailable: availableRooms.length,
          }, null, 2),
        },
      ],
    };
  },
});

server.tool({
  name: 'create_booking',
  description: 'Create a new booking',
  inputs: [
    { name: 'roomId', type: 'string', required: true, description: 'Room number or ID' },
    { name: 'guestName', type: 'string', required: true, description: 'Guest full name' },
    { name: 'guestEmail', type: 'string', required: true, description: 'Guest email' },
    { name: 'guestPhone', type: 'string', required: true, description: 'Guest phone number' },
    { name: 'checkIn', type: 'string', required: true, description: 'Check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: true, description: 'Check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: true, description: 'Number of guests' },
    { name: 'specialRequests', type: 'string', required: false, description: 'Special requests or notes' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = CreateBookingSchema.parse(params);

    const room = await service.getRoomByNumber(validated.roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const checkIn = new Date(validated.checkIn);
    const checkOut = new Date(validated.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = room.price * nights;

    const booking = await service.createBooking({
      roomId: validated.roomId,
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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            booking: {
              id: booking.id,
              roomNumber: room.number,
              guestName: booking.guestName,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              guests: booking.guests,
              totalPrice: booking.totalPrice,
              status: booking.status,
            },
            message: 'Booking created successfully',
          }, null, 2),
        },
      ],
    };
  },
});

server.tool({
  name: 'update_booking',
  description: 'Update an existing booking',
  inputs: [
    { name: 'bookingId', type: 'string', required: true, description: 'Booking ID' },
    { name: 'checkIn', type: 'string', required: false, description: 'New check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: false, description: 'New check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: false, description: 'Number of guests' },
    { name: 'status', type: 'string', required: false, description: 'Booking status' },
    { name: 'specialRequests', type: 'string', required: false, description: 'Special requests' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = UpdateBookingSchema.parse(params);
    const booking = await service.updateBooking(validated.bookingId, validated);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            booking,
            message: 'Booking updated successfully',
          }, null, 2),
        },
      ],
    };
  },
});

server.tool({
  name: 'get_menu',
  description: 'Get menu items, optionally filtered by category',
  inputs: [
    { name: 'category', type: 'string', required: false, description: 'Category filter (breakfast, lunch, dinner, drinks, desserts)' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = GetMenuSchema.parse(params);
    const menu = await service.getMenu(validated.category);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            menu: menu.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              category: item.category,
              price: item.price,
              allergens: item.allergens,
            })),
            totalItems: menu.length,
          }, null, 2),
        },
      ],
    };
  },
});

server.tool({
  name: 'create_room_service_order',
  description: 'Create a room service order',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Room number' },
    { name: 'items', type: 'array', required: true, description: 'Array of menu items to order' },
    { name: 'specialInstructions', type: 'string', required: false, description: 'Special instructions for the order' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = CreateRoomServiceOrderSchema.parse(params);

    let totalAmount = 0;
    const itemsWithDetails = [];

    for (const item of validated.items) {
      const menuItem = await service.getMenuItem(item.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item ${item.menuItemId} not found`);
      }
      if (!menuItem.available) {
        throw new Error(`Menu item ${menuItem.name} is not available`);
      }

      totalAmount += menuItem.price * item.quantity;
      itemsWithDetails.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        name: menuItem.name,
        price: menuItem.price,
      });
    }

    const order = await service.createRoomServiceOrder({
      roomNumber: validated.roomNumber,
      items: itemsWithDetails,
      totalAmount,
      orderTime: new Date().toISOString(),
      status: 'pending',
      specialInstructions: validated.specialInstructions,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            order: {
              id: order.id,
              roomNumber: order.roomNumber,
              items: order.items,
              totalAmount: order.totalAmount,
              status: order.status,
            },
            message: `Order placed successfully. Total: €${totalAmount.toFixed(2)}. Charges will be added to room ${validated.roomNumber}.`,
          }, null, 2),
        },
      ],
    };
  },
});

server.tool({
  name: 'get_room_info',
  description: 'Get information about a specific room',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Room number' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = GetRoomByNumberSchema.parse(params);
    const room = await service.getRoomByNumber(validated.roomNumber);

    if (!room) {
      throw new Error('Room not found');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            room,
          }, null, 2),
        },
      ],
    };
  },
});

server.tool({
  name: 'get_active_booking',
  description: 'Get active booking for a room',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Room number' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = GetBookingByRoomSchema.parse(params);
    const booking = await service.getBookingByRoomNumber(validated.roomNumber);

    if (!booking) {
      throw new Error('No active booking found for this room');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            booking,
          }, null, 2),
        },
      ],
    };
  },
});

// Start the server
const mode = process.env.SERVER_MODE || 'stdio';
const port = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  if (mode === 'http') {
    // HTTP mode for cloud deployment (Railway, etc.)
    console.error('Starting MCP server in HTTP mode...');
    await server.listen(port);
    console.error(`MCP Hospitality Hub HTTP server running on port ${port}`);
    console.error(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
    console.error(`Inspector: http://0.0.0.0:${port}/inspector`);
    console.error(`Framework: mcp-use with auto HTTP/SSE support`);
  } else {
    // Stdio mode not supported by mcp-use
    // For stdio, you need to use the official SDK
    console.error('ERROR: stdio mode not supported with mcp-use framework');
    console.error('To use stdio mode, run: SERVER_MODE=http npm start');
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
