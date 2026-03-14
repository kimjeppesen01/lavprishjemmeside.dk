# Lavprishjemmeside Local Mirror

> Reference-only: local CMS mirror context. The external sprint may edit code in this mirror, but execution authority remains the root handoff pack.

This folder is the canonical local mirror of the GitHub-synced Lavprishjemmeside CMS codebase.

Current deployment contract:
- Bolt.new changes must sync into GitHub first.
- This mirror is the local inspection and patch surface before SSH rollout to cPanel.
- The live deployment path is SSH-first, not GitHub Actions.

Operational notes:
- The old GitHub Actions deploy workflow was archived under `.github/workflow-archive/`.
- `dist/.htaccess` remains a generated deployment artifact concern and should not drive source-of-truth rollout decisions.
- Use `npm run lavpris:mirror-pull` and `npm run lavpris:sync-status` from the Agent Enterprise root to keep this mirror aligned.
