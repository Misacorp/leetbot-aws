import {
  type APIApplicationCommandInteractionDataBasicOption,
  type APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
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

// Names of subcommands from an options tuple
type SubNames<
  Os extends readonly { name: string; type: ApplicationCommandOptionType }[],
> = Extract<
  Os[number],
  { type: ApplicationCommandOptionType.Subcommand }
>["name"];

// Value for a specific subcommand
type SubOptions<
  Os extends readonly any[],
  K extends SubNames<Os>,
> = SubcommandValue<Extract<Os[number], { name: K }>>;

/** If an option provides choices, narrow to the union of their values. */
export type ChoiceValue<
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

export type CommandInputTagged<
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
> = {
  subcommand?: SubNames<Os>;
  options: HasSubcommand<Os> extends true
    ? SubNames<Os> extends infer K extends string
      ? K extends SubNames<Os>
        ? SubOptions<Os, K>
        : never
      : never
    : PartialExcept<OptionsToRecord<Os>, RequiredNames<Os>>;
};

/**
 * 🧰 Helper functions to map from Discord Webhook payloads to these types
 */
type OptionsRecord = Record<string, string | number | boolean>;

function optionsArrayToRecord(
  opts: readonly APIApplicationCommandInteractionDataBasicOption[] | undefined,
): OptionsRecord {
  const out: OptionsRecord = {};
  for (const o of opts ?? []) {
    // For entity-type options (user/channel/role/mentionable/attachment),
    // Discord sends IDs as strings in o.value; resolved objects are in interaction.data.resolved.
    // If you want resolved objects, join from interaction.data.resolved here.
    // For now, we keep IDs.
    out[o.name] = o.value;
  }
  return out;
}

/** Convert Discord webhook payload to a tagged shape that’s easy to `switch` on. */
export function normalizeChatInput<
  S extends RESTPostAPIApplicationCommandsJSONBody & {
    options?: readonly { name: string; type: ApplicationCommandOptionType }[];
  },
>(
  i: APIChatInputApplicationCommandInteraction,
  _schema: S,
): { command: string } & CommandInputTagged<S> {
  const top = i.data.options?.[0];

  if (!top) {
    return {
      command: i.data.name,
      options: {} as CommandInputTagged<S>["options"],
    } as { command: string } & CommandInputTagged<S>;
  }

  if (top.type === ApplicationCommandOptionType.Subcommand) {
    return {
      command: i.data.name,
      subcommand: top.name as CommandInputTagged<S>["subcommand"],
      options: optionsArrayToRecord(
        top.options,
      ) as CommandInputTagged<S>["options"],
    } as { command: string } & CommandInputTagged<S>;
  }

  if (top.type === ApplicationCommandOptionType.SubcommandGroup) {
    const sub = top.options?.[0];
    return {
      command: i.data.name,
      subcommand: sub?.name as CommandInputTagged<S>["subcommand"],
      options: optionsArrayToRecord(
        sub?.options,
      ) as CommandInputTagged<S>["options"],
    } as { command: string } & CommandInputTagged<S>;
  }

  return {
    command: i.data.name,
    options: optionsArrayToRecord(
      i.data.options as any,
    ) as CommandInputTagged<S>["options"],
  } as { command: string } & CommandInputTagged<S>;
}
