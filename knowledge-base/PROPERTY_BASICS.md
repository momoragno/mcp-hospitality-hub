# Zoku Amsterdam - Property Basics

## Property Information

**Name**: Zoku Amsterdam
**Address**: Weesperstraat 105, 1018 VN Amsterdam, Netherlands
**Location**: Eastern canal district, 10 min from Central Station, 30 min from Schiphol Airport
**Contact**:
- Email: helloamsterdam@livezoku.com
- Phone: +31 20 811 2811

**Concept**: Zoku is a home-office hybrid designed for traveling professionals, digital nomads, and teams. It combines hotel services with community-oriented living and working spaces.

**Total Capacity**: 133 Lofts/Rooms (58 total units when counting connected rooms)

---

## Room Types & Pricing

All pricing shown is per night. Actual availability comes from MCP tools (real-time Airtable data).

### Zoku Loft (24m²)
- **Price**: €180/night
- **Capacity**: 2 guests
- **Features**: King-size lofted bed, living room, full kitchen, 4-person table, bathroom
- **Best for**: Remote workers, business travelers, 5+ night stays

### Zoku Loft XL (30m²)
- **Price**: €220/night
- **Capacity**: 2 guests
- **Features**: Extra space vs. standard Loft, full kitchen, 4-person table, gym rings, can connect to Zoku Room
- **Best for**: Longer stays, business travelers who need more space

### Zoku Loft XXL (46m²)
- **Price**: €280/night
- **Capacity**: 3 guests (ONLY family-appropriate option)
- **Features**: Adjacent extra bedroom and bathroom, full kitchen, 4-person table, wheelchair-accessible unit available
- **Best for**: Families, groups of 3

### Zoku Room (16m²)
- **Price**: €150/night
- **Capacity**: 2 guests
- **Features**: Cozy double bed, efficient space design, can connect to Zoku Loft XL
- **Best for**: Budget-conscious business travelers, short stays (1-3 nights)

### Bootstrap Room (13m²)
- **Price**: €130/night
- **Capacity**: 2 guests
- **Features**: Compact bunk beds, all essentials included
- **Best for**: Budget travelers, backpackers, cost-conscious guests

**Important Room Notes**:
- NO twin beds available (only Bootstrap has bunk beds)
- Primarily designed for business-traveling adults
- Families MUST book Loft XXL (only room for 3 people)
- Stay duration: 1 night to 1 year
- Full cleaning every 7 nights (extra cleaning available on request)

---

## Guest Segments

Understanding guest types helps AI provide appropriate recommendations and use correct MCP tools.

### Remote Worker / Digital Nomad
**Characteristics**:
- 5+ night stays
- Needs workspace and reliable WiFi
- Values community events
- Often uses coworking spaces

**Typical Room**: Zoku Loft, Zoku Loft XL

**Common Add-Ons**:
- Coworking day pass (€39/day)
- WorkZoku monthly membership (€200/month)
- Late checkout on weekends
- Breakfast packages

**Tool Usage**: Often existing guests → use `getActiveBooking` when they mention room number

---

### Business Traveler
**Characteristics**:
- Short stays (1-3 nights)
- Corporate/professional travel
- Efficiency-focused
- Needs quick check-in/out

**Typical Room**: Zoku Room, Zoku Loft

**Common Needs**:
- Early breakfast
- Meeting room access
- Express services

**Tool Usage**: New booking inquiries → use `getAvailableRooms` with specific dates

---

### Family Traveler
**Characteristics**:
- Traveling with children
- Needs more space
- Requires 3-person capacity

**Typical Room**: Zoku Loft XXL (ONLY option for 3 people)

**Important**: Zoku is primarily for business travelers. Only Loft XXL accommodates families.

**Tool Usage**: Must filter for 3 guests → use `getAvailableRooms` with `guests: 3`

---

### Budget Traveler
**Characteristics**:
- Cost-conscious
- Willing to sacrifice space for savings
- Often younger travelers
- May not need all amenities

**Typical Room**: Bootstrap Room, Zoku Room

**Common Preferences**:
- Skip daily cleaning
- Late check-in flexibility
- Minimal add-ons
- Self-service options

**Tool Usage**: Show Bootstrap Room first when price is primary concern

---

### Existing Guest (Already Checked In)
**Characteristics**:
- Currently staying at Zoku
- Mentions room number in conversation
- Wants services (food, info, housekeeping)
- NOT looking for new room booking

**Critical Tool Rule**:
- ✅ ALWAYS use `getActiveBooking({ roomNumber: "X" })` to verify
- ❌ NEVER use `getAvailableRooms` for existing guests

**Common Requests**:
- Booking information → `getActiveBooking`
- Room features → `getRoomInfo`
- Change dates → `updateBooking`

---

## Facilities & Services

### Workspace & Coworking
- **Rooftop Coworking**: Shared workspace with WiFi, desk space
- **Coworking Day Pass**: €39/day (includes lunch, coffee/tea, Fika break)
- **WorkZoku Monthly Membership**: €200/month (unlimited 24/7 access, community events, 15% F&B discount)

### Meeting Spaces
- **Work & Play Room**: 3-6 person capacity, creative setup
- **Event Space**: 1-175 person capacity, rooftop location
- **Party Pop-Up**: Evening space, up to 50 guests
- **Private Terrace**: 1-50 person capacity, greenery and sunset views

### Additional Services
- 24/7 staff availability
- Free fast WiFi throughout building
- Bike rental (starting €19/day)
- Storage lockers
- Launderette

---

## Check-In & Check-Out Times

**Check-In**: 15:00 (3:00 PM)
- Self-check-in kiosks available (6th floor)
- Late arrivals welcome (inform staff)

**Check-Out**: 11:00 (11:00 AM)
- Late checkout options available (subject to availability)

**Luggage Storage**:
- Before check-in: Free in lockers (floor -1)
- After check-out: €6/day

---

## Guest Information Requirements

When creating bookings via `addBooking` tool:

**Required**:
- Full name (as on ID)
- Check-in date (ISO format: YYYY-MM-DD)
- Check-out date (ISO format: YYYY-MM-DD)
- Number of guests
- Room ID (from `getAvailableRooms` results)

**Optional but Recommended**:
- Email address
- Phone number
- Special requests

---

## Policy Highlights

### Pets
- Allowed in terraces, Social Spaces, and Lofts
- Specific conditions apply

### Smoking
- NO smoking indoors (€250 penalty)
- Allowed on terraces or outside only

### Payment
- Cashless property
- Major credit cards accepted
- iDEAL accepted

### Tourist Tax
- 12.5% of nightly rate (excluding VAT)
- Extra guests: €3 per person/day

---

## Quick Room Selection Guide

Use this to recommend rooms based on guest needs:

| Guest Need | Recommended Room | Price | Reason |
|------------|------------------|-------|--------|
| Budget | Bootstrap Room | €130 | Most affordable |
| Business (short stay) | Zoku Room | €150 | Efficient, cost-effective |
| Remote work (long stay) | Zoku Loft | €180 | Full kitchen, workspace |
| Extra space | Zoku Loft XL | €220 | More room, can connect to Zoku Room |
| Family (3 people) | Zoku Loft XXL | €280 | ONLY option for 3 guests |

---

## Important Reminders for AI

1. **Real-time data**: All availability and pricing comes from MCP tools (Airtable), not this document
2. **Room capacity**: Only Loft XXL can accommodate 3 guests
3. **No twin beds**: Bootstrap has bunks; all others have double/king beds
4. **Existing guests**: When guest mentions room number → use `getActiveBooking`, NOT `getAvailableRooms`

---

## Contact & Escalation

**For complex inquiries**:
- Group bookings (5+ rooms): helloamsterdam@livezoku.com
- Meeting room bookings: meetamsterdam@livezoku.com
- General inquiries: +31 20 811 2811

**Staff Availability**: 24/7
