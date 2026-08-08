export interface EventResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventDate: string;
  readonly maxCapacity: number;
  readonly currentRegistrations: number;
  readonly category: string;
  readonly location: string;
  readonly price: number;
  readonly imageUrl: string;
}
