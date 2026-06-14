# Areti AI Agent

A real AI agent powered by Gemini (free). Talks, reasons, and helps in 12+ languages.

## Quick Start

```bash
git clone https://github.com/kouskourasd-creator/areti-ai-agent.git
cd areti-ai-agent
npm install
npm run build
npm run server
```

Open **http://localhost:3000** in your browser.

### Get your free API key (no credit card):
1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key
4. In Areti, click the gear icon and paste it

## Development Mode

Run the server and Vite dev server in **two separate terminals**:

**Terminal 1:**
```bash
npm run server
```

**Terminal 2:**
```bash
npm run dev
```

Open **http://localhost:5171** (Vite proxies API calls to the server).

## Build for Desktop (Windows EXE)

```cmd
build-windows.bat
```

Or manually:
```bash
npm install electron electron-builder --save-dev
npm run build
npx electron-builder --win
```

## Tech Stack

- React 19 + TypeScript + Vite
- Express (server)
- Google Gemini API (free tier)
- Electron (desktop builds)

## Creator

**Kouskouras D.** — kouskourasd@gmail.com

## License

MIT License.
