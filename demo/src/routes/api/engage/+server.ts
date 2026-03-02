import type { RequestHandler } from './$types';
import { emitEvents } from '$lib/server/oa';

export const POST: RequestHandler = async ({ request }) => {
	const { sessionId, url } = await request.json();

	if (!sessionId || !url) {
		return new Response(JSON.stringify({ error: 'sessionId and url required' }), { status: 400 });
	}

	try {
		await emitEvents(sessionId, 'content_engaged', [url], { engagement_type: 'click' });
		return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
	} catch (err) {
		return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
	}
};
