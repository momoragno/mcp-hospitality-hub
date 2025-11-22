export interface Room {
  id: string;
  number: string;
  type: string;
  price: number;
  capacity: number;
  amenities: string[];
  status: 'available' | 'occupied' | 'maintenance';
}

export interface Booking {
  id?: string;
  roomId: string;
  roomNumber?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  guests: number;
  totalPrice?: number;
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  specialRequests?: string;
}

export interface AvailabilityQuery {
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  guests?: number;
  roomType?: string;
}
