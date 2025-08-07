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
}

export interface GuildDbo extends Guild {
  pk1: `guild#${Guild["id"]}`;
  sk1: "metadata";
}
