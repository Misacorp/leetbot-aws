import { APIEmbed } from "discord-api-types/v10";

interface RankingEntry {
  id: string;
  messageCount: number;
}

// Medals for the top 3 positions
const medals = ["🥇", "🥈", "🥉"];

export const createRankingFields = (
  rankings: RankingEntry[],
): APIEmbed["fields"] => {
  const fields: APIEmbed["fields"] = [];

  // No data
  if (rankings.length === 0) {
    return [
      {
        name: `🤷`,
        value: "It's empty here 👀",
      },
    ];
  }

  // Top 3
  for (let i = 0; i < Math.min(3, rankings.length); i += 1) {
    fields.push({
      name: `${medals[i]} ${rankings[i].messageCount}`,
      value: `<@${rankings[i].id}>`,
      inline: true,
    });
  }

  // Positions 4-10
  if (rankings.length > 3) {
    const remainingRankings = rankings
      .slice(3, 10) // Get positions 4-10 (indices 3-9)
      .map(
        (ranking, index) =>
          `${index + 4}th <@${ranking.id}> - ${ranking.messageCount}`,
      )
      .join("\n");

    fields.push({
      name: "Places 4-10",
      value: `${remainingRankings}`,
      inline: false,
    });
  }

  return fields;
};
