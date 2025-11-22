# MCP Tools Reference for AI Agent

## Overview
This document describes the 5 MCP tools available for the Hotel X hospitality system. These tools interact with Airtable to provide real-time room availability and booking management.

---

## Tool Catalog

### 1. getActiveBooking
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
- Total price
- Status
- Special requests

**Examples**:
```
Guest: "I'm in room 204"
→ getActiveBooking({ roomNumber: "204" })

Guest: "Check my reservation for John Smith"
→ getActiveBooking({ guestName: "John Smith" })

Guest: "My booking confirmation is BOOK123"
→ getActiveBooking({ bookingId: "BOOK123" })
```

**CRITICAL**:
- ❌ NEVER use this for checking availability for NEW bookings (use getAvailableRooms instead)
- ✅ ALWAYS use when guest mentions they're currently staying or have an existing reservation

---

### 2. getAvailableRooms
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
- ❌ NEVER auto-generate dates that guest didn't explicitly mention
- ❌ NEVER use this for existing guests (room number already mentioned)
- ✅ ONLY use when guest provides specific check-in/out dates for NEW booking

---

### 3. addBooking
**Purpose**: Create a new room booking reservation

**When to use**:
- After guest selects a room from getAvailableRooms results
- Guest confirms they want to book a specific room
- Ready to finalize a new reservation

**Required workflow**:
1. Call `getAvailableRooms` first
2. Guest selects a room
3. Collect guest information
4. Call `addBooking` with roomId from step 1

**Parameters**:
```
{
  roomId: string,          // Room ID from getAvailableRooms - REQUIRED
  guestName: string,       // Guest full name - REQUIRED
  guestEmail?: string,     // Guest email (recommended)
  guestPhone?: string,     // Guest phone number
  checkIn: string,         // ISO date (YYYY-MM-DD) - REQUIRED
  checkOut: string,        // ISO date (YYYY-MM-DD) - REQUIRED
  guests: number,          // Number of guests - REQUIRED
  specialRequests?: string // Any special requests or notes
}
```

**Returns**: Booking confirmation with:
- Booking ID (confirmation number)
- Room details
- Guest information
- Dates and pricing
- Status (confirmed)

**Examples**:
```
After showing availability and guest selects Loft:

→ addBooking({
    roomId: "recAbc123",
    guestName: "John Smith",
    guestEmail: "john@example.com",
    guestPhone: "+1234567890",
    checkIn: "2025-12-01",
    checkOut: "2025-12-03",
    guests: 2,
    specialRequests: "Early check-in if possible"
  })
```

**CRITICAL**:
- ❌ NEVER call this without calling getAvailableRooms first
- ✅ ALWAYS verify the roomId comes from getAvailableRooms results
- ✅ ALWAYS confirm all details with guest before finalizing

---

### 4. updateBooking
**Purpose**: Modify an existing booking (dates, guests, status, requests)

**When to use**:
- Guest wants to change check-in or check-out dates
- Guest wants to modify number of guests
- Guest wants to change/add special requests
- Staff needs to update booking status (checked-in, checked-out, cancelled)

**Parameters**:
```
{
  bookingId: string,       // Booking ID - REQUIRED
  checkIn?: string,        // New check-in date (ISO format)
  checkOut?: string,       // New check-out date (ISO format)
  guests?: number,         // New number of guests
  status?: string,         // "confirmed", "checked-in", "checked-out", "cancelled"
  specialRequests?: string // Updated special requests
}
```

**Returns**: Updated booking details with:
- All current booking information
- List of fields that were changed
- New total price if dates changed

**Examples**:
```
Guest: "I want to extend my checkout to December 5th"
→ updateBooking({ bookingId: "BOOK123", checkOut: "2025-12-05" })

Guest: "Change my booking to 3 people instead of 2"
→ updateBooking({ bookingId: "BOOK123", guests: 3 })

Staff: "Mark room 204 as checked in"
→ updateBooking({ bookingId: "BOOK123", status: "checked-in" })
```

**CRITICAL**:
- ✅ ALWAYS confirm changes with guest before applying
- ✅ Inform guest if price changes due to date modifications

---

### 5. getRoomInfo
**Purpose**: Get detailed information about a specific room by room number

**When to use**:
- Guest asks about room features or amenities
- Guest wants to know pricing for a specific room
- Guest asks "tell me about room 204"
- Providing details about room types

**Parameters**:
```
{
  roomNumber: string       // Numeric room number - REQUIRED (e.g., "101", "305")
}
```

**Returns**: Room details including:
- Room number and type
- Price per night
- Capacity (max guests)
- Amenities list
- Current status (available, occupied, maintenance)
- Room ID

**Examples**:
```
Guest: "What amenities does room 204 have?"
→ getRoomInfo({ roomNumber: "204" })

Guest: "How much is a Loft room?"
→ getRoomInfo({ roomNumber: "101" }) // if 101 is a Loft
```

**CRITICAL**:
- ❌ NEVER confuse room number with other concepts (like "menu")
- ✅ Room number should be numeric (e.g., "101", "305", NOT "menu" or other words)

---

## Tool Selection Decision Tree

```
Did guest mention room number ("I'm in room X")?
├─ YES → Use getActiveBooking
│   └─ Guest is EXISTING, not looking for NEW booking
└─ NO
   │
   Did guest provide CHECK-IN/CHECK-OUT DATES?
   ├─ YES → Use getAvailableRooms (NEW booking)
   │   └─ Then addBooking if they select room
   └─ NO → Ask clarifying questions
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Using getAvailableRooms for existing guests

```
Guest: "I'm in room 204"
❌ WRONG: getAvailableRooms({ ... })
✅ CORRECT: getActiveBooking({ roomNumber: "204" })
```

**Fix**: Check if request is from existing guest BEFORE checking for new booking intent

---

### ❌ Mistake 2: Auto-generating dates

```
Guest: "Do you have rooms?"
❌ WRONG: getAvailableRooms({ checkIn: TODAY, checkOut: TOMORROW })
✅ CORRECT: "What dates are you looking for?"
```

**Fix**: Always ask for dates explicitly before calling getAvailableRooms

---

### ❌ Mistake 3: Not calling getAvailableRooms before addBooking

```
Guest: "Book me a room for Dec 1-3"
❌ WRONG: Directly call addBooking({ ... })
✅ CORRECT:
   1. getAvailableRooms({ checkIn: "2025-12-01", checkOut: "2025-12-03" })
   2. Present options
   3. Guest selects
   4. addBooking({ roomId: "...", ... })
```

---

## Critical Rules Summary

### Rule 1: Existing Guest Detection
When guest says "I'm in room X":
1. Store in context: `currentRoomNumber = X`
2. Mark: `isExistingGuest = true`
3. Call: `getActiveBooking({ roomNumber: X })`
4. From this point: Guest wants SERVICES, NOT new booking

### Rule 2: New Booking Process
Guest provides dates:
1. Confirm dates explicitly
2. Call: `getAvailableRooms({ checkIn: "...", checkOut: "..." })`
3. Present options
4. Collect guest info
5. Call: `addBooking({ ... })`

### Rule 3: When Ambiguous → Ask First
```
Guest: "What's available?"
→ "Are you asking about rooms for a future stay or general information?"

Guest: "Next Friday"
→ "Just to confirm, that would be December 6th? And checking out which day?"
```

---

## Quick Reference Table

| Scenario | Correct Tool | Parameters |
|----------|--------------|------------|
| "I'm in room 204" | getActiveBooking | `{ roomNumber: "204" }` |
| "Rooms for Dec 1-3?" | getAvailableRooms | `{ checkIn: "2025-12-01", checkOut: "2025-12-03" }` |
| "Book the Loft" (after availability check) | addBooking | `{ roomId: "...", guestName: "...", ... }` |
| "Extend my stay to Dec 5" | updateBooking | `{ bookingId: "...", checkOut: "2025-12-05" }` |
| "What's in room 204?" | getRoomInfo | `{ roomNumber: "204" }` |
| "Find my booking" | getActiveBooking | `{ guestName: "..." }` or `{ guestEmail: "..." }` |

---

## Test Scenarios

Use these to validate implementation:

### 1. New booking flow
```
Input: Guest wants room for Dec 1-3
Expected sequence:
   - ✅ getAvailableRooms({ checkIn: "2025-12-01", checkOut: "2025-12-03" })
   - ✅ addBooking({ roomId: "...", ... })
Never:
   - ❌ getActiveBooking
```

### 2. Existing guest
```
Input: "I'm in room 204, I need to extend"
Expected sequence:
   - ✅ getActiveBooking({ roomNumber: "204" })
   - ✅ updateBooking({ bookingId: "...", checkOut: "..." })
Never:
   - ❌ getAvailableRooms
```

### 3. Room information
```
Input: "Tell me about room 204"
Expected:
   - ✅ getRoomInfo({ roomNumber: "204" })
```

---

## Key Takeaways

1. **Existing guest ("I'm in room X")** = getActiveBooking
2. **New booking with dates** = getAvailableRooms → addBooking
3. **Modify existing booking** = updateBooking
4. **Room details** = getRoomInfo
5. **Never auto-generate dates** - always ask first
6. **Always verify context** before selecting tool
