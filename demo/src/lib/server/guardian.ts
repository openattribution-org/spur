import { GUARDIAN_API_KEY } from '$env/static/private';

const BASE_URL = 'https://content.guardianapis.com';

export interface GuardianResult {
	id: string;
	type: string;
	sectionId: string;
	sectionName: string;
	webPublicationDate: string;
	webTitle: string;
	webUrl: string;
	apiUrl: string;
	fields?: {
		headline?: string;
		standfirst?: string;
		byline?: string;
		body?: string;
		wordcount?: string;
	};
}

export interface GuardianSearchOptions {
	query: string;
	tag?: string;
	pageSize?: number;
}

async function doSearch(query: string, tag: string | undefined, pageSize: number, fromDate: string): Promise<GuardianResult[]> {
	const params = new URLSearchParams({
		q: query,
		'show-fields': 'headline,byline,body,standfirst,wordcount',
		'page-size': String(pageSize),
		'order-by': 'newest',
		'from-date': fromDate,
		'api-key': GUARDIAN_API_KEY
	});
	if (tag) params.set('tag', tag);

	const res = await fetch(`${BASE_URL}/search?${params}`);
	if (!res.ok) throw new Error(`Guardian API error: ${res.status}`);

	const data = await res.json();
	return data.response.results ?? [];
}

export async function searchGuardian(options: GuardianSearchOptions): Promise<GuardianResult[]> {
	const { query, tag, pageSize = 5 } = options;

	// Try last 30 days first for current reporting
	const recent = new Date();
	recent.setDate(recent.getDate() - 30);
	const results = await doSearch(query, tag, pageSize, recent.toISOString().split('T')[0]);

	// If too few results, widen to 90 days
	if (results.length < 3) {
		const wider = new Date();
		wider.setDate(wider.getDate() - 90);
		return doSearch(query, tag, pageSize, wider.toISOString().split('T')[0]);
	}

	return results;
}

/** Strip HTML tags from body text. */
export function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, '').trim();
}

/** Truncate text to roughly `maxChars`, breaking at a word boundary. */
export function truncateBody(body: string, maxChars = 2000): string {
	const clean = stripHtml(body);
	if (clean.length <= maxChars) return clean;
	const truncated = clean.slice(0, maxChars);
	const lastSpace = truncated.lastIndexOf(' ');
	return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}
