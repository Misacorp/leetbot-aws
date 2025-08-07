export const MessageTypes = {
  LEET: "leet",
  LEEB: "leeb",
  FAILED_LEET: "failed_leet",
  OTHER: "other",
  TEST: "test",
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];

export interface Message {
  messageType: MessageType;
  createdAt: string; // ISO-8601
  userId: string;
  guildId: string;
  id: string;
}

export interface MessageDbo extends Message {
  pk1: `user#${Message["userId"]}`;
  sk1: `createdAt#${Message["createdAt"]}`;
  pk2: `guild#${Message["guildId"]}`;
  sk2: `messageType#${Message["messageType"]}`;
}
