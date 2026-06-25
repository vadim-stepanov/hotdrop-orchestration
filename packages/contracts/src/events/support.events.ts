// Support ticket created in ratings-service → notifications reactor.

export const SUPPORT_TICKET_CREATED = "event.support.ticket_created";

export interface SupportTicketCreatedEvent {
  ticketId: string;
  customerId: string;
  subject: string;
}
