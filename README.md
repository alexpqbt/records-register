# Playing around with Tauri

This project is just me experimenting [Tauri](https://v2.tauri.app/) since I don't like Electron's heavy binary and slow performance because they are bundling Chromium which is just overkill for this project, and Tauri is one of those alternatives that I want to try to play around.

This is a simple CRUD project that register's a person's information for the church.

# Development

1. To download Tauri, visit [here](https://v2.tauri.app/start/).
2. Also follow Tauri's **PREREQUISITES** section from [Quickstart](https://v2.tauri.app/start/prerequisites/).

```terminal
git clone <repo URL>
pnpm install
pnpm run tauri dev
```

# Building

Run `pnpm install` and `pnpm run tauri build` and the binaries are in
`src-tauri/target/release`

# Tech Stack
- Tauri v2
- Typescript
- SQLite via `tauri-plugin-sql`
- Pico.css for styling (https://picocss.com/)

# Schema

records table
- lastname (string)
- firstname (string)
- middle (string, optional)
- dofc (date)
- created_at (date)
- is_active (boolean)

# Conclusion

Majority of my time making this project is in the web development side, which is like doing web development _(no way)_ _(also why I did this? because I can't be bothered to learn another UI framework or something right now)_
and I would rather learn an actual UI framework for software stuff but yeah I liked working with Tauri _(in this use case at least)_ and surprisingly I have less involvment with Rust _(my only involvement is setting up the SQLite and build config, which is nothing burger)_
