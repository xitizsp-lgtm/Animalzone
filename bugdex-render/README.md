# BugDex

## Run it on your computer
1. Install Node.js 18 or newer.
2. In this folder run: `npm install`
3. Set your Claude API key, then start:
   - Mac/Linux: `ANTHROPIC_API_KEY=sk-ant-... npm start`
   - Windows PowerShell: `$env:ANTHROPIC_API_KEY="sk-ant-..."; npm start`
4. Open http://localhost:3000

## Put it on Render (so you can use it on your phone)
1. Put this folder in a GitHub repository.
2. On render.com: New > Web Service > pick the repo.
3. Build command: `npm install`   Start command: `npm start`
4. Under Environment, add `ANTHROPIC_API_KEY` (your key). Optional: `DAILY_LIMIT` (default 40 requests per visitor per day) and `MODEL`.
5. Open the https address Render gives you on your phone. The camera only works on https.
   Tip: in your phone browser use Share > Add to Home Screen.

## What works here
Scanning, stats, market, the arena, battles against the computer, selling, plants.
Your collection and coins are saved in that phone's browser only.

## What does not work here
Accounts, friends and live matches. Those use claude.ai features and need your own login system,
a database and a WebSocket server. Ask for them as a next step.

## Cost
Every scan and market search is one Claude API call billed to your key. Lower `DAILY_LIMIT` to cap spending.
Render's free plan sleeps when idle, so the first load can take about a minute.
