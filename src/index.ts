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

let airtableService: AirtableService | null = null;

function initializeAirtableService() {
  if (!airtableService) {
    validateConfig();
    airtableService = new AirtableService();
  }
  return airtableService;
}

const server = createMCPServer('mcp-hospitality-hub', {
  version: '1.0.0',
  description: 'MCP server for AI Receptionist - Airtable integration for hotel management',
});

// Define tools using mcp-use API
server.tool({
  name: 'check_availability',
  description: 'Check room availability for given dates',
  inputs: [
    { name: 'checkIn', type: 'string', required: true, description: 'Check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: true, description: 'Check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: false, description: 'Number of guests' },
    { name: 'roomType', type: 'string', required: false, description: 'Room type filter (optional)' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = CheckAvailabilitySchema.parse(params);
    const availableRooms = await service.checkAvailability(validated);

    if (availableRooms.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No rooms available from ${validated.checkIn} to ${validated.checkOut}${validated.guests ? ` for ${validated.guests} guest(s)` : ''}${validated.roomType ? ` of type ${validated.roomType}` : ''}. Please try different dates or contact reception for alternatives.`,
          },
        ],
      };
    }

    const checkIn = new Date(validated.checkIn);
    const checkOut = new Date(validated.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    let response = `ROOM AVAILABILITY\n`;
    response += `Check-in: ${validated.checkIn} | Check-out: ${validated.checkOut} | ${nights} night(s)\n`;
    if (validated.guests) response += `Guests: ${validated.guests}\n`;
    if (validated.roomType) response += `Room Type: ${validated.roomType}\n`;
    response += `\nFound ${availableRooms.length} available room${availableRooms.length === 1 ? '' : 's'}:\n\n`;

    availableRooms.forEach((room, idx) => {
      const totalPrice = room.price * nights;
      response += `${idx + 1}. Room ${room.number} - ${room.type}\n`;
      response += `   Price: €${room.price}/night | Total: €${totalPrice} for ${nights} night(s)\n`;
      response += `   Capacity: ${room.capacity} guest(s)\n`;
      if (room.amenities && room.amenities.length > 0) {
        response += `   Amenities: ${room.amenities.join(', ')}\n`;
      }
      response += `   Room ID: ${room.id} (use this ID to create booking)\n\n`;
    });

    response += `\nTo book a room, use the create_booking tool with the Room ID.`;

    return {
      content: [
        {
          type: 'text',
          text: response,
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

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  },
});

server.tool({
  name: 'update_booking',
  description: 'Update an existing booking (dates, guests, special requests, or status)',
  inputs: [
    { name: 'bookingId', type: 'string', required: true, description: 'Booking ID' },
    { name: 'checkIn', type: 'string', required: false, description: 'New check-in date (ISO format)' },
    { name: 'checkOut', type: 'string', required: false, description: 'New check-out date (ISO format)' },
    { name: 'guests', type: 'number', required: false, description: 'Number of guests' },
    { name: 'status', type: 'string', required: false, description: 'Booking status (confirmed, checked-in, checked-out, cancelled)' },
    { name: 'specialRequests', type: 'string', required: false, description: 'Special requests' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = UpdateBookingSchema.parse(params);
    const booking = await service.updateBooking(validated.bookingId, validated);

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

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  },
});

server.tool({
  name: 'get_menu',
  description: 'Get menu items with optional filters for category, dietary preferences (vegetarian, vegan, gluten-free), and allergen exclusions',
  inputs: [
    { name: 'category', type: 'string', required: false, description: 'Category filter (breakfast, lunch, dinner, drinks, desserts)' },
    { name: 'vegetarian', type: 'boolean', required: false, description: 'Show only vegetarian items' },
    { name: 'vegan', type: 'boolean', required: false, description: 'Show only vegan items' },
    { name: 'glutenFree', type: 'boolean', required: false, description: 'Show only gluten-free items' },
    { name: 'excludeAllergens', type: 'array', required: false, description: 'Exclude items with these allergens' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = GetMenuSchema.parse(params);
    const menu = await service.getMenu(validated);

    if (menu.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No menu items found matching your criteria. Please try different filters or contact the kitchen for more options.',
          },
        ],
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

    return {
      content: [
        {
          type: 'text',
          text: response,
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

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  },
});

server.tool({
  name: 'get_room_info',
  description: 'Get detailed information about a specific room by room number',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Room number' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = GetRoomByNumberSchema.parse(params);
    const room = await service.getRoomByNumber(validated.roomNumber);

    if (!room) {
      return {
        content: [
          {
            type: 'text',
            text: `Room ${validated.roomNumber} not found in the system. Please verify the room number and try again.`,
          },
        ],
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

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  },
});

server.tool({
  name: 'get_active_booking',
  description: 'Get active booking information for a specific room number',
  inputs: [
    { name: 'roomNumber', type: 'string', required: true, description: 'Room number' },
  ],
  cb: async (params) => {
    const service = initializeAirtableService();
    const validated = GetBookingByRoomSchema.parse(params);
    const booking = await service.getBookingByRoomNumber(validated.roomNumber);

    if (!booking) {
      return {
        content: [
          {
            type: 'text',
            text: `No active booking found for room ${validated.roomNumber}. The room is either available or the booking has been checked out/cancelled.`,
          },
        ],
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

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
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
