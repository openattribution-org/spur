import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'spur_demo_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get('password') as string;

		if (!password || password !== env.DEMO_PASSWORD) {
			return fail(401, { incorrect: true });
		}

		cookies.set(COOKIE_NAME, password, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: COOKIE_MAX_AGE
		});

		throw redirect(302, '/');
	}
};
