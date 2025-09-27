import {
  type APIApplicationCommandInteractionDataOption,
  type APIApplicationCommandInteractionDataBasicOption,
  type RESTPostAPIApplicationCommandsJSONBody,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";

// === TYPE UTILITIES FOR SCHEMA-DRIVEN PARSING ===

// Extract command name from schema
type ExtractCommandName<T extends RESTPostAPIApplicationCommandsJSONBody> =
  T["name"];

// Extract option value types based on Discord API option types
type ExtractOptionValueType<T extends number> =
  T extends ApplicationCommandOptionType.String
    ? string
    : T extends ApplicationCommandOptionType.Integer
      ? number
      : T extends ApplicationCommandOptionType.Boolean
        ? boolean
        : T extends ApplicationCommandOptionType.User
          ? string
          : T extends ApplicationCommandOptionType.Channel
            ? string
            : T extends ApplicationCommandOptionType.Role
              ? string
              : T extends ApplicationCommandOptionType.Mentionable
                ? string
                : T extends ApplicationCommandOptionType.Number
                  ? number
                  : T extends ApplicationCommandOptionType.Attachment
                    ? string
                    : string | number | boolean;

// Extract choices if they exist, otherwise use the base type
type ExtractChoiceValues<T> = T extends {
  choices: readonly { value: infer V }[];
}
  ? V
  : T extends { type: infer TType extends number }
    ? ExtractOptionValueType<TType>
    : never;

// Parse a single option definition into its runtime type
type ParseOption<T> = T extends {
  name: infer Name extends string;
  required?: infer Required;
}
  ? Required extends true
    ? { [K in Name]: ExtractChoiceValues<T> }
    : { [K in Name]?: ExtractChoiceValues<T> }
  : never;

// Parse all options in an array
type ParseOptions<T extends readonly unknown[]> = T extends readonly []
  ? {}
  : T extends readonly [infer First, ...infer Rest]
    ? ParseOption<First> & ParseOptions<Rest>
    : {};

// Simpler approach: Extract subcommand names and create base type
type ExtractSubcommandNames<T extends readonly unknown[]> =
  T extends readonly (infer U)[]
    ? U extends {
        name: infer Name;
        type: ApplicationCommandOptionType.Subcommand;
      }
      ? Name
      : never
    : never;

// Create base subcommand type with common options from any subcommand
type ExtractSubcommandOptions<T extends readonly unknown[]> =
  T extends readonly (infer U)[]
    ? U extends {
        type: ApplicationCommandOptionType.Subcommand;
        options: infer Options extends readonly unknown[];
      }
      ? ParseOptions<Options>
      : {}
    : {};

// Simple discriminated union for subcommands
type ParseSubcommands<T extends readonly unknown[]> = {
  subcommand: ExtractSubcommandNames<T>;
} & ExtractSubcommandOptions<T>;

// Main schema parser - handles both regular options and subcommands
export type ParsedFromSchema<T extends RESTPostAPIApplicationCommandsJSONBody> =
  T["options"] extends readonly unknown[]
    ? T["options"][number] extends {
        type: ApplicationCommandOptionType.Subcommand;
      }
      ? { subcommand: ExtractSubcommandNames<T["options"]> } & {
          options: ExtractSubcommandOptions<T["options"]>;
        } // Has subcommands
      : { options: ParseOptions<T["options"]> } // Regular options only
    : { options: {} };

// === RUNTIME PARSING FUNCTIONS ===

export interface ParsedCommandResult<
  T extends RESTPostAPIApplicationCommandsJSONBody,
> {
  command: ExtractCommandName<T>;
  data: ParsedFromSchema<T>;
}

// Generic schema-driven parser
export function parseFromSchema<
  T extends RESTPostAPIApplicationCommandsJSONBody,
>(
  schema: T,
  options: APIApplicationCommandInteractionDataOption[] = [],
): ParsedFromSchema<T> | null {
  if (!schema.options) {
    return {} as ParsedFromSchema<T>;
  }

  // Check if this command has subcommands
  const hasSubcommands = schema.options.some(
    (opt) =>
      "type" in opt && opt.type === ApplicationCommandOptionType.Subcommand,
  );

  if (hasSubcommands) {
    return parseSubcommandFromSchema(schema, options) as ParsedFromSchema<T>;
  } else {
    return parseDirectOptionsFromSchema(schema, options) as ParsedFromSchema<T>;
  }
}

function parseSubcommandFromSchema<
  T extends RESTPostAPIApplicationCommandsJSONBody,
>(schema: T, options: APIApplicationCommandInteractionDataOption[]): any {
  const subcommandOption = options.find(
    (opt) => opt.type === ApplicationCommandOptionType.Subcommand,
  );

  if (!subcommandOption) {
    return null;
  }

  const subcommand = subcommandOption.name;
  const subcommandOptions = subcommandOption.options ?? [];

  // Find the matching subcommand in schema to get its option definitions
  const subcommandSchema = schema.options?.find(
    (opt) =>
      "name" in opt &&
      opt.name === subcommand &&
      "type" in opt &&
      opt.type === ApplicationCommandOptionType.Subcommand,
  );

  const parsed: any = { subcommand, options: {} };

  // Parse the subcommand's options
  if (
    subcommandSchema &&
    "options" in subcommandSchema &&
    subcommandSchema.options
  ) {
    const valueOptions = subcommandOptions.filter(
      (o): o is APIApplicationCommandInteractionDataBasicOption => "value" in o,
    );

    for (const valueOption of valueOptions) {
      parsed.options[valueOption.name] = valueOption.value;
    }
  }

  return parsed;
}

function parseDirectOptionsFromSchema<
  T extends RESTPostAPIApplicationCommandsJSONBody,
>(schema: T, options: APIApplicationCommandInteractionDataOption[]): any {
  const parsed: any = { options: {} };

  const valueOptions = options.filter(
    (o): o is APIApplicationCommandInteractionDataBasicOption => "value" in o,
  );

  for (const valueOption of valueOptions) {
    parsed.options[valueOption.name] = valueOption.value;
  }

  return parsed;
}
