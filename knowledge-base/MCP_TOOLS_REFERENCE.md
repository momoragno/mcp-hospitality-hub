# MCP Tools Reference for AI Agent

## Overview
This document describes the 7 MCP tools available for the Zoku Amsterdam hospitality system. These tools interact with Airtable to provide real-time room availability, bookings, menu items, and room service orders.

---

## Tool Catalog

### 1. getMenu
**Purpose**: Retrieve restaurant and room service menu items with optional dietary filters

**When to use**:
- Guest asks about food, dining, or menu
- Guest mentions dietary preferences (vegetarian, vegan, gluten-free)
- Guest wants to order food
- Guest asks about breakfast, lunch, dinner, or drinks

**Parameters**:
```
{
  category?: string,        // "breakfast", "lunch", "dinner", "drinks", "desserts"
  vegetarian?: boolean,     // Show only vegetarian items
  vegan?: boolean,          // Show only vegan items
  glutenFree?: boolean,     // Show only gluten-free items
  excludeAllergens?: string[] // e.g., ["dairy", "nuts", "gluten", "shellfish"]
}
```

**Returns**: List of menu items with:
- Item name, description, price
- Category
- Dietary tags (vegetarian, vegan, gluten-free)
- Allergen information
- Item ID (needed for placing orders)

**Examples**:
```
Guest: "What's on the dinner menu?"
→ getMenu({ category: "dinner" })

Guest: "I'm vegetarian"
→ getMenu({ vegetarian: true })

Guest: "I want vegetarian dinner options"
→ getMenu({ category: "dinner", vegetarian: true })

Guest: "I'm allergic to nuts"
→ getMenu({ excludeAllergens: ["nuts"] })
```

---

### 2. getActiveBooking
**Purpose**: Search for EXISTING guest bookings by various criteria

**When to use**:
- Guest says "I'm in room [number]"
- Guest asks about "my reservation" or "my booking"
- Guest wants to check booking details
- Verifying a guest's checked-in status
- Looking up booking by name, email, or phone

**Parameters** (at least one required):
```
{
  roomNumber?: string,     // Room number (e.g., "204")
  guestName?: string,      // Guest name (partial match supported)
  guestEmail?: string,     // Guest email (partial match supported)
  guestPhone?: string,     // Guest phone number
  bookingId?: string       // Booking ID for direct lookup
}
```

**Returns**: List of active bookings (status: confirmed or checked-in) with:
- Booking ID
- Room number
- Guest name, email, phone
- Check-in and check-out dates
- Number of guests
- Status
- Total price
- Special requests

**Examples**:
```
Guest: "I'm in room 204"
→ getActiveBooking({ roomNumber: "204" })

Guest: "Can you look up my reservation? Name is John Smith"
→ getActiveBooking({ guestName: "John Smith" })

Guest: "Check booking for john@example.com"
→ getActiveBooking({ guestEmail: "john@example.com" })
```

**IMPORTANT**: This tool is ONLY for existing bookings. Do NOT use this for checking availability for new bookings.

---

### 3. getAvailableRooms
**Purpose**: Check room availability for NEW bookings on specific dates

**When to use**:
- Guest provides specific check-in and check-out dates
- Guest asks "do you have rooms available for [dates]"
- New booking inquiry (NOT for existing guests)
- Guest wants to see room options for a future stay

**Parameters**:
```
{
  checkIn: string,         // ISO date format (YYYY-MM-DD) - REQUIRED
  checkOut: string,        // ISO date format (YYYY-MM-DD) - REQUIRED
  guests?: number,         // Number of guests (optional)
  roomType?: string        // Room type filter (optional)
}
```

**Returns**: List of available rooms with:
- Room number, type, price per night
- Capacity
- Amenities
- Room ID (needed for creating booking)
- Total price calculation for stay duration

**Examples**:
```
Guest: "Do you have rooms available December 1st to 3rd?"
→ getAvailableRooms({ checkIn: "2025-12-01", checkOut: "2025-12-03" })

Guest: "Looking for a room next weekend for 2 people"
→ getAvailableRooms({ checkIn: "2025-11-23", checkOut: "2025-11-25", guests: 2 })
```

**CRITICAL**:
- ❌ NEVER call this tool when guest mentions food, menu, or dining
- ❌ NEVER auto-generate dates that guest didn't explicitly mention
- ❌ NEVER use this for existing guests (room number already mentioned)
- ✅ ONLY use when guest provides specific check-in/out dates for NEW booking

---

### 4. addBooking
**Purpose**: Create a new room booking reservation

**When to use**:
- After guest selects a room from getAvailableRooms results
- Guest confirms they want to book a specific room

**Parameters**:
```
{
  roomId: string,          // Room ID from getAvailableRooms - REQUIRED
  guestName: string,       // Guest full name - REQUIRED
  guestEmail?: string,     // Guest email (optional but recommended)
  guestPhone?: string,     // Guest phone number (optional)
  checkIn: string,         // ISO date (YYYY-MM-DD) - REQUIRED
  checkOut: string,        // ISO date (YYYY-MM-DD) - REQUIRED
  guests: number,          // Number of guests - REQUIRED
  specialRequests?: string // Special requests or notes (optional)
}
```

**Returns**: Booking confirmation with:
- Booking ID
- Room number and type
- Guest details
- Check-in/check-out dates
- Total price
- Status (confirmed)

**Example**:
```
After getAvailableRooms shows room options:
Guest: "I'll take the Zoku Loft"
→ addBooking({
    roomId: "rec123abc",
    guestName: "John Smith",
    guestEmail: "john@example.com",
    checkIn: "2025-12-01",
    checkOut: "2025-12-03",
    guests: 1,
    specialRequests: "Late check-in after 22:00"
  })
```

---

### 5. addRoomServiceOrder
**Purpose**: Place a food/drink order for delivery to a guest's room

**When to use**:
- After guest selects items from getMenu
- Guest confirms they want to order
- Guest is ready to place room service order

**Parameters**:
```
{
  roomNumber: string,           // Room number for delivery - REQUIRED
  items: Array<{                // Array of ordered items - REQUIRED
    menuItemId: string,         // Item ID from getMenu results
    quantity: number            // Quantity to order
  }>,
  specialInstructions?: string  // Special instructions (optional)
}
```

**Returns**: Order confirmation with:
- Order ID
- Room number
- Ordered items with quantities and prices
- Total amount
- Order time
- Status (pending)
- Estimated delivery time

**Example**:
```
After showing menu via getMenu:
Guest: "I'll have the pasta and a salad"
→ addRoomServiceOrder({
    roomNumber: "204",
    items: [
      { menuItemId: "recMenuItem1", quantity: 1 },
      { menuItemId: "recMenuItem2", quantity: 1 }
    ],
    specialInstructions: "No onions in the salad"
  })
```

---

### 6. getRoomInfo
**Purpose**: Get detailed information about a specific room by room number

**When to use**:
- Guest asks about a specific room's features
- Guest wants to know room amenities
- Guest asks about pricing for a specific room type

**Parameters**:
```
{
  roomNumber: string       // Room number - REQUIRED
}
```

**Returns**: Room details including:
- Room number and type
- Price per night
- Capacity
- Amenities
- Current status (available, occupied, maintenance)
- Room ID

**Example**:
```
Guest: "Tell me about room 305"
→ getRoomInfo({ roomNumber: "305" })
```

---

### 7. updateBooking
**Purpose**: Modify an existing booking

**When to use**:
- Guest wants to change check-in or check-out dates
- Guest needs to update number of guests
- Checking guest in/out (change status)
- Updating special requests

**Parameters**:
```
{
  bookingId: string,       // Booking ID - REQUIRED
  checkIn?: string,        // New check-in date (optional)
  checkOut?: string,       // New check-out date (optional)
  guests?: number,         // New number of guests (optional)
  status?: string,         // New status: "confirmed", "checked-in", "checked-out", "cancelled"
  specialRequests?: string // Updated special requests (optional)
}
```

**Returns**: Updated booking details

**Example**:
```
Guest: "I need to extend my checkout by one day"
→ updateBooking({
    bookingId: "recBooking123",
    checkOut: "2025-12-04"
  })
```

---

## Tool Selection Decision Tree

```
┌─────────────────────────────────────────┐
│ What does the guest want?              │
└─────────────────────────────────────────┘
                  │
                  ├─► Food/Menu/Dining/Dietary preferences?
                  │   └─► getMenu
                  │
                  ├─► "I'm in room X" OR "my reservation"?
                  │   └─► getActiveBooking
                  │       (They're already checked in)
                  │
                  ├─► Provides specific check-in/out DATES?
                  │   └─► getAvailableRooms
                  │       └─► If they select a room: addBooking
                  │
                  ├─► Wants to ORDER food (after seeing menu)?
                  │   └─► addRoomServiceOrder
                  │
                  ├─► Asks about specific room features?
                  │   └─► getRoomInfo
                  │
                  ├─► Wants to CHANGE existing booking?
                  │   └─► updateBooking
                  │
                  └─► Unclear or ambiguous?
                      └─► ASK CLARIFYING QUESTIONS
```

---

## Common Mistakes & How to Avoid Them

### ❌ Mistake 1: Calling getAvailableRooms for food requests
```
Guest: "I want vegetarian dinner"
❌ WRONG: getAvailableRooms({ ... })
✅ CORRECT: getMenu({ category: "dinner", vegetarian: true })
```
**Why it happens**: AI sees "want" and thinks "booking"
**Fix**: Check if request is food-related BEFORE checking for booking intent

---

### ❌ Mistake 2: Calling getAvailableRooms for existing guests
```
Guest: "Hi, I'm in room 204. I need dinner"
❌ WRONG: getAvailableRooms({ ... })
✅ CORRECT:
   1. getActiveBooking({ roomNumber: "204" }) to verify
   2. getMenu() to show options
   3. addRoomServiceOrder({ roomNumber: "204", ... })
```
**Why it happens**: AI generates dates automatically
**Fix**: If guest mentions room number, they're already checked in. Use getActiveBooking.

---

### ❌ Mistake 3: Auto-generating dates
```
Guest: "Do you have rooms available?"
❌ WRONG: getAvailableRooms({ checkIn: TODAY, checkOut: TOMORROW })
✅ CORRECT: Ask "What dates are you looking for?"
```
**Why it happens**: AI tries to be helpful by filling missing parameters
**Fix**: NEVER infer dates. Always ask guest to provide them explicitly.

---

### ❌ Mistake 4: Using getActiveBooking for new bookings
```
Guest: "I want to book a room for next week"
❌ WRONG: getActiveBooking({ ... })
✅ CORRECT: Ask for dates, then getAvailableRooms
```
**Why it happens**: "booking" keyword triggers wrong tool
**Fix**: getActiveBooking is ONLY for EXISTING bookings. New bookings use getAvailableRooms.

---

### ❌ Mistake 5: Confusing room number with room type
```
Guest: "I'm in room 204, what room type is this?"
❌ WRONG: getAvailableRooms({ roomType: "204" })
✅ CORRECT: getRoomInfo({ roomNumber: "204" })
```
**Why it happens**: Misunderstanding parameter types
**Fix**: Room numbers are strings like "204". Room types are "Zoku Loft", "Bootstrap Room", etc.

---

## Context Management Rules

### Rule 1: Track Guest Status
```
When guest says "I'm in room X":
1. Store: currentRoomNumber = X
2. Mark: isExistingGuest = true
3. Call: getActiveBooking({ roomNumber: X })
4. From this point: Guest wants SERVICES (food, info), NOT new booking
```

### Rule 2: Food Keywords → Menu Tool
```
Keywords indicating menu request:
- food, menu, dining, eat, order
- breakfast, lunch, dinner, drinks
- vegetarian, vegan, gluten-free
- hungry, meal, cuisine

Action: Always use getMenu, NEVER getAvailableRooms
```

### Rule 3: Date Keywords → Availability Tool
```
Keywords indicating availability request:
- "for [specific dates]"
- "check in [date]"
- "December 1st to 3rd"
- "next weekend"

Action: Use getAvailableRooms (for NEW bookings only)
```

### Rule 4: When in Doubt, Ask
```
Ambiguous requests:
- "Do you have vegetarian?" → "Are you asking about our menu or room preferences?"
- "Can I book?" → "Are you looking for a room or ordering food?"
- "What's available?" → "Are you asking about rooms or menu items?"
```

---

## Quick Reference Cheat Sheet

| Guest Says | Tool to Use | Parameters |
|------------|-------------|------------|
| "Show me dinner menu" | getMenu | `{ category: "dinner" }` |
| "I'm vegetarian" | getMenu | `{ vegetarian: true }` |
| "I'm in room 204" | getActiveBooking | `{ roomNumber: "204" }` |
| "Rooms for Dec 1-3?" | getAvailableRooms | `{ checkIn: "2025-12-01", checkOut: "2025-12-03" }` |
| "Order pasta to my room" | addRoomServiceOrder | `{ roomNumber: "...", items: [...] }` |
| "What's in room 305?" | getRoomInfo | `{ roomNumber: "305" }` |
| "Change my checkout date" | updateBooking | `{ bookingId: "...", checkOut: "..." }` |
| "Book the Loft" | addBooking | `{ roomId: "...", ... }` |

---

## Testing Your Tool Selection

Use these test scenarios to validate correct tool usage:

1. **In-room dining**: Guest in room 204 orders vegetarian dinner
   - ✅ getActiveBooking({ roomNumber: "204" })
   - ✅ getMenu({ vegetarian: true })
   - ✅ addRoomServiceOrder({ roomNumber: "204", items: [...] })
   - ❌ Should NOT call getAvailableRooms

2. **New booking**: Guest wants room for specific dates
   - ✅ getAvailableRooms({ checkIn: "...", checkOut: "..." })
   - ✅ addBooking({ roomId: "...", ... })
   - ❌ Should NOT call getActiveBooking first

3. **Ambiguous "vegetarian"**: Guest just says "vegetarian"
   - ✅ Ask clarifying question
   - ❌ Should NOT call getAvailableRooms automatically

4. **Noise complaint**: Guest complains about room 203
   - ✅ getActiveBooking({ roomNumber: "203" })
   - ❌ Should NOT call getAvailableRooms

---

## Summary

**Key Takeaways**:
1. Food/dining = getMenu (NEVER getAvailableRooms)
2. "I'm in room X" = getActiveBooking (guest is already checked in)
3. Specific dates = getAvailableRooms (NEW booking only)
4. Never auto-generate dates
5. When unclear, ask clarifying questions

**Most Important Rule**: The word "book" doesn't always mean room booking. Context matters!
- "Book a room" = getAvailableRooms
- "Book a dinner" = getMenu + addRoomServiceOrder
