import { Routes, type REST } from "/opt/nodejs/discord";
import type { RESTGetAPIGuildMembersResult } from "discord-api-types/v10";

/**
 * Fetches all guild members through paginated Discord REST requests.
 */
export const getAllGuildMembers = async ({
  rest,
  guildId,
}: {
  rest: REST;
  guildId: string;
}): Promise<RESTGetAPIGuildMembersResult> => {
  let members: RESTGetAPIGuildMembersResult = [];
  let after: string | undefined;

  while (true) {
    const page = (await rest.get(
      `${Routes.guildMembers(guildId)}?limit=1000${after ? `&after=${after}` : ""}`,
    )) as RESTGetAPIGuildMembersResult;

    members = [...members, ...page];

    if (page.length < 1000) {
      return members;
    }

    const nextAfter = page[page.length - 1]?.user?.id;
    if (!nextAfter) {
      return members;
    }

    after = nextAfter;
  }
};
