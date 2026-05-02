# Refactoring

- Extract repeated patterns at the right abstraction level.
- Prefer extracting the real repeated workflow over extracting only a tiny helper.
- If an inline async orchestration pattern is correct but hard to read, extract it into a shared util.
- Once a stronger abstraction exists, remove smaller helpers that no longer improve clarity.
- Reusable infrastructure patterns should usually become shared constructs.
- Keep a clear split between handlers and services.
- A handler should parse and validate caller-specific input, call a service with service-native arguments, and format any caller-specific response.
- A service should not know whether it was called by SNS, API Gateway, or a direct/manual invocation.
