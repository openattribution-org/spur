import { OA_SERVER_URL, OA_PLATFORM_KEY, OA_PUBLISHER_KEY } from '$env/static/private';
import { randomUUID } from 'crypto';

async function oaFetch(path: string, opts: RequestInit & { usePublisherKey?: boolean } = {}) {
	const key = opts.usePublisherKey ? OA_PUBLISHER_KEY : OA_PLATFORM_KEY;
	const { usePublisherKey: _, ...fetchOpts } = opts;

	const res = await fetch(`${OA_SERVER_URL}${path}`, {
		...fetchOpts,
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': key,
			...opts.headers
		}
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`OA server error ${res.status}: ${body}`);
	}
	return res.json();
}

// ---------------------------------------------------------------------------
// Write endpoints (platform key)
// ---------------------------------------------------------------------------

export async function startSession(): Promise<{ session_id: string }> {
	return oaFetch('/session/start', {
		method: 'POST',
		body: JSON.stringify({
			initiator_type: 'user',
			platform_id: 'spur-demo',
			client_type: 'web'
		})
	});
}

export async function emitEvents(
	sessionId: string,
	eventType: 'content_retrieved' | 'content_cited' | 'content_engaged',
	contentUrls: string[],
	eventData: Record<string, unknown> = {}
): Promise<{ status: string; events_created: number }> {
	const now = new Date().toISOString();
	const defaultData =
		eventType === 'content_cited'
			? { citation_type: 'reference' }
			: eventType === 'content_engaged'
				? { engagement_type: 'click', ...eventData }
				: {};

	return oaFetch('/events', {
		method: 'POST',
		body: JSON.stringify({
			session_id: sessionId,
			events: contentUrls.map((url) => ({
				id: randomUUID(),
				type: eventType,
				timestamp: now,
				content_url: url,
				data: defaultData
			}))
		})
	});
}

export async function endSession(
	sessionId: string
): Promise<{ status: string; session_id: string }> {
	return oaFetch('/session/end', {
		method: 'POST',
		body: JSON.stringify({
			session_id: sessionId,
			outcome: { type: 'browse' }
		})
	});
}

// ---------------------------------------------------------------------------
// Read endpoints (publisher key)
// ---------------------------------------------------------------------------

export async function getPublisherSummary(since?: string) {
	const params = since ? `?since=${since}` : '';
	return oaFetch(`/publisher/summary${params}`, { method: 'GET', usePublisherKey: true });
}

export async function getPublisherEvents(limit = 20) {
	return oaFetch(`/publisher/events?limit=${limit}&offset=0`, {
		method: 'GET',
		usePublisherKey: true
	});
}

export async function getPublisherUrls(limit = 10) {
	return oaFetch(`/publisher/urls?limit=${limit}&offset=0`, {
		method: 'GET',
		usePublisherKey: true
	});
}
