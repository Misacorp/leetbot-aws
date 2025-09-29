/**
 * Payload returned from interaction handlers
 * TODO: This doesn't need to be anything.
 *       We're not replying to Discord directly as the ingress function already does that.
 *       We could simply just throw or not return anything in the handlers.
 */
export interface DiscordWebhookResponse {
  success: boolean;
  status?: number;
  error?: string;
}
