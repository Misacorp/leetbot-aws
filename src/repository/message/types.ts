import { MessageType } from "@/src/types";

export interface Message {
  messageType: MessageType;
  createdAt: string; // ISO-8601
  userId: string;
  guildId: string;
  id: string;
}

export interface MessageDbo extends Message {
  // Guild-wide rankings for a specific message type.
  //   Time range: sk1 BETWEEN fromISO toISO
  pk1: `guild#${Message["guildId"]}#messageType#${MessageType}`;
  sk1: `createdAt#${Message["createdAt"]}#messageId#${Message["id"]}`; // ISO sorts and messageId disambiguates same-ms writes

  // Per-user rankings. Scoped to guild.
  //   Existence check: pk2 = guild#user# AND begins_with(sk2, createdAt#YYYY-MM-DD).
  //   Time range: sk2 BETWEEN fromISO toISO
  pk2: `guild#${Message["guildId"]}#user#${Message["userId"]}`;
  sk2: `createdAt#${Message["createdAt"]}#messageId#${Message["id"]}`;

  // Speed rankings. Fastest and slowest messages by message type.
  // Optional. GSI values are only added for game messages.
  //   Query: pk4 = guild#abc123#messageType#leet.
  //          ScanIndexForward: true (fastest) or false (slowest).
  pk3?: `guild#${Message["guildId"]}#messageType#${MessageType}`;
  sk3?: `speed#${string}#createdAt#${Message["createdAt"]}#messageId#${Message["id"]}`;

  // Leet streaks
  // No GSI for this. Use pk2/sk2 to query for all the user's messages or implement a rollup row with streams.
}
