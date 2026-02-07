export type Role = 'BUYER' | 'SELLER' | 'ADMIN' | 'COURIER';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SOLD_OUT';
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELED';
export type FeedAction = 'VIEW' | 'CLICK' | 'FAVORITE' | 'ADD_TO_CART' | 'BUY' | 'CHAT';

export type VehicleType = 'MOTO' | 'CAR' | 'VAN';
export type CourierStatus = 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'SUSPENDED';
export type DeliveryRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
export type DeliveryStatus = 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export interface FeedRankingWeights {
  followedStore: number;
  categoryAffinity: number;
  popularity: number;
  recency: number;
  sellerResponse: number;
}
