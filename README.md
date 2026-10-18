# React + Vite

## Data Source

11e Force Disposition Matrix: https://gdmissions.app/11th/matrix

### 11e map assets

The 2026-10-18 map refresh uses the latest supplied Warhammer 40,000 Event
Companion PDF. It updates 27 layouts and both their clean-board and annotated
reference images; the other 18 layouts are unchanged. Terrain remains centrally
symmetric, including the existing repair to map 01. Objectives and deployment
boundaries follow the revised PDF and are not symmetrized.
Both image URL variants carry this revision to avoid stale browser caches.

The updated map IDs are 02, 03, 07, 08, 09, 10, 12, 14, 16, 17, 18, 19, 20, 22,
24, 26, 31, 32, 34, 35, 36, 37, 38, 39, 41, 44, and 45.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
