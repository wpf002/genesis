#!/usr/bin/env bash
# Genesis — infrastructure bootstrap
#
# SUPERSEDED. This is the original one-shot scaffold, kept as the historical
# record referenced by ROADMAP.md Phase 0. It has already been run; the tree it
# produced is this repository. Do not run it again — it aborts if ./genesis
# exists, and re-running it into a fresh directory produces a tree that does NOT
# pass the Phase 0 exit gate.
#
# Deviations made while getting `pnpm install && pnpm build && pnpm test` green,
# all deliberate:
#
#   1. Every package needed at least one source file — `tsc` errors with
#      "No inputs were found" on an empty src/. Minimal stubs added.
#   2. `vitest run` exits 1 when it finds no test files. Test scripts now pass
#      --passWithNoTests; kernel, params and api carry real smoke tests.
#   3. determinism-check.ts / gate-check.ts did not exist. Added as declared
#      no-ops with phase tripwires — see docs/decisions/0001-phase-0-stubs.md.
#   4. packages/schema build wraps `prisma generate` with a placeholder
#      DATABASE_URL so a clean clone builds with no .env present.
#   5. apps/api is now ESM. The "do NOT add type: module" note below was honoured
#      through Phase 0 and overturned in Phase 1 when the app began importing the
#      kernel — see docs/decisions/0003-api-is-esm.md.
#   6. apps/web gained the minimum Next.js App Router files (layout, page,
#      globals.css, next.config.mjs, postcss, tailwind config) so `next build` runs.
#   7. `next lint` replaced with `eslint src` against a root ESLint 9 flat config
#      (eslint.config.mjs), which also carries the kernel determinism lint rules
#      from Phase 1. eslint-config-next 14 pins ESLint 8 and conflicts with it.
#   8. apps/calibrate's test/lint/typecheck scripts renamed to py:* so that
#      `pnpm test` does not resolve PyMC. Python runs in its own CI job.
#
# Run from the directory where you want ./genesis created.
set -euo pipefail

ROOT="genesis"
if [ -d "$ROOT" ]; then echo "Directory $ROOT already exists. Aborting."; exit 1; fi

echo "==> Creating Genesis monorepo at ./$ROOT"
mkdir -p "$ROOT"
cd "$ROOT"

# ---------------------------------------------------------------------------
# Folder structure
# ---------------------------------------------------------------------------
mkdir -p apps/web/src/{app,components,lib}
mkdir -p apps/api/src/{routes,services,lib}
mkdir -p apps/calibrate/src/genesis_calibrate/{identifiability,inference,datasets}
mkdir -p packages/kernel/src/{rng,ledger,tick,state}
mkdir -p packages/params/src/{registry,provenance}
mkdir -p packages/models/src/{rigor,sandbox}
mkdir -p packages/replay/src
mkdir -p packages/schema/{prisma,src}
mkdir -p packages/shared/src
mkdir -p data/{raw,processed,calibration}
mkdir -p docs/{model-cards,decisions}
mkdir -p .github/workflows

# ---------------------------------------------------------------------------
# Root config
# ---------------------------------------------------------------------------
cat > package.json <<'EOF'
{
  "name": "genesis",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20.11.0" },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "determinism": "turbo run determinism --filter=@genesis/kernel",
    "gate": "turbo run gate --filter=@genesis/params",
    "db:generate": "pnpm --filter @genesis/schema prisma generate",
    "db:migrate": "pnpm --filter @genesis/schema prisma migrate dev",
    "db:studio": "pnpm --filter @genesis/schema prisma studio"
  },
  "devDependencies": {
    "turbo": "^2.1.3",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3",
    "@types/node": "^22.7.5",
    "eslint": "^9.12.0",
    "prettier": "^3.3.3"
  }
}
EOF

cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "determinism": { "dependsOn": ["^build"], "cache": false },
    "gate": { "dependsOn": ["^build"], "cache": false }
  }
}
EOF

cat > tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
EOF

cat > .gitignore <<'EOF'
node_modules/
dist/
.next/
.turbo/
coverage/
*.tsbuildinfo
.env
.env.*
!.env.example
.venv/
__pycache__/
*.pyc
.pytest_cache/
.ruff_cache/
data/raw/*
data/processed/*
!data/**/.gitkeep
runs/
*.db
*.sqlite
.DS_Store
EOF

cat > .env.example <<'EOF'
# --- Database ---
DATABASE_URL="postgresql://genesis:genesis@localhost:5432/genesis?schema=public"

# --- API ---
API_PORT=4300
API_HOST=0.0.0.0
NODE_ENV=development

# --- Calibration service (Python) ---
CALIBRATE_URL="http://localhost:8300"
CALIBRATE_PORT=8300

# --- Web ---
NEXT_PUBLIC_API_URL="http://localhost:4300"

# --- Simulation ---
# STRICT refuses to emit any output whose dependency path touches an
# INVENTED parameter. Never set to false for Rigor-mode runs.
GENESIS_PROVENANCE_STRICT=true
GENESIS_DEFAULT_SEED=20260806
EOF

cat > .prettierrc <<'EOF'
{ "semi": true, "singleQuote": true, "printWidth": 90, "trailingComma": "all" }
EOF

# ---------------------------------------------------------------------------
# packages/kernel — deterministic simulation core, zero runtime deps
# ---------------------------------------------------------------------------
cat > packages/kernel/package.json <<'EOF'
{
  "name": "@genesis/kernel",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "determinism": "node dist/bin/determinism-check.js"
  },
  "dependencies": {},
  "devDependencies": { "typescript": "^5.6.3", "vitest": "^2.1.3" }
}
EOF

cat > packages/kernel/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
EOF

# ---------------------------------------------------------------------------
# packages/params — parameter registry + provenance gate
# ---------------------------------------------------------------------------
cat > packages/params/package.json <<'EOF'
{
  "name": "@genesis/params",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "gate": "node dist/bin/gate-check.js"
  },
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "typescript": "^5.6.3", "vitest": "^2.1.3" }
}
EOF
cp packages/kernel/tsconfig.json packages/params/tsconfig.json

# ---------------------------------------------------------------------------
# packages/models, replay, shared
# ---------------------------------------------------------------------------
for p in models replay shared; do
cat > packages/$p/package.json <<EOF
{
  "name": "@genesis/$p",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@genesis/kernel": "workspace:*",
    "@genesis/params": "workspace:*"
  },
  "devDependencies": { "typescript": "^5.6.3", "vitest": "^2.1.3" }
}
EOF
cp packages/kernel/tsconfig.json packages/$p/tsconfig.json
done

# ---------------------------------------------------------------------------
# packages/schema — Prisma
# ---------------------------------------------------------------------------
cat > packages/schema/package.json <<'EOF'
{
  "name": "@genesis/schema",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "prisma generate && tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": { "@prisma/client": "^5.20.0" },
  "devDependencies": { "prisma": "^5.20.0", "typescript": "^5.6.3", "vitest": "^2.1.3" }
}
EOF
cp packages/kernel/tsconfig.json packages/schema/tsconfig.json

# (schema.prisma is authored in packages/schema/prisma/schema.prisma — see repo)

# ---------------------------------------------------------------------------
# apps/api — Fastify
# ---------------------------------------------------------------------------
cat > apps/api/package.json <<'EOF'
{
  "name": "@genesis/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@genesis/kernel": "workspace:*",
    "@genesis/models": "workspace:*",
    "@genesis/params": "workspace:*",
    "@genesis/replay": "workspace:*",
    "@genesis/schema": "workspace:*",
    "@genesis/shared": "workspace:*",
    "fastify": "^4.28.1",
    "@fastify/cors": "^9.0.1",
    "zod": "^3.23.8"
  },
  "devDependencies": { "tsx": "^4.19.1", "typescript": "^5.6.3", "vitest": "^2.1.3" }
}
EOF
cp packages/kernel/tsconfig.json apps/api/tsconfig.json

# NOTE: do NOT add "type": "module" to apps/api — same constraint as Crossbar.

# ---------------------------------------------------------------------------
# apps/web — Next.js
# ---------------------------------------------------------------------------
cat > apps/web/package.json <<'EOF'
{
  "name": "@genesis/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev -p 3300",
    "start": "next start -p 3300",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@genesis/shared": "workspace:*",
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.6.3",
    "tailwindcss": "^3.4.13",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20"
  }
}
EOF

cat > apps/web/tsconfig.json <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "preserve",
    "noEmit": true,
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# ---------------------------------------------------------------------------
# apps/calibrate — Python FastAPI (uv-managed), mirrors Prophet's setup
# ---------------------------------------------------------------------------
cat > apps/calibrate/pyproject.toml <<'EOF'
[project]
name = "genesis-calibrate"
version = "0.0.0"
description = "Identifiability analysis and Bayesian calibration for Genesis"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.31.0",
    "pydantic>=2.9.0",
    "numpy>=2.1.0",
    "scipy>=1.14.0",
    "polars>=1.9.0",
    "arviz>=0.20.0",
    "pymc>=5.17.0",
    "SALib>=1.5.1",
    "httpx>=0.27.0",
]

[project.optional-dependencies]
dev = ["pytest>=8.3.0", "ruff>=0.6.9", "mypy>=1.11.0"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 90
target-version = "py311"
EOF

cat > apps/calibrate/package.json <<'EOF'
{
  "name": "@genesis/calibrate",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "uv run uvicorn genesis_calibrate.main:app --reload --port 8300",
    "build": "echo 'python service — no build step'",
    "test": "uv run pytest",
    "typecheck": "uv run mypy src",
    "lint": "uv run ruff check src"
  }
}
EOF

touch apps/calibrate/src/genesis_calibrate/__init__.py
touch data/raw/.gitkeep data/processed/.gitkeep data/calibration/.gitkeep
touch docs/model-cards/.gitkeep docs/decisions/.gitkeep

# ---------------------------------------------------------------------------
# CI — determinism and provenance gate run on every push
# ---------------------------------------------------------------------------
cat > .github/workflows/ci.yml <<'EOF'
name: CI
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
      - name: Determinism check (1000 seeded replays must byte-match)
        run: pnpm determinism
      - name: Provenance gate check
        run: pnpm gate
EOF

echo ""
echo "==> Structure created."
echo "==> Next: pnpm install && cp .env.example .env"
