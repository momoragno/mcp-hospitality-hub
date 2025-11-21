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

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  available: boolean;
  allergens?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
}

export interface MenuFilters {
  category?: string;
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  excludeAllergens?: string[];
}

export interface RoomServiceOrder {
  id?: string;
  roomNumber: string;
  items: {
    menuItemId: string;
    quantity: number;
    name?: string;
    price?: number;
  }[];
  totalAmount: number;
  orderTime: string; // ISO datetime
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled';
  specialInstructions?: string;
}

export interface AvailabilityQuery {
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  guests?: number;
  roomType?: string;
}
