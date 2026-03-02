<script lang="ts">
	import type { ChatMessage, ArticleSummary } from '$lib/types';
	import { telemetryEvents, currentSessionId, dashboardRefreshTrigger } from '$lib/stores';
	import { marked } from 'marked';

	const renderer = new marked.Renderer();
	renderer.link = ({ href, text }) =>
		`<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
	marked.setOptions({ breaks: true, gfm: true, renderer });

	/** Replace [n] citation markers with markdown links to the source URL. */
	function linkCitations(text: string, sources?: ArticleSummary[]): string {
		if (!sources || sources.length === 0) return text;
		return text.replace(/\[(\d+)\]/g, (match, num) => {
			const idx = parseInt(num, 10) - 1;
			if (idx >= 0 && idx < sources.length) {
				return `[\\[${num}\\]](${sources[idx].url})`;
			}
			return match;
		});
	}

	let messages: ChatMessage[] = $state([]);
	let input = $state('');
	let isStreaming = $state(false);
	let messagesEl: HTMLDivElement;

	/** Fire a content_engaged event when a Guardian link is clicked. */
	function handleLinkClick(e: MouseEvent) {
		const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
		if (!anchor) return;

		const url = anchor.href;
		if (!url.includes('theguardian.com')) return;

		let sessionId: string | null = null;
		currentSessionId.subscribe((v) => (sessionId = v))();
		if (!sessionId) return;

		// Fire and forget - don't block navigation
		fetch('/api/engage', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sessionId, url })
		}).catch(() => {});

		telemetryEvents.update((events) => [
			...events,
			{
				type: 'content_engaged' as const,
				count: 1,
				urls: [url],
				timestamp: new Date().toISOString()
			}
		]);
		dashboardRefreshTrigger.update((n) => n + 1);
	}

	function scrollToBottom() {
		if (messagesEl) {
			requestAnimationFrame(() => {
				messagesEl.scrollTop = messagesEl.scrollHeight;
			});
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!input.trim() || isStreaming) return;

		const userMessage = input.trim();
		input = '';

		messages = [...messages, { role: 'user', content: userMessage }];
		scrollToBottom();

		isStreaming = true;

		// Add placeholder assistant message
		const assistantIdx = messages.length;
		messages = [...messages, { role: 'assistant', content: '', sources: [], citations: [] }];

		let sessionId: string | null = null;
		currentSessionId.subscribe((v) => (sessionId = v))();

		try {
			// Collect all sources from previous assistant messages
			const existingSources = messages
				.filter((m) => m.role === 'assistant' && m.sources && m.sources.length > 0)
				.flatMap((m) => m.sources!);

			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: userMessage,
					history: messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
					sessionId,
					existingSources: existingSources.length > 0 ? existingSources : undefined
				})
			});

			if (!res.ok || !res.body) throw new Error(`Chat error: ${res.status}`);

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const blocks = buffer.split('\n\n');
				buffer = blocks.pop() ?? '';

				for (const block of blocks) {
					const eventMatch = block.match(/^event: (.+)$/m);
					const dataMatch = block.match(/^data: (.+)$/m);
					if (!eventMatch || !dataMatch) continue;

					const eventType = eventMatch[1];
					const data = JSON.parse(dataMatch[1]);

					switch (eventType) {
						case 'session':
							currentSessionId.set(data.session_id);
							break;
						case 'sources':
							messages[assistantIdx] = {
								...messages[assistantIdx],
								sources: data.articles
							};
							messages = messages;
							break;
						case 'telemetry':
							telemetryEvents.update((events) => [
								...events,
								{ ...data, timestamp: new Date().toISOString() }
							]);
							break;
						case 'token':
							messages[assistantIdx] = {
								...messages[assistantIdx],
								content: messages[assistantIdx].content + data.text
							};
							messages = messages;
							scrollToBottom();
							break;
						case 'done':
							messages[assistantIdx] = {
								...messages[assistantIdx],
								// Use allSources for citation linking (covers both new and existing)
								sources: data.allSources ?? messages[assistantIdx].sources,
								citations: data.citations
							};
							messages = messages;
							dashboardRefreshTrigger.update((n) => n + 1);
							break;
						case 'error':
							messages[assistantIdx] = {
								...messages[assistantIdx],
								content: `Error: ${data.message}`
							};
							messages = messages;
							break;
					}
				}
			}
		} catch (err) {
			messages[assistantIdx] = {
				...messages[assistantIdx],
				content: `Error: ${err}`
			};
			messages = messages;
		} finally {
			isStreaming = false;
			scrollToBottom();
		}
	}
</script>

<div class="chat-container">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="messages" bind:this={messagesEl} onclick={handleLinkClick}>
		{#if messages.length === 0}
			<div class="empty">
				<p class="empty-title">Ask about Guardian journalism</p>
				<p class="empty-hint">Try: "What has the Guardian reported about AI regulation?"</p>
			</div>
		{/if}

		{#each messages as msg}
			<div class="message {msg.role}">
				<div class="message-label">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
				{#if msg.role === 'assistant'}
					<div class="message-content prose">{@html marked.parse(linkCitations(msg.content, msg.sources))}{#if isStreaming && msg === messages[messages.length - 1] && !msg.content}<span class="cursor">|</span>{/if}</div>
				{:else}
					<div class="message-content">{msg.content}</div>
				{/if}

				{#if msg.sources && msg.sources.length > 0}
					<div class="sources">
						<div class="sources-label">Sources retrieved:</div>
						{#each msg.sources as source, i}
							<a href={source.url} target="_blank" rel="noopener" class="source">
								[{i + 1}] {source.headline}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<form class="input-area" onsubmit={handleSubmit}>
		<input
			type="text"
			bind:value={input}
			placeholder="Ask about Guardian content..."
			disabled={isStreaming}
		/>
		<button type="submit" disabled={isStreaming || !input.trim()}>Send</button>
	</form>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
		color: #525252;
	}

	.empty-title {
		font-size: 1rem;
		font-weight: 500;
		color: #737373;
	}

	.empty-hint {
		font-size: 0.8rem;
		font-style: italic;
	}

	.message {
		padding: 0.75rem;
		border-radius: 6px;
	}

	.message.user {
		background: #1a0a2e;
		border: 1px solid #2e1450;
	}

	.message.assistant {
		background: #141414;
		border: 1px solid #262626;
	}

	.message-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #525252;
		margin-bottom: 0.4rem;
	}

	.message-content {
		font-size: 0.85rem;
		line-height: 1.6;
		word-break: break-word;
	}

	.message-content.prose :global(p) {
		margin: 0.4rem 0;
	}

	.message-content.prose :global(p:first-child) {
		margin-top: 0;
	}

	.message-content.prose :global(p:last-child) {
		margin-bottom: 0;
	}

	.message-content.prose :global(ul),
	.message-content.prose :global(ol) {
		margin: 0.4rem 0;
		padding-left: 1.4rem;
	}

	.message-content.prose :global(li) {
		margin: 0.15rem 0;
	}

	.message-content.prose :global(h1),
	.message-content.prose :global(h2),
	.message-content.prose :global(h3) {
		margin: 0.6rem 0 0.3rem;
		font-weight: 600;
		color: #fff;
	}

	.message-content.prose :global(h1) { font-size: 1.05rem; }
	.message-content.prose :global(h2) { font-size: 0.95rem; }
	.message-content.prose :global(h3) { font-size: 0.9rem; }

	.message-content.prose :global(code) {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		background: #1a1a1a;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
	}

	.message-content.prose :global(pre) {
		background: #1a1a1a;
		border: 1px solid #262626;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		margin: 0.4rem 0;
		overflow-x: auto;
	}

	.message-content.prose :global(pre code) {
		background: none;
		padding: 0;
	}

	.message-content.prose :global(blockquote) {
		border-left: 3px solid #5400f9;
		padding-left: 0.75rem;
		margin: 0.4rem 0;
		color: #a3a3a3;
	}

	.message-content.prose :global(a) {
		color: #a78bfa;
		text-decoration: none;
	}

	.message-content.prose :global(a:hover) {
		text-decoration: underline;
	}

	.message-content.prose :global(strong) {
		color: #fff;
		font-weight: 600;
	}

	.cursor {
		animation: blink 1s step-end infinite;
		color: #737373;
	}

	@keyframes blink {
		50% { opacity: 0; }
	}

	.sources {
		margin-top: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid #262626;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sources-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #525252;
		margin-bottom: 0.25rem;
	}

	.source {
		font-size: 0.75rem;
		color: #a78bfa;
		text-decoration: none;
		line-height: 1.4;
	}

	.source:hover {
		text-decoration: underline;
	}

	.input-area {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-top: 1px solid #262626;
		background: #141414;
		flex-shrink: 0;
	}

	input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 6px;
		color: #e5e5e5;
		font-size: 0.85rem;
		outline: none;
	}

	input:focus {
		border-color: #525252;
	}

	input:disabled {
		opacity: 0.5;
	}

	button {
		padding: 0.5rem 1rem;
		background: #5400f9;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		background: #4500d4;
	}

	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
