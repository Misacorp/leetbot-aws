# Naming

- Prefer descriptive names over short or clever ones.
- For shared infrastructure constructs, choose names that describe what the construct actually does, even if the name is long.
- If a naming decision is uncertain, propose alternatives and explain the recommendation.
- Reserve `*Handler` names for AWS-facing entrypoints and their caller-shape parsing helpers.
- Prefer `*Service` or service-domain verbs for reusable business logic that should be callable from multiple handlers.
- Inside a handler directory, prefer filenames that describe the handler step directly, such as `parseRequest`, `validateRequest`, or `createServiceInput`.
