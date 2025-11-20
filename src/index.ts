#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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
import express from 'express';
import cors from 'cors';

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

// Factory function to create tool call handler
function createToolCallHandler() {
  return async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      // Initialize airtable service on first use
      const service = initializeAirtableService();

    switch (name) {
      case 'check_availability': {
        const validated = CheckAvailabilitySchema.parse(args);
        const availableRooms = await service.checkAvailability(validated);

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
        const room = await service.getRoomByNumber(
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
        const booking = await service.updateBooking(
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
        const menu = await service.getMenu(validated.category);

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
          const menuItem = await service.getMenuItem(item.menuItemId);
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
        const room = await service.getRoomByNumber(validated.roomNumber);

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
        const booking = await service.getBookingByRoomNumber(
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
  };
}

// Factory function to create and configure MCP server
function createMCPServer() {
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
  server.setRequestHandler(CallToolRequestSchema, createToolCallHandler());

  return server;
}

// Create server for stdio mode
const stdioServer = createMCPServer();

// Start the server
async function main() {
  const mode = process.env.SERVER_MODE || 'stdio';

  if (mode === 'http') {
    // HTTP/SSE mode for cloud deployment (Railway, etc.)
    const app = express();
    const PORT = parseInt(process.env.PORT || '3000', 10);

    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', service: 'mcp-hospitality-hub' });
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      res.json({
        service: 'mcp-hospitality-hub',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          sse: '/sse'
        }
      });
    });

    // SSE endpoint for MCP
    app.get('/sse', async (req, res) => {
      const connectionId = Date.now();
      console.error(`[${connectionId}] === NEW SSE CONNECTION ===`);
      console.error(`[${connectionId}] IP: ${req.ip}`);
      console.error(`[${connectionId}] Headers:`, JSON.stringify(req.headers, null, 2));
      console.error(`[${connectionId}] Query params:`, JSON.stringify(req.query, null, 2));

      try {
        // Disable nginx/proxy buffering for SSE
        res.setHeader('X-Accel-Buffering', 'no');
        console.error(`[${connectionId}] Set X-Accel-Buffering header`);

        // Create a new MCP server instance for this SSE connection
        console.error(`[${connectionId}] Creating MCP server instance...`);
        const sseServer = createMCPServer();

        // Create SSE transport (it will set its own headers)
        console.error(`[${connectionId}] Creating SSE transport...`);
        const transport = new SSEServerTransport('/message', res);

        // Connect the server to the transport
        console.error(`[${connectionId}] Connecting server to transport...`);
        await sseServer.connect(transport);
        console.error(`[${connectionId}] Server connected successfully!`);

        // Handle connection close
        req.on('close', () => {
          console.error(`[${connectionId}] SSE connection closed`);
        });

        req.on('error', (error) => {
          console.error(`[${connectionId}] SSE connection error:`, {
            message: error.message,
            stack: error.stack,
            code: (error as any).code
          });
        });

      } catch (error) {
        console.error(`[${connectionId}] Error setting up SSE connection:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to establish SSE connection',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    // Message endpoint for SSE - handled by SSEServerTransport
    app.post('/message', async (req, res) => {
      console.error('=== MESSAGE ENDPOINT CALLED ===');
      console.error('IP:', req.ip);
      console.error('Headers:', JSON.stringify(req.headers, null, 2));
      console.error('Body:', JSON.stringify(req.body, null, 2));

      // The SSEServerTransport handles the actual message processing
      // This endpoint just needs to acknowledge receipt
      res.status(200).end();
      console.error('Message endpoint response sent (200 OK)');
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.error(`MCP Hospitality Hub HTTP server running on port ${PORT}`);
      console.error(`Health check: http://0.0.0.0:${PORT}/health`);
      console.error(`SSE endpoint: http://0.0.0.0:${PORT}/sse`);
    });
  } else {
    // Stdio mode for local use (Claude Desktop, etc.)
    const transport = new StdioServerTransport();
    await stdioServer.connect(transport);
    console.error('MCP Hospitality Hub server running on stdio');
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
