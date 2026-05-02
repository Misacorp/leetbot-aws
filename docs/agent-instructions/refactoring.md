# Refactoring

- Extract repeated patterns at the right abstraction level.
- Prefer extracting the real repeated workflow over extracting only a tiny helper.
- If an inline async orchestration pattern is correct but hard to read, extract it into a shared util.
- Once a stronger abstraction exists, remove smaller helpers that no longer improve clarity.
- Reusable infrastructure patterns should usually become shared constructs.
- Keep a clear split between handlers and services.
- A handler should parse and validate caller-specific input, call a service with service-native arguments, and format any caller-specific response.
- A service should not know whether it was called by SNS, API Gateway, or a direct/manual invocation.

## `src/discord` structure

- Prefer keeping business workflows in feature folders such as `discordWatcher`, `interactions`, `messageEvaluator`, and other feature-specific directories.
- Use `src/discord/rest/` only for reusable Discord API operations. Keep business rules and interaction UX logic out of this area.
- Use `src/discord/stats/` for reusable derived-data logic over Discord/game data, such as rankings, counts, or other shared statistics helpers.
- Use `src/discord/utils/` only for small low-level Discord-specific helpers such as formatting or emoji/timestamp helpers.
- Move code from a feature folder into a shared `src/discord/*` area only when at least two features use it and the extracted abstraction remains cohesive.
- Avoid broad catch-all directories like `shared` or `common` under `src/discord` unless the codebase grows enough that the current split stops being clear.
