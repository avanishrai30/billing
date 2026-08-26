# AIAVRO Skill Environment

Read-only environment verification performed for AIAVRO design and engineering skill references. No application source code, backend files, tests, package manifests, git history, or deployment configuration were changed.

## Installed References

| Reference | Repository | Status | Location |
|---|---|---|---|
| Impeccable | https://github.com/pbakaus/impeccable | Already installed and discoverable | `.agents/skills/impeccable` |
| Taste Skill | https://github.com/Leonxlnx/taste-skill | Already installed and discoverable | `.agents/skills/design-taste-frontend` |
| Emil Kowalski Skills | https://github.com/emilkowalski/skills | Already installed and discoverable | `.agents/skills/*` animation/design skills |
| Karpathy Engineering Skills | Unresolved: multiple similarly named public repositories | Failed / blocked by repository ambiguity | Not installed / not discoverable |

## Design Skills

Impeccable:
Available as `impeccable` in the project-local Codex skill directory. It provides Operate-mode product UX guidance, layout critique, information hierarchy, accessibility review, responsive evaluation, anti-pattern detection, and product design methodology. The installed skill frontmatter reports version `4.1.1`.

Taste:
Available as `design-taste-frontend` in the project-local Codex skill directory. It provides frontend design language guidance, visual variance controls, density and motion dials, redesign audit discipline, and anti-slop frontend direction. The expected skill name `design-taste-frontend` is present.

Emil:
Animation and design engineering skills are available in the project-local Codex skill directory. Verified discoverable skills include `emil-design-eng`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `animation-vocabulary`, `animate`, `apple-design`, `pick-ui-library`, `prototype`, and `ask-sonner`.

## Engineering Skills

Karpathy:
Not installed. The exact canonical repository requested as `andrej-karpathy-skills` could not be uniquely verified. Public checks found multiple similarly named repositories and packages, including:

- `https://github.com/duolahypercho/andrej-karpathy-skills`
- `https://github.com/guanbear/andrej-karpathy-skills-for-codex`
- `https://github.com/LearnPrompt/andrej-karpathy-skills`
- `https://github.com/nguyenphutrong/andrej-karpathy-skills-codex`

Because the prompt required stopping if the exact repository location/name could not be verified, no Karpathy skill was installed.

## Conflicts

No duplicate skill names were detected across the checked skill roots:

- Project-local: `.agents/skills`
- Global: `/Users/avanish/.agents/skills`
- Codex system: `/Users/avanish/.codex/skills/.system`

No conflicting duplicate versions of the required installed design or motion skills were found.

## Installation Actions

No installation actions were performed.

- Impeccable was already installed and discoverable.
- Taste Skill was already installed and discoverable.
- Emil Kowalski motion/design skills were already installed and discoverable.
- Karpathy Engineering Skills were not installed because the canonical repository identity is ambiguous.

## Verification

Read-only verification completed with:

- Local skill directory scan for `SKILL.md` files.
- Frontmatter discovery scan for installed skill names.
- Duplicate-name detection across project-local, global, and Codex system skill roots.
- Read-only GitHub repository existence checks for the established references.
- Public repository documentation review for official installation methods.

Discovery result:

- `impeccable`: discoverable.
- `design-taste-frontend`: discoverable.
- `emil-design-eng`: discoverable.
- `review-animations`: discoverable.
- `improve-animations`: discoverable.
- `find-animation-opportunities`: discoverable.
- `animation-vocabulary`: discoverable.
- Karpathy engineering skill: not discoverable because it was not installed.

Final status:

1. Impeccable - ALREADY INSTALLED
2. Taste Skill - ALREADY INSTALLED
3. Emil Skills - ALREADY INSTALLED
4. Karpathy Skills - FAILED
