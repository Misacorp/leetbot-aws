import { MessageType } from "@/src/types";

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
