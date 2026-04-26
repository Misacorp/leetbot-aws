# Refactoring

- Extract repeated patterns at the right abstraction level.
- Prefer extracting the real repeated workflow over extracting only a tiny helper.
- If an inline async orchestration pattern is correct but hard to read, extract it into a shared util.
- Once a stronger abstraction exists, remove smaller helpers that no longer improve clarity.
- Reusable infrastructure patterns should usually become shared constructs.
