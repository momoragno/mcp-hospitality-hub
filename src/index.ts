#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AirtableService } from './services/airtable.js';
import { config, validateConfig } from './config/index.js';
import {
  tools,
  CheckAvailabilitySchema,
  CreateBookingSchema,
  UpdateBookingSchema,
  GetMenuSchema,
  CreateRoomServiceOrderSchema,
  GetRoomByNumberSchema,
  GetBookingByRoomSchema,
} from './tools/index.js';

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error);
  process.exit(1);
}

const airtableService = new AirtableService();

const server = new Server(
  {
    name: 'mcp-hospitality-hub',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'check_availability': {
        const validated = CheckAvailabilitySchema.parse(args);
        const availableRooms = await airtableService.checkAvailability(validated);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'create_booking': {
        const validated = CreateBookingSchema.parse(args);

        // Calculate total price
        const room = await airtableService.getRoomByNumber(
          validated.roomId // Note: this should be validated in production
        );

        if (!room) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Room not found',
                }),
              },
            ],
          };
        }

        const checkIn = new Date(validated.checkIn);
        const checkOut = new Date(validated.checkOut);
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );
        const totalPrice = room.price * nights;

        const booking = await airtableService.createBooking({
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
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'update_booking': {
        const validated = UpdateBookingSchema.parse(args);
        const booking = await airtableService.updateBooking(
          validated.bookingId,
          validated
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  booking,
                  message: 'Booking updated successfully',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_menu': {
        const validated = GetMenuSchema.parse(args);
        const menu = await airtableService.getMenu(validated.category);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'create_room_service_order': {
        const validated = CreateRoomServiceOrderSchema.parse(args);

        // Fetch menu items to calculate total and validate
        let totalAmount = 0;
        const itemsWithDetails = [];

        for (const item of validated.items) {
          const menuItem = await airtableService.getMenuItem(item.menuItemId);
          if (!menuItem) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Menu item ${item.menuItemId} not found`,
                  }),
                },
              ],
            };
          }

          if (!menuItem.available) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Menu item ${menuItem.name} is not available`,
                  }),
                },
              ],
            };
          }

          totalAmount += menuItem.price * item.quantity;
          itemsWithDetails.push({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            name: menuItem.name,
            price: menuItem.price,
          });
        }

        const order = await airtableService.createRoomServiceOrder({
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
              text: JSON.stringify(
                {
                  success: true,
                  order: {
                    id: order.id,
                    roomNumber: order.roomNumber,
                    items: order.items,
                    totalAmount: order.totalAmount,
                    status: order.status,
                  },
                  message: `Order placed successfully. Total: €${totalAmount.toFixed(2)}. Charges will be added to room ${validated.roomNumber}.`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_room_info': {
        const validated = GetRoomByNumberSchema.parse(args);
        const room = await airtableService.getRoomByNumber(validated.roomNumber);

        if (!room) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Room not found',
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  room,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_active_booking': {
        const validated = GetBookingByRoomSchema.parse(args);
        const booking = await airtableService.getBookingByRoomNumber(
          validated.roomNumber
        );

        if (!booking) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'No active booking found for this room',
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  booking,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Unknown tool: ${name}`,
              }),
            },
          ],
        };
    }
  } catch (error) {
    // Log dettagliato dell'errore per debug
    console.error('Tool execution error:', {
      tool: name,
      args,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Hospitality Hub server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
