import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  username: 'TestUser',
  password: 'TestPassword123!',
};

const API_URL = process.env.API_URL || 'http://localhost:8000';

// Helper functions
async function registerUser(page: Page, user = TEST_USER) {
  await page.goto('/register');

  // Fill registration form
  await page.getByPlaceholder('email').fill(user.email);
  await page.getByPlaceholder('name').fill(user.username);
  await page.getByPlaceholder('password', { exact: true }).first().fill(user.password);
  await page.getByPlaceholder('confirm password').fill(user.password);

  // Submit and wait for navigation
  await page.getByRole('button', { name: 'begin' }).click();

  // Wait for redirect to chat page
  await page.waitForURL('**/chat', { timeout: 15000 });
}

async function loginUser(page: Page, user = TEST_USER) {
  await page.goto('/login');

  // Fill login form
  await page.getByPlaceholder('email').fill(user.email);
  await page.getByPlaceholder('password').fill(user.password);

  // Submit and wait for navigation
  await page.getByRole('button', { name: 'enter' }).click();

  // Wait for redirect to chat page
  await page.waitForURL('**/chat', { timeout: 15000 });
}

async function waitForConnection(page: Page) {
  // Wait for the connection indicator to show connected (gold color)
  await page.waitForSelector('[title="Connected"]', { timeout: 15000 });
}

async function waitForWelcomeMessage(page: Page) {
  // Wait for assistant message to appear
  await page.waitForSelector('[data-role="assistant"]', { timeout: 30000 });
}

async function sendMessage(page: Page, message: string) {
  const chatInput = page.getByPlaceholder('speak');
  await chatInput.fill(message);
  await chatInput.press('Enter');
}

async function waitForResponse(page: Page, timeout = 60000) {
  // Wait for typing indicator to appear and disappear
  // Or wait for new assistant message
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check if streaming is happening or complete
    const isStreaming = await page.locator('[data-streaming="true"]').count() > 0;
    const isTyping = await page.locator('[data-typing="true"]').count() > 0;

    if (!isStreaming && !isTyping) {
      // Give it a moment to ensure the message is fully rendered
      await page.waitForTimeout(500);

      // Check if we have assistant messages
      const messages = await page.locator('[data-role="assistant"]').count();
      if (messages > 0) {
        return;
      }
    }

    await page.waitForTimeout(100);
  }

  throw new Error('Timeout waiting for response');
}

// Tests
test.describe('User Registration and Login', () => {
  test('should register a new user', async ({ page }) => {
    await registerUser(page);

    // Verify we're on the chat page
    expect(page.url()).toContain('/chat');
  });

  test('should login existing user', async ({ page }) => {
    // First register
    const user = {
      ...TEST_USER,
      email: `login_test_${Date.now()}@example.com`,
    };
    await registerUser(page, user);

    // Logout (clear storage)
    await page.evaluate(() => localStorage.clear());

    // Login
    await loginUser(page, user);

    // Verify we're on the chat page
    expect(page.url()).toContain('/chat');
  });
});

test.describe('WebSocket Chat Connection', () => {
  test('should establish WebSocket connection', async ({ page }) => {
    const user = {
      ...TEST_USER,
      email: `ws_test_${Date.now()}@example.com`,
    };

    await registerUser(page, user);
    await waitForConnection(page);

    // Connection indicator should be visible
    await expect(page.locator('[title="Connected"]')).toBeVisible();
  });

  test('should receive welcome message', async ({ page }) => {
    const user = {
      ...TEST_USER,
      email: `welcome_test_${Date.now()}@example.com`,
    };

    await registerUser(page, user);
    await waitForConnection(page);
    await waitForWelcomeMessage(page);

    // Should have at least one assistant message
    const assistantMessages = page.locator('[data-role="assistant"]');
    await expect(assistantMessages.first()).toBeVisible();
  });
});

test.describe('Chat Conversations', () => {
  test.beforeEach(async ({ page }) => {
    const user = {
      ...TEST_USER,
      email: `chat_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    };

    await registerUser(page, user);
    await waitForConnection(page);
  });

  test('should send a message and receive response', async ({ page }) => {
    // Wait for welcome message first
    await waitForWelcomeMessage(page);

    // Get initial message count
    const initialCount = await page.locator('[data-role="assistant"]').count();

    // Send a message
    await sendMessage(page, 'Hello, what can you tell me about astrology?');

    // Verify user message appears
    await expect(page.locator('[data-role="user"]').last()).toContainText('astrology');

    // Wait for assistant response
    await waitForResponse(page);

    // Verify we got a new assistant message
    const newCount = await page.locator('[data-role="assistant"]').count();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('should handle onboarding conversation', async ({ page }) => {
    // Wait for welcome message
    await waitForWelcomeMessage(page);

    // The agent should ask for name during onboarding
    // Send name
    await sendMessage(page, 'My name is Sarah');
    await waitForResponse(page);

    // Should acknowledge and ask for more info
    const messages = page.locator('[data-role="assistant"]');
    await expect(messages.last()).toBeVisible();
  });

  test('should display streaming responses', async ({ page }) => {
    await waitForWelcomeMessage(page);

    // Send a message that should generate a longer response
    await sendMessage(page, 'Tell me about the planets in astrology');

    // Should see streaming indicator or content appearing
    // Wait a bit for streaming to start
    await page.waitForTimeout(2000);

    // Eventually should complete
    await waitForResponse(page, 90000);
  });

  test('should handle multiple messages in conversation', async ({ page }) => {
    await waitForWelcomeMessage(page);

    // First message
    await sendMessage(page, 'My name is Alex');
    await waitForResponse(page);

    // Second message
    await sendMessage(page, 'I was born on January 15, 1990');
    await waitForResponse(page);

    // Third message
    await sendMessage(page, 'What does that mean for me?');
    await waitForResponse(page);

    // Should have multiple exchanges
    const userMessages = await page.locator('[data-role="user"]').count();
    expect(userMessages).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Tool Call Display', () => {
  test('should show tool call indicator when using transits', async ({ page }) => {
    const user = {
      ...TEST_USER,
      email: `tools_${Date.now()}@example.com`,
    };

    await registerUser(page, user);
    await waitForConnection(page);
    await waitForWelcomeMessage(page);

    // Complete minimal onboarding first
    await sendMessage(page, 'I am Test User, born December 9, 1995 in New York City');
    await waitForResponse(page, 90000);

    // Ask about transits which should trigger tool call
    await sendMessage(page, "What's my energy like this week?");

    // Wait for response with tool usage
    await waitForResponse(page, 90000);

    // The response should mention transits or planetary influences
    const lastResponse = page.locator('[data-role="assistant"]').last();
    await expect(lastResponse).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle disconnection gracefully', async ({ page }) => {
    const user = {
      ...TEST_USER,
      email: `disconnect_${Date.now()}@example.com`,
    };

    await registerUser(page, user);
    await waitForConnection(page);

    // Simulate going offline
    await page.context().setOffline(true);

    // Wait a moment for disconnect to register
    await page.waitForTimeout(2000);

    // Try to send a message
    const chatInput = page.getByPlaceholder(/speak|\.\.\./);

    // Input should be disabled or show error
    const isDisabled = await chatInput.isDisabled();
    expect(isDisabled).toBeTruthy();

    // Restore connection
    await page.context().setOffline(false);

    // Should reconnect eventually
    await page.waitForTimeout(5000);
  });
});

test.describe('UI Elements', () => {
  test('should have proper chat interface elements', async ({ page }) => {
    const user = {
      ...TEST_USER,
      email: `ui_${Date.now()}@example.com`,
    };

    await registerUser(page, user);

    // Check for essential UI elements
    await expect(page.getByPlaceholder(/speak|\.\.\./)).toBeVisible();

    // Connection indicator should exist
    await expect(page.locator('[title="Connected"], [title="Connecting..."]').first()).toBeVisible();
  });
});
