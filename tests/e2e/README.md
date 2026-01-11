# E2E Tests for Archon AI

Browser automation tests using Playwright and Puppeteer to test chat conversations.

## Prerequisites

1. Backend running at `http://localhost:8000`
2. Frontend running at `http://localhost:3000`

## Quick Start

```bash
# Install dependencies
cd tests/e2e
npm install

# Install Playwright browsers (first time only)
npm run install:browsers

# Run all tests
npm test
```

## Running Tests

### Playwright Tests

```bash
# Run all Playwright tests
npm run test:playwright

# Run with UI mode (interactive)
npm run test:playwright:ui

# Run with visible browser
npm run test:playwright:headed

# Debug mode (step through tests)
npm run test:playwright:debug
```

### Puppeteer Tests

```bash
# Run all Puppeteer tests
npm run test:puppeteer

# Run with visible browser
npm run test:puppeteer:headed

# Run slowly (good for debugging)
npm run test:puppeteer:slow
```

## Test Coverage

### User Authentication
- User registration
- User login

### WebSocket Connection
- Establishing connection
- Receiving welcome message
- Reconnection handling

### Chat Conversations
- Sending messages
- Receiving streaming responses
- Onboarding flow (collecting user birth data)
- Multiple message exchanges
- Tool call indicators

### Error Handling
- Disconnection handling
- Network interruption recovery

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL |
| `API_URL` | `http://localhost:8000` | Backend API URL |
| `HEADLESS` | `true` | Run browser in headless mode (Puppeteer) |
| `SLOW_MO` | `0` | Slow down operations by ms (Puppeteer) |
| `CI` | - | Set in CI environments |

## Test Structure

```
tests/e2e/
├── playwright.config.ts     # Playwright configuration
├── playwright/
│   └── conversation.spec.ts # Playwright test specs
├── puppeteer/
│   └── conversation.test.js # Puppeteer test specs
├── test-results/            # Screenshots and artifacts
└── package.json
```

## Writing New Tests

### Playwright

```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/chat');
  await expect(page.locator('[data-role="assistant"]')).toBeVisible();
});
```

### Puppeteer

```javascript
async function testSomething(page) {
  await page.goto('http://localhost:3000/chat');
  await page.waitForSelector('[data-role="assistant"]');
}
```

## Data Attributes for Testing

The frontend uses these data attributes for test selectors:

- `data-role="user"` - User messages
- `data-role="assistant"` - Assistant messages
- `data-streaming="true"` - Currently streaming response
- `data-typing="true"` - Typing indicator shown
- `title="Connected"` / `title="Connecting..."` - Connection status

## Troubleshooting

### Tests fail to connect

Make sure both servers are running:

```bash
# Terminal 1: Backend
cd /path/to/archon-ai
python -m uvicorn app.api.main:app --reload

# Terminal 2: Frontend
cd /path/to/archon-ai/frontend
npm run dev
```

### Timeouts

Increase timeout values in test configuration if LLM responses are slow:

```typescript
// playwright.config.ts
timeout: 120000,

// puppeteer tests
page.setDefaultTimeout(120000);
```

### Screenshots on failure

Failed tests save screenshots to `./test-results/`
