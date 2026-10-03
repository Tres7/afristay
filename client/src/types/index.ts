export type PropertyType = "hotel" | "appartement" | "villa";

export type AmenityType = "piscine" | "wifi" | "clim" | "parking" | "cuisine" | "jardin" | "gym" | "spa";

export interface Property {
  id: string;
  name: string;
  location: string;
  city: string;
  country: string;
  price: number;
  rating: number;
  reviews: number;
  type: PropertyType;
  amenities: AmenityType[];
  images: string[];
  description: string;
  isFavorite?: boolean;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  count: number;
  color: string;
  image?: string;
}

export type PaymentMethod = "mobile_money" | "carte" | "paypal";

export interface Booking {
  id: string;
  property: Property;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  pricePerNight: number;
  serviceFee: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: "pending" | "confirmed" | "cancelled";
}

export type ActivityCategory = "activite" | "restaurant" | "loisir" | "site";

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  city: string;
  country: string;
  rating: number;
  price: number | null;
  description: string;
  image?: string;
  tags: string[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

export interface Conversation {
  id: string;
  propertyId: string;
  propertyName: string;
  hostName: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageAt: string;
  messages: Message[];
}

export interface SearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}
