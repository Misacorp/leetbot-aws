// src/command-typegen.ts
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";

/**
 * Map a Discord option 'type' -> primitive "value" shape you expect to read.
 * For Discord interactions, option values are IDs (strings) for entities.
 */
type PrimitiveForType<T extends ApplicationCommandOptionType> =
  T extends ApplicationCommandOptionType.String
    ? string
    : T extends ApplicationCommandOptionType.Integer
      ? number
      : T extends ApplicationCommandOptionType.Number
        ? number
        : T extends ApplicationCommandOptionType.Boolean
          ? boolean
          : T extends
                | ApplicationCommandOptionType.User
                | ApplicationCommandOptionType.Channel
                | ApplicationCommandOptionType.Role
                | ApplicationCommandOptionType.Mentionable
                | ApplicationCommandOptionType.Attachment
            ? string // IDs of those entities
            : never;

type HasSubcommand<
  Os extends readonly { type: ApplicationCommandOptionType }[],
> =
  Extract<
    Os[number],
    { type: ApplicationCommandOptionType.Subcommand }
  > extends never
    ? false
    : true;

type SubcommandValue<O extends { options?: readonly any[] }> =
  O["options"] extends readonly any[]
    ? PartialExcept<OptionsToRecord<O["options"]>, RequiredNames<O["options"]>>
    : {};

type SubcommandUnion<
  Os extends readonly { name: string; options?: readonly any[] }[],
> =
  Extract<
    Os[number],
    { type: ApplicationCommandOptionType.Subcommand }
  > extends infer S
    ? S extends { name: string; options?: readonly any[] }
      ? { [K in S["name"]]: SubcommandValue<Extract<S, { name: K }>> }
      : never
    : never;

/** If an option provides choices, narrow to the union of their values. */
type ChoiceValue<
  O extends { choices?: readonly { value: unknown }[] } | unknown,
> = O extends { choices: readonly (infer C)[] }
  ? C extends { value: unknown }
    ? C["value"]
    : never
  : never;

/** Value type for a single option object, honoring `choices` if present. */
type ValueForOption<O extends { type: ApplicationCommandOptionType }> = [
  ChoiceValue<O>,
] extends [never]
  ? PrimitiveForType<O["type"]>
  : ChoiceValue<O>;

/** Convert an options tuple to a `{ [name]: value }` record. */
type OptionsToRecord<
  Os extends readonly { name: string; type: ApplicationCommandOptionType }[],
> = {
  [O in Os[number] as O["name"]]: ValueForOption<O>;
};

/** Names of required options in a tuple. */
type RequiredNames<Os extends readonly { name: string; required?: boolean }[]> =
  Extract<Os[number], { required: true }>["name"];

/** Make only K required; everything else optional. */
type PartialExcept<T, K extends PropertyKey> = Omit<
  Partial<T>,
  Extract<keyof T, K>
> & { [P in Extract<keyof T, K>]-?: T[P] };

/** Final input type for a command schema. */
export type CommandInput<
  S extends RESTPostAPIApplicationCommandsJSONBody & {
    options?: readonly { name: string; type: ApplicationCommandOptionType }[];
  },
  Os extends readonly {
    name: string;
    type: ApplicationCommandOptionType;
  }[] = S extends {
    options: infer T extends readonly {
      name: string;
      type: ApplicationCommandOptionType;
    }[];
  }
    ? T
    : [],
> = Os extends []
  ? {}
  : HasSubcommand<Os> extends true
    ? SubcommandUnion<Os>
    : PartialExcept<OptionsToRecord<Os>, RequiredNames<Os>>;

/* ---------------------------------------------- */
/* Example usage with your schema                  */
/* ---------------------------------------------- */

export const UserInfoCommandSchema = {
  name: "user",
  description: "Get user information",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: "username",
      description: "Discord user to get information about",
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String as const,
      name: "window",
      description: "Time window constraint for the query",
      required: false,
      choices: [
        { name: "This Month", value: "this_month" },
        { name: "This Week", value: "this_week" },
        { name: "This Year", value: "this_year" },
        { name: "All Time", value: "all_time" },
      ],
    },
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

type UserInfoInput = CommandInput<typeof UserInfoCommandSchema>;

// ✅ IntelliSense:
//    - username: required, type string (user ID)
//    - window?: 'this_month' | 'this_week' | 'this_year' | 'all_time'

const ok: UserInfoInput = {
  username: "123456789012345678",
  window: "this_week",
};

const alsoOk: UserInfoInput = {
  username: "123456789012345678",
};

// @ts-expect-error — 'last_30_days' not in choices
const bad: UserInfoInput = { username: "123", window: "last_30_days" };

function testUserInfo(data: UserInfoInput) {
  const window = data.window;
  const username = data.username;
}

/**
 * RANKING COMMAND
 */

export const timeWindowOption = {
  type: ApplicationCommandOptionType.String as const,
  name: "window",
  description: "Time window constraint for the query",
  required: false,
  choices: [
    { name: "This Month", value: "this_month" },
    { name: "This Week", value: "this_week" },
    { name: "This Year", value: "this_year" },
    { name: "All Time", value: "all_time" },
  ],
} as const;

export const RankingCommandSchema = {
  name: "ranking",
  description: "Get ranking information",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leet",
      description: "Show leet message rankings",
      options: [
        {
          type: ApplicationCommandOptionType.String as const,
          name: "window",
          description: "Time window constraint for the query",
          required: false,
          choices: [
            { name: "This Month", value: "this_month" },
            { name: "This Week", value: "this_week" },
            { name: "This Year", value: "this_year" },
            { name: "All Time", value: "all_time" },
          ],
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leeb",
      description: "Show leeb message rankings",
      options: [
        {
          type: ApplicationCommandOptionType.String as const,
          name: "window",
          description: "Time window constraint for the query",
          required: false,
          choices: [
            { name: "This Month", value: "this_month" },
            { name: "This Week", value: "this_week" },
            { name: "This Year", value: "this_year" },
            { name: "All Time", value: "all_time" },
          ],
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "failed_leet",
      description: "Show failed leet message rankings",
      options: [
        {
          type: ApplicationCommandOptionType.String as const,
          name: "window",
          description: "Time window constraint for the query",
          required: false,
          choices: [
            { name: "This Month", value: "this_month" },
            { name: "This Week", value: "this_week" },
            { name: "This Year", value: "this_year" },
            { name: "All Time", value: "all_time" },
          ],
        },
      ],
    },
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

type RankingInput = CommandInput<typeof RankingCommandSchema>;

const testRanking01: RankingInput = {
  leeb: {
    window: "this_week",
  },
};

function testRanking(data: RankingInput) {
  if ("leet" in data) {
    const window = data.leet.window;
  }
  if ("leeb" in data) {
    const window = data.leeb.window;
  }
  if ("failed_leet" in data) {
    const window = data.failed_leet.window;
  }
}
