import { Emoji } from "@/src/repository/guild/types";

// Bot-level (application-scoped) config
export interface ApplicationConfig {
  emojis: Emoji[];
}

export interface ApplicationConfigDbo extends ApplicationConfig {
  pk1: "application#metadata";
  sk1: "metadata";
}
