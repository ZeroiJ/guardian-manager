import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Hello World worker', () => {
	it('responds with Hello World! (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"Guardian Nexus API is running!"`);
	});

	it('responds with Guardian Nexus API is running! (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(await response.text()).toMatchInlineSnapshot(`"Guardian Nexus API is running!"`);
	});

	it('redirects to Bungie OAuth on /auth/login', async () => {
		const response = await SELF.fetch('https://example.com/auth/login', {
			redirect: 'manual',
		});
		expect(response.status).toBe(302);
		const location = response.headers.get('Location');
		expect(location).toContain('bungie.net/en/OAuth/Authorize');
		expect(location).toContain('client_id=51042');
		expect(location).toContain('response_type=code');
		expect(location).toContain('state=');
		
		const setCookie = response.headers.get('Set-Cookie');
		expect(setCookie).toContain('oauth_state=');
	});
});
