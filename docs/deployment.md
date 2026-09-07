# Deployment

MathQuest can be deployed as a static site since it uses no runtime dependencies,
no server-side code, and no external API calls (all assets are client-side).

## Static Deployment Options

### GitHub Pages

1. Push this repository to GitHub
2. Go to repository Settings → Pages
3. Source: `main` branch / `/ (root)`
4. The site will be published at `https://<username>.github.io/mathquest-starter/` (or your custom domain)

### Netlify

1. Drag-and-drop the project folder to Netlify Drag & Drop
2. Or connect your GitHub repo to Netlify
3. Publish — no build steps required (pure HTML/CSS/JS)

### Vercel

1. Import the repository via Vercel
2. Framework: None (other)
3. Root Directory: ./
4. Deploy

## Local Hosting (Development)

```bash
# Install dependencies
npm install

# Start development server
npm run serve

# Open http://localhost:8080
```

The `python3 -m http.server 8080` method also works if `npm run serve` is not configured.

## Build / Distribution

MathQuest has no build step. The distribution artifacts are:

- `index.html` — HTML shell
- `styles.css` — all styles
- `js/` — all source code
- `screenshots/` — visual documentation

No minification, no bundling, no transpilation required.
All modern browsers support the vanilla ES modules and Canvas 2D API used.

## Domain / Custom URL

If using GitHub Pages:
1. In the repo, create a `CNAME` file with your custom domain
2. Configure DNS to point to GitHub Pages
3. Wait for propagation (typically a few minutes)

## No Backend Required

MathQuest does not require:
- Server deployment
- Database
- API keys at runtime
- Node.js on the host (only needed for development)
- Any external services

The game runs entirely in the browser with client-side only resources.

## Access After Deployment

Once deployed, share the URL:

- Students can play by visiting the URL
- Teachers can direct the class to the game
- No login, no account creation required
- Mute button available in-game
- Works on any device with a browser and keyboard

## Rollback

Since there's no database or persistent state, rolling back is simply:
1. Deploy the previous version of the files
2. Or revert the GitHub Pages source branch to a prior commit