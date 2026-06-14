# Areti AI Agent

An autonomous AI agent that learns, reasons, and assists across 12+ languages.

## Features

- **Autonomous Mode** — Learns and operates without manual training
- **Multilingual** — Supports 12+ languages with auto-detection
- **System Optimization** — Monitors and optimizes your PC in real-time
- **Code Learning** — Learns programming patterns and best practices
- **Web Search** — Searches the web for answers it doesn't have locally
- **Reasoning Engine** — Shows its thinking process step by step
- **Knowledge Base** — Continuously grows from conversations and web data

## Supported Languages

Greek, English, French, German, Spanish, Italian, Portuguese, Turkish, Arabic, Chinese, Japanese, Russian

## Quick Start

```bash
git clone https://github.com/kouskourasd-creator/areti-ai-agent.git
cd areti-ai-agent
npm install
npm run dev
```

Open `http://localhost:5171` in your browser.

## Build for Desktop (Windows EXE)

```bash
npm run electron:build
```

The EXE installer will be created in the `release/` folder.

## Build for Android (APK)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init Areti com.areti.app
npx cap add android
npm run build
npx cap sync
npx cap open android
```

## Build for Web (PWA)

```bash
npm run build
npx serve dist
```

## Tech Stack

- React 19
- TypeScript 5.6
- Vite 6
- Electron (for desktop builds)
- Capacitor (for mobile builds)

## Creator

**Kouskouras D.**
Email: kouskourasd@gmail.com

## License

MIT License. See [LICENSE](LICENSE) for details.
