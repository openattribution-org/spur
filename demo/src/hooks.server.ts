import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'spur_demo_auth';

export const handle: Handle = async ({ event, resolve }) => {
	const password = env.DEMO_PASSWORD;

	// If no password is set, skip auth (local dev)
	if (!password) return resolve(event);

	// Allow the login page and static assets through
	if (event.url.pathname === '/login') return resolve(event);
	if (event.url.pathname.startsWith('/_app/') || event.url.pathname.startsWith('/favicon')) {
		return resolve(event);
	}

	// Check auth cookie
	const cookie = event.cookies.get(COOKIE_NAME);
	if (cookie === password) return resolve(event);

	// Everything else redirects to login
	return new Response(null, {
		status: 302,
		headers: { Location: '/login' }
	});
};
