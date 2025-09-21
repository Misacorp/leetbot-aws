/**
 * Builds a minimal API Gateway/Lambda proxy JSON response.
 * Purpose: keep handlers focused on logic by centralizing HTTP formatting.
 */
export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Converts a hex-encoded string to a Uint8Array.
 * Purpose: support Ed25519 verification and other crypto helpers.
 */
export const hexToUint8 = (hex: string): Uint8Array => {
  if (!/^([0-9a-fA-F]{2})+$/.test(hex)) throw new Error("Invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return out;
};

/**
 * Encodes a string to UTF-8 bytes.
 * Purpose: provide a consistent text→bytes helper for signature checks.
 */
export const textToUint8 = (s: string) => new TextEncoder().encode(s);

/**
 * Discord option node for slash commands.
 * Purpose: share a simple type used across interaction utilities.
 */
export type Option = {
  name: string;
  type: number;
  value?: any;
  options?: Option[];
};

/**
 * Returns the first subcommand (or nested subcommand) from a Discord options array.
 * Purpose: simplify parsing of slash command shapes without leaking Discord specifics.
 */
export const getSubcommand = (opts?: Option[]) => {
  if (!opts?.length) return undefined;
  // Discord uses 1 for SUB_COMMAND and 2 for SUB_COMMAND_GROUP
  const sub = opts.find((o) => o.type === 1);
  if (sub) return sub;
  const group = opts.find((o) => o.type === 2);
  return group?.options?.find((o) => o.type === 1) || group;
};

/**
 * Finds a named option value within a Discord options array.
 * Purpose: small convenience to keep handlers declarative when reading args.
 */
export const getOpt = (opts: Option[] | undefined, name: string) =>
  opts?.find((o) => o.name === name)?.value;

/**
 * Normalizes a Discord interaction into an EventBridge event tuple.
 * Purpose: decouple command UX (names/subcommands) from backend routing.
 */
export const normalizeCommandToEvent = (
  interaction: any,
): { detailType: string; detail: any } => {
  const data = interaction.data || {};
  const name: string = (data.name || "").toLowerCase();
  const options: Option[] | undefined = data.options;
  const sub = getSubcommand(options);

  const baseInteraction = {
    id: interaction.id,
    token: interaction.token, // NOTE: consider swapping to token_ref + TTL store upstream
    application_id: interaction.application_id,
    guild_id: interaction.guild_id,
    channel_id: interaction.channel?.id || interaction.channel_id,
    invoker_id: interaction.member?.user?.id || interaction.user?.id,
    ephemeral: true,
  };

  // /ranking leet [user]
  if (name === "ranking" && sub?.name?.toLowerCase() === "leet") {
    const userId = getOpt(sub?.options, "user");
    return {
      detailType: "ranking.leet",
      detail: {
        interaction: baseInteraction,
        payload: { user_id: userId },
      },
    };
  }

  // Speed-style: fastest/slowest with metric leet/leeb
  // See how commands are registered in registerCommands.ts
  // TODO: Normalize the commands registered to some kind of types and use them here
  if (name === "speed") {
    const mode = getOpt(options, "mode") ?? "fastest";
    const metric = getOpt(options, "type") ?? "leet";
    return {
      detailType: "speed.query",
      detail: {
        interaction: baseInteraction,
        query: {
          mode: String(mode).toLowerCase(),
          metric: String(metric).toLowerCase(),
          window: getOpt(options, "window") ?? "all",
        },
      },
    };
  }

  // Default: unknown → still emit for observability
  return {
    detailType: "unknown.command",
    detail: {
      interaction: baseInteraction,
      raw: { name, options },
    },
  };
};
