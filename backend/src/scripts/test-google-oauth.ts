import { app } from '../server.js';
import { logger } from '../utils/logger.js';
import http from 'http';

async function runGoogleOAuthTest() {
  logger.info('🚀 Starting Google OAuth2 Integration & Flow Test...');

  // Start the server on port 4001 for test queries
  const port = 4001;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      logger.info(`Test server listening on port ${port}`);
      resolve();
    });
  });

  try {
    const baseUrl = `http://localhost:${port}/api/v1`;

    // 1. Test getGoogleAuthUrl endpoint
    logger.info('Testing GET /auth/google/url...');
    const urlRes = await fetch(`${baseUrl}/auth/google/url`);
    if (!urlRes.ok) {
      throw new Error(`GET /auth/google/url returned status ${urlRes.status}`);
    }

    const urlData = (await urlRes.json()) as { success: boolean; data: { url: string } };
    logger.info('GET /auth/google/url response:');
    console.dir(urlData, { depth: null, colors: true });

    if (!urlData.data.url.includes('accounts.google.com')) {
      logger.error('❌ Failed: Returned URL does not point to accounts.google.com');
      process.exit(1);
    }
    logger.info('✅ Google Auth URL is formatted correctly.');

    // 2. Test Google Callback endpoint (Mock Mode)
    logger.info('Testing POST /auth/google/callback with mock auth code...');
    const callbackRes = await fetch(`${baseUrl}/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'mock-auth-code' }),
    });

    if (!callbackRes.ok) {
      throw new Error(`POST /auth/google/callback returned status ${callbackRes.status}`);
    }

    const callbackData = (await callbackRes.json()) as {
      success: boolean;
      data: {
        accessToken: string;
        refreshToken: string;
        user: { email: string; id: string };
      };
    };
    logger.info('POST /auth/google/callback response:');
    console.dir(callbackData, { depth: null, colors: true });

    const { accessToken, refreshToken, user } = callbackData.data;
    if (!accessToken || !refreshToken || user.email !== 'mock.google.candidate@hirelens.test') {
      logger.error('❌ Failed: Google callback response format or user data is incorrect.');
      process.exit(1);
    }
    logger.info('✅ Google Auth Callback succeeded. Access Token and Refresh Token issued.');

    // 3. Test profile verification using the returned access token
    logger.info('Testing GET /auth/profile with Google access token...');
    const profileRes = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      throw new Error(`GET /auth/profile returned status ${profileRes.status}`);
    }

    const profileData = (await profileRes.json()) as { success: boolean; data: { email: string } };
    logger.info('GET /auth/profile response:');
    console.dir(profileData, { depth: null, colors: true });

    if (profileData.data.email !== 'mock.google.candidate@hirelens.test') {
      logger.error('❌ Failed: Profile email mismatch.');
      process.exit(1);
    }
    logger.info('✅ Profile retrieved successfully using Google JWT authorization.');

    logger.info('🎉 Google OAuth2 Test Suite passed successfully!');
    server.close();
    process.exit(0);
  } catch (err) {
    logger.error('❌ Google OAuth2 Test Suite failed', { error: err instanceof Error ? err.message : String(err) });
    server.close();
    process.exit(1);
  }
}

runGoogleOAuthTest().catch((err) => {
  logger.error('❌ Unhandled test failure', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
