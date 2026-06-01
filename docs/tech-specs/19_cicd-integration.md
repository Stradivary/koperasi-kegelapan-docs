# 19. CI/CD Integration

This section documents the continuous integration and deployment pipeline for the Koperasi Kegelapan project.

---

## Pipeline Overview

```
push / PR
   │
   ├─► ci-test.yml          ← lint (oxlint), typecheck, unit tests, e2e
   │       │
   │   (success on master)
   │       │
   └─► deploy.yml           ← build + wrangler deploy → Cloudflare Workers

push / PR / weekly schedule
   │
   └─► static-analysis.yml  ← npm audit, OWASP Dependency-Check, SonarCloud
```

---

## 1. Local Pre-commit Hooks (Husky + lint-staged)

Run once after cloning to activate hooks:

```sh
pnpm install        # triggers `prepare` which runs `husky`
```

Every `git commit` automatically runs `lint-staged`:

| File pattern                                           | Action                      |
| ------------------------------------------------------ | --------------------------- |
| `.ts` / `.tsx` / `.js` / `.jsx`                        | `oxlint --fix` then `oxfmt` |
| `.json` / `.md` / `.css` / `.html` / `.yaml` / `.toml` | `oxfmt`                     |

If lint or formatting fails, the commit is aborted. Fix the errors and re-commit.

---

## 2. GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret                  | How to obtain                                                                                              | Used by               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare Dashboard → My Profile → API Tokens → Create Token (use the "Edit Cloudflare Workers" template) | `deploy.yml`          |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → right sidebar on any page                                                           | `deploy.yml`          |
| `SONAR_TOKEN`           | SonarCloud → My Account → Security → Generate Token                                                        | `static-analysis.yml` |

`GITHUB_TOKEN` is provided automatically by GitHub - no action required.

---

## 3. SonarCloud Setup

1. Sign in at [https://sonarcloud.io](https://sonarcloud.io) with your GitHub account.
2. Click **+** → **Analyze new project** → import `stradivary/koperasi-kegelapan`.
3. Choose **GitHub Actions** as the analysis method.
4. Copy the generated token and add it as `SONAR_TOKEN` (see table above).
5. Verify the values in `sonar-project.properties`:

```properties
sonar.projectKey=stradivary_koperasi-kegelapan
sonar.organization=stradivary   # must match your SonarCloud org slug
```

Coverage is fed automatically - the `unit-test` job in `ci-test.yml` uploads `coverage/lcov.info`, which SonarCloud reads.

---

## 4. Cloudflare Workers Deployment

`deploy.yml` triggers **only after `ci-test.yml` succeeds on `master`/`main`** (via `workflow_run`). It can also be triggered manually from the Actions tab via `workflow_dispatch`.

Required API token permissions when creating the token in Cloudflare:

- **Account** → Workers Scripts: Edit
- **Account** → Workers KV Storage: Edit (if using KV)
- **Account** → D1: Edit (if using D1)

---

## 5. OWASP Dependency-Check

Runs as part of `static-analysis.yml`. The first run downloads the NVD vulnerability database (~500 MB); subsequent runs use a cached copy. Reports are uploaded as workflow artifacts and retained for 30 days.

To fail the build on OWASP findings, add `--failBuildOnCVSS 7` to the `args` block in `static-analysis.yml`.

The fast `pnpm audit --audit-level=high` step runs on every PR for immediate feedback without the download overhead.

---

## 6. Workflow Summary

| Workflow              | Trigger                                      | Jobs                                          |
| --------------------- | -------------------------------------------- | --------------------------------------------- |
| `ci-test.yml`         | push, PR → `master`/`main`/`develop`         | lint, typecheck, unit-test, e2e-test          |
| `deploy.yml`          | `ci-test` success on `master`/`main`; manual | deploy (Pages + Workers)                      |
| `static-analysis.yml` | push/PR → `master`/`main`; weekly Monday     | npm-audit, owasp-dependency-check, sonarcloud |

---

## 7. Available Scripts

| Script               | Command                                                |
| -------------------- | ------------------------------------------------------ |
| `pnpm lint`          | `oxlint src/`                                          |
| `pnpm lint:fix`      | `oxlint src/ --fix`                                    |
| `pnpm format`        | `oxfmt .`                                              |
| `pnpm format:check`  | `oxfmt --check .`                                      |
| `pnpm typecheck`     | `tsc --noEmit`                                         |
| `pnpm test`          | `vitest run`                                           |
| `pnpm test:coverage` | `vitest run --coverage` (outputs `coverage/lcov.info`) |
| `pnpm e2e`           | `playwright test`                                      |
| `pnpm deploy`        | `deploy:pages` + `deploy:api`                          |
| `pnpm deploy:pages`  | build + `wrangler pages deploy`                        |
| `pnpm deploy:api`    | `wrangler deploy --config wrangler.api.jsonc`          |

---

## References

- [Tech Specs §16: Infrastructure Stack](16_infrastructure-stack.md)
- [Tech Specs §11: Deployment & Maintenance](11_deployment-maintenance.md)
- [ADR-007: TanStack Start and Cloudflare Pages/KV/D1](../adr/7_tanstack-start-cloudflare-stack.md)
- [ADR-012: Cloudflare Distribution Only](../adr/12_cloudflare-distribution-only.md)
