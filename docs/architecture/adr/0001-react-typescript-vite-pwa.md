# ADR 0001: React + TypeScript + Vite for PWA shell

## Status

Accepted

## Context

The project needs a mobile-first progressive web app shell with fast iteration, strict typing, and a straightforward testing story.

## Decision

Use React with strict TypeScript and Vite as the web application stack, plus `vite-plugin-pwa` for installability and application-shell service worker generation.

## Consequences

- Fast local feedback with Vite dev server
- Strong type safety across UI and shared contracts
- Minimal setup overhead compared with heavier frameworks
- PWA behavior must still be explicitly documented and tested, especially installability vs true offline feature support
