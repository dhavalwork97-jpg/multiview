# Troubleshooting common setup errors

## "Prisma schema validation ... P1012 ... datasource property `url` is no longer supported"

This means `npx prisma` resolved to **Prisma 7**, not the `5.22.0` this
project pins in `package.json`. `npx` only uses a project's pinned
version if `node_modules` already has it installed — run a prisma
command before your first `npm install`/`npm ci`, and `npx` silently
fetches whatever's newest from the registry instead, which is Prisma 7
here. Prisma 7 changed how `datasource.url` works (moved to
`prisma.config.ts` with an adapter, no longer read directly from
`schema.prisma`), which is exactly the breaking change in that error.

**Fix:**

```bash
npm install          # or npm ci — installs the pinned prisma@5.22.0 into node_modules/.bin
npm run prisma:migrate    # uses the local pinned version, not npx's registry lookup
```

More generally: prefer the `npm run prisma:*` scripts in `package.json`
over bare `npx prisma ...` commands. `npm run` scripts always resolve
binaries from the local `node_modules/.bin` first; a standalone `npx`
invocation falls back to fetching latest if the local install isn't
there yet.

## "Couldn't find any `pages` or `app` directory" (on Render)

This means Render tried to build the **Next.js app** as a generic
**Web Service** — auto-detecting Node and running `yarn install; yarn
build` directly — rather than using the `render.yaml` Blueprint.

**This project's Next.js app doesn't deploy to Render at all.** Render
is only for the three background Docker services (socket server, clip
worker, AI worker) — see `RENDER_DEPLOYMENT.md`. The app itself deploys
to **Vercel** — see `DEPLOYMENT_GUIDE.md` Stage 1.

**Fix:** delete the Render Web Service you created for the app. In
Render, use **New → Blueprint** (not **New → Web Service**) pointed at
this repo — Blueprint reads `render.yaml` and creates exactly the three
Docker-based worker services, none of which need a `pages`/`app`
directory since they're not Next.js apps. Deploy the actual app
separately via Vercel.

## "It builds locally but GitHub/Render can't find my files at all" / wrong folder structure

If you extracted a zip of this project and it created a folder like
`fgc-stream/` containing everything, make sure **the contents of that
folder** become your repo root — not the folder itself nested inside
another one. After extracting:

```bash
cd fgc-stream        # into the extracted folder
ls                    # you should see package.json right here, not one level down
git init
git add .
git commit -m "initial"
git remote add origin <your-repo-url>
git push -u origin main
```

If `ls` shows another folder instead of `package.json` directly, you've
got a double-nested extraction — move everything up one level before
initializing git, or your repo root won't have `package.json`, and
*every* platform (Vercel, Render, GitHub Actions) will fail to find
anything to build for the same underlying reason.
