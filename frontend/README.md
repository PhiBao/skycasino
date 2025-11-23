# Frontend (React + Vite)

This folder contains the React + TypeScript frontend for the SkyCasino demo.

Quick commands:

```bash
cd frontend
npm install
npm run dev      # start dev server (HMR)
npm run build    # produce production bundle in dist/
npm run preview  # preview production build locally
```

Environment:

- The frontend uses `VITE_` prefixed environment variables (see `frontend/.env.example`).

Notes:

- For submission readiness we removed noisy console output from core UI files.
- If you plan to publish, add a small CI workflow to build and run tests on PRs.

If you want, I can add an npm script to run the frontend lint and format checks. globalIgnores(["dist"]), { files:
["**/*.{ts,tsx}"], extends: [ // Other configs... // Enable lint rules for React
reactX.configs["recommended-typescript"], // Enable lint rules for React DOM reactDom.configs.recommended, ],
languageOptions: { parserOptions: { project: ["./tsconfig.node.json", "./tsconfig.app.json"], tsconfigRootDir:
import.meta.dirname, }, // other options... }, }, ]);

```

```
