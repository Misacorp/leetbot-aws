import { ALL_GUILDS_PK } from "@/src/repository/guild/keys";

export interface Emoji {
  id: string;
  name: string | null;
  identifier: string;
  imageUrl: string | null;
}

export interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  emojis: Emoji[];
  seasonWinnerRoleId?: string;
}

export type GuildKey = `guild#${Guild["id"]}`;

export interface GuildDbo extends Guild {
  pk1: GuildKey;
  sk1: "metadata";
  pk2: typeof ALL_GUILDS_PK;
  sk2: GuildKey;
}
