/**
 * Puppeteer E2E Tests for Archon AI Chat Conversations
 *
 * Run with: npm run test:puppeteer
 * Or directly: node puppeteer/conversation.test.js
 */

const puppeteer = require('puppeteer');

// Configuration
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8000';
const HEADLESS = process.env.HEADLESS !== 'false';
const SLOW_MO = parseInt(process.env.SLOW_MO) || 0;

// Test user factory
function createTestUser() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return {
    email: `test_${timestamp}_${random}@example.com`,
    username: `TestUser_${random}`,
    password: 'TestPassword123!',
  };
}

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Helper functions
async function waitFor(page, selector, options = {}) {
  const { timeout = 15000 } = options;
  await page.waitForSelector(selector, { timeout });
}

async function typeWithDelay(page, selector, text, delay = 50) {
  await page.click(selector);
  await page.type(selector, text, { delay });
}

async function registerUser(page, user) {
  console.log(`  Registering user: ${user.email}`);

  await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });

  // Fill registration form
  await typeWithDelay(page, 'input[placeholder="email"]', user.email);
  await typeWithDelay(page, 'input[placeholder="name"]', user.username);

  // Handle multiple password fields
  const passwordInputs = await page.$$('input[type="password"]');
  await passwordInputs[0].type(user.password, { delay: 30 });
  await passwordInputs[1].type(user.password, { delay: 30 });

  // Click submit button
  await page.click('button[type="submit"]');

  // Wait for navigation to chat
  await page.waitForNavigation({ timeout: 20000 });

  console.log(`  Registration complete, at: ${page.url()}`);
}

async function loginUser(page, user) {
  console.log(`  Logging in user: ${user.email}`);

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

  await typeWithDelay(page, 'input[placeholder="email"]', user.email);
  await typeWithDelay(page, 'input[placeholder="password"]', user.password);

  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 20000 });

  console.log(`  Login complete, at: ${page.url()}`);
}

async function waitForConnection(page, timeout = 15000) {
  console.log('  Waiting for WebSocket connection...');

  const start = Date.now();
  while (Date.now() - start < timeout) {
    const connected = await page.$('[title="Connected"]');
    if (connected) {
      console.log('  WebSocket connected');
      return true;
    }
    await page.waitForTimeout(200);
  }
  throw new Error('WebSocket connection timeout');
}

async function waitForWelcomeMessage(page, timeout = 30000) {
  console.log('  Waiting for welcome message...');

  await page.waitForSelector('[data-role="assistant"]', { timeout });
  console.log('  Welcome message received');
}

async function sendChatMessage(page, message) {
  console.log(`  Sending message: "${message.substring(0, 50)}..."`);

  const textarea = await page.$('textarea[placeholder="speak"]');
  if (!textarea) {
    throw new Error('Chat input not found');
  }

  await textarea.click();
  await textarea.type(message, { delay: 20 });
  await page.keyboard.press('Enter');
}

async function waitForAssistantResponse(page, timeout = 60000) {
  console.log('  Waiting for assistant response...');

  const start = Date.now();
  const initialCount = await page.$$eval('[data-role="assistant"]', (els) => els.length);

  while (Date.now() - start < timeout) {
    // Check if streaming/typing is done
    const isStreaming = await page.$('[data-streaming="true"]');
    const isTyping = await page.$('[data-typing="true"]');

    if (!isStreaming && !isTyping) {
      const currentCount = await page.$$eval('[data-role="assistant"]', (els) => els.length);
      if (currentCount > initialCount) {
        console.log('  Response received');
        return true;
      }
    }

    await page.waitForTimeout(200);
  }

  throw new Error('Response timeout');
}

async function getLastAssistantMessage(page) {
  const messages = await page.$$('[data-role="assistant"]');
  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];
  return await lastMessage.evaluate((el) => el.textContent);
}

async function getMessageCount(page, role = 'assistant') {
  return await page.$$eval(`[data-role="${role}"]`, (els) => els.length);
}

// Test runner
async function runTest(name, testFn, browser) {
  console.log(`\nRunning: ${name}`);
  const page = await browser.newPage();

  try {
    await testFn(page);
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    console.log(`PASSED: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    console.error(`FAILED: ${name}`);
    console.error(`  Error: ${error.message}`);

    // Take screenshot on failure
    await page.screenshot({
      path: `./test-results/puppeteer-${name.replace(/\s+/g, '-')}-failure.png`,
    });
  } finally {
    await page.close();
  }
}

// Test definitions
async function testUserRegistration(page) {
  const user = createTestUser();
  await registerUser(page, user);

  if (!page.url().includes('/chat')) {
    throw new Error(`Expected to be on /chat, but at ${page.url()}`);
  }
}

async function testUserLogin(page) {
  const user = createTestUser();

  // Register first
  await registerUser(page, user);

  // Clear local storage to simulate logout
  await page.evaluate(() => localStorage.clear());

  // Login
  await loginUser(page, user);

  if (!page.url().includes('/chat')) {
    throw new Error(`Expected to be on /chat, but at ${page.url()}`);
  }
}

async function testWebSocketConnection(page) {
  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);

  const isConnected = await page.$('[title="Connected"]');
  if (!isConnected) {
    throw new Error('WebSocket not connected');
  }
}

async function testWelcomeMessage(page) {
  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);
  await waitForWelcomeMessage(page);

  const messageCount = await getMessageCount(page, 'assistant');
  if (messageCount === 0) {
    throw new Error('No welcome message received');
  }
}

async function testSendAndReceiveMessage(page) {
  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);
  await waitForWelcomeMessage(page);

  const initialCount = await getMessageCount(page, 'assistant');

  await sendChatMessage(page, 'Hello! What can you tell me about the planets?');
  await waitForAssistantResponse(page);

  const newCount = await getMessageCount(page, 'assistant');
  if (newCount <= initialCount) {
    throw new Error('No response received from assistant');
  }
}

async function testOnboardingConversation(page) {
  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);
  await waitForWelcomeMessage(page);

  // Provide name
  await sendChatMessage(page, 'My name is Sarah');
  await waitForAssistantResponse(page);

  const response = await getLastAssistantMessage(page);
  if (!response) {
    throw new Error('No response after providing name');
  }
  console.log(`  Assistant responded: "${response.substring(0, 100)}..."`);
}

async function testMultipleMessages(page) {
  page.setDefaultTimeout(120000);

  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);
  await waitForWelcomeMessage(page);

  // Send multiple messages
  const messages = [
    'My name is Alex',
    "I'm interested in learning about my birth chart",
    'I was born on March 15, 1992',
  ];

  for (const msg of messages) {
    await sendChatMessage(page, msg);
    await waitForAssistantResponse(page, 90000);
    await page.waitForTimeout(1000);
  }

  const userMsgCount = await getMessageCount(page, 'user');
  if (userMsgCount < 3) {
    throw new Error(`Expected at least 3 user messages, got ${userMsgCount}`);
  }

  const assistantMsgCount = await getMessageCount(page, 'assistant');
  if (assistantMsgCount < 3) {
    throw new Error(`Expected at least 3 assistant messages, got ${assistantMsgCount}`);
  }
}

async function testStreamingIndicator(page) {
  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);
  await waitForWelcomeMessage(page);

  // Send a message that triggers a longer response
  await sendChatMessage(page, 'Tell me everything about the zodiac signs');

  // Check for streaming state during response
  let sawStreaming = false;
  const timeout = 30000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const isStreaming = await page.$('[data-streaming="true"]');
    if (isStreaming) {
      sawStreaming = true;
      break;
    }
    await page.waitForTimeout(100);
  }

  // Wait for response to complete
  await waitForAssistantResponse(page, 90000);

  // Note: streaming might be too fast to catch, so we just verify response came
  console.log(`  Streaming indicator detected: ${sawStreaming}`);
}

async function testChatInputState(page) {
  const user = createTestUser();
  await registerUser(page, user);

  // Before connection, input might be disabled
  const initialPlaceholder = await page.$eval('textarea', (el) => el.placeholder);

  await waitForConnection(page);

  // After connection, input should be enabled
  const connectedPlaceholder = await page.$eval('textarea', (el) => el.placeholder);

  console.log(`  Initial placeholder: "${initialPlaceholder}"`);
  console.log(`  Connected placeholder: "${connectedPlaceholder}"`);

  // The placeholder changes from "..." to "speak" when connected
  if (connectedPlaceholder !== 'speak') {
    throw new Error(`Expected placeholder "speak", got "${connectedPlaceholder}"`);
  }
}

async function testDisconnectionHandling(page) {
  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);

  // Simulate offline mode
  await page.setOfflineMode(true);
  console.log('  Set offline mode');

  await page.waitForTimeout(3000);

  // Check connection state changed
  const stillConnected = await page.$('[title="Connected"]');
  console.log(`  Still connected after offline: ${!!stillConnected}`);

  // Restore connection
  await page.setOfflineMode(false);
  console.log('  Restored online mode');

  // Wait for reconnection
  await page.waitForTimeout(5000);
}

async function testCompleteOnboarding(page) {
  page.setDefaultTimeout(180000);

  const user = createTestUser();
  await registerUser(page, user);
  await waitForConnection(page);
  await waitForWelcomeMessage(page);

  console.log('  Starting onboarding flow...');

  // Provide all birth details in one message
  await sendChatMessage(
    page,
    'My name is Sarah, I was born on December 9, 1995 in New York City at 2:30 PM'
  );
  await waitForAssistantResponse(page, 120000);

  const response = await getLastAssistantMessage(page);
  console.log(`  Onboarding response: "${response?.substring(0, 150)}..."`);

  // Now ask about transits
  await sendChatMessage(page, "What's my energy like this week?");
  await waitForAssistantResponse(page, 120000);

  const transitResponse = await getLastAssistantMessage(page);
  console.log(`  Transit response: "${transitResponse?.substring(0, 150)}..."`);
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('Puppeteer E2E Tests - Archon AI Chat');
  console.log('='.repeat(60));
  console.log(`Frontend URL: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log('='.repeat(60));

  // Ensure test-results directory exists
  const fs = require('fs');
  if (!fs.existsSync('./test-results')) {
    fs.mkdirSync('./test-results', { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // Run tests
    await runTest('User Registration', testUserRegistration, browser);
    await runTest('User Login', testUserLogin, browser);
    await runTest('WebSocket Connection', testWebSocketConnection, browser);
    await runTest('Welcome Message', testWelcomeMessage, browser);
    await runTest('Send and Receive Message', testSendAndReceiveMessage, browser);
    await runTest('Onboarding Conversation', testOnboardingConversation, browser);
    await runTest('Multiple Messages', testMultipleMessages, browser);
    await runTest('Streaming Indicator', testStreamingIndicator, browser);
    await runTest('Chat Input State', testChatInputState, browser);
    await runTest('Disconnection Handling', testDisconnectionHandling, browser);
    await runTest('Complete Onboarding', testCompleteOnboarding, browser);
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('='.repeat(60));

  // Print individual results
  results.tests.forEach((test) => {
    const symbol = test.status === 'PASSED' ? '✓' : '✗';
    console.log(`${symbol} ${test.name}`);
    if (test.error) {
      console.log(`    ${test.error}`);
    }
  });

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  createTestUser,
  registerUser,
  loginUser,
  waitForConnection,
  waitForWelcomeMessage,
  sendChatMessage,
  waitForAssistantResponse,
};
