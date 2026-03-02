import { MISTRAL_API_KEY } from '$env/static/private';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

export interface SearchParams {
	query: string;
	tag?: string;
	needsSearch: boolean;
}

/**
 * Ask Mistral to rewrite a user question into a focused Guardian Content API query.
 * Returns a query string using Guardian operators (AND, OR, NOT, phrase quotes).
 */
export async function extractSearchQuery(
	userMessage: string,
	history: Array<{ role: string; content: string }> = [],
	hasExistingSources: boolean = false
): Promise<SearchParams> {
	const res = await fetch(MISTRAL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${MISTRAL_API_KEY}`
		},
		body: JSON.stringify({
			model: 'mistral-medium-latest',
			messages: [
				{
					role: 'system',
					content:
						'You are a search router for a chat assistant backed by the Guardian Content API.\n\n' +
						'Given a user message and conversation history, decide:\n' +
						'1. Whether a NEW search is needed (needs_search)\n' +
						'2. If so, what query and optional tag to use\n\n' +
						'Set needs_search to FALSE when:\n' +
						'- The user asks a follow-up about content already discussed\n' +
						'- The user asks to summarise, clarify, or compare existing sources\n' +
						'- The user says thanks, goodbye, or something conversational\n' +
						'- The question can be answered from the articles already retrieved\n\n' +
						'Set needs_search to TRUE when:\n' +
						'- The user asks about a NEW topic not covered by existing sources\n' +
						'- The user explicitly asks to search for something new\n' +
						'- This is the first message (no history)\n\n' +
						(hasExistingSources
							? 'The conversation already has retrieved articles. Only search if the user needs NEW information.\n\n'
							: 'No articles have been retrieved yet. A search is needed.\n\n') +
						'Query syntax (when needs_search is true):\n' +
						'- AND, OR, NOT operators: debate AND economy\n' +
						'- Phrase search with double quotes: "artificial intelligence"\n' +
						'- Parentheses for grouping: AI AND (regulation OR policy)\n' +
						'- OR is the default operator between bare words\n\n' +
						'Tag (optional - leave empty string if unsure):\n' +
						'- Format: section/keyword, e.g. technology/ai, media/media\n' +
						'- Common: technology/technology, media/media, politics/politics, business/business, environment/environment\n\n' +
						'Rules:\n' +
						'- Use phrase quotes for proper nouns and specific terms\n' +
						'- Use AND to require multiple concepts\n' +
						'- Keep queries focused - 2 to 6 terms max'
				},
				...history.slice(-4).map((m) => ({ role: m.role, content: m.content })),
				{ role: 'user', content: userMessage }
			],
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: 'search_params',
					strict: true,
					schema: {
						type: 'object',
						properties: {
							needs_search: {
								type: 'boolean',
								description: 'Whether a new Guardian search is needed for this message'
							},
							query: {
								type: 'string',
								description: 'Guardian Content API query. Empty string if needs_search is false.'
							},
							tag: {
								type: 'string',
								description: 'Optional Guardian tag filter e.g. media/media. Empty string if not applicable.'
							}
						},
						required: ['needs_search', 'query', 'tag'],
						additionalProperties: false
					}
				}
			},
			max_tokens: 100,
			temperature: 0
		})
	});

	if (!res.ok) {
		return { query: userMessage, needsSearch: true };
	}

	const data = await res.json();
	const raw = data.choices?.[0]?.message?.content?.trim();
	if (!raw) return { query: userMessage, needsSearch: true };

	try {
		const parsed = JSON.parse(raw);
		return {
			needsSearch: parsed.needs_search ?? true,
			query: parsed.query || userMessage,
			tag: parsed.tag || undefined
		};
	} catch {
		return { query: userMessage, needsSearch: true };
	}
}

export async function* streamMistralChat(
	messages: Array<{ role: string; content: string }>
): AsyncGenerator<string> {
	const res = await fetch(MISTRAL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${MISTRAL_API_KEY}`
		},
		body: JSON.stringify({
			model: 'mistral-medium-latest',
			messages,
			stream: true,
			max_tokens: 2048
		})
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Mistral API error ${res.status}: ${body}`);
	}
	if (!res.body) throw new Error('No response body from Mistral');

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			if (!line.startsWith('data: ')) continue;
			const data = line.slice(6).trim();
			if (data === '[DONE]') return;
			try {
				const parsed = JSON.parse(data);
				const content = parsed.choices?.[0]?.delta?.content;
				if (content) yield content;
			} catch {
				// Skip malformed chunks
			}
		}
	}
}
