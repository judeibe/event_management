export interface RegistrationResponse {
  readonly id: string;
  readonly eventId: string;
  readonly attendeeRef: string;
  readonly status: 'ACTIVE' | 'CANCELLED';
}
