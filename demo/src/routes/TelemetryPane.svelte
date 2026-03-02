<script lang="ts">
	import type { TelemetryEvent } from '$lib/types';
	import { telemetryEvents, currentSessionId } from '$lib/stores';

	let events: TelemetryEvent[] = $state([]);
	let sessionId: string | null = $state(null);
	let eventsEl: HTMLDivElement;

	telemetryEvents.subscribe((v) => {
		events = v;
		if (eventsEl) {
			requestAnimationFrame(() => {
				eventsEl.scrollTop = eventsEl.scrollHeight;
			});
		}
	});

	currentSessionId.subscribe((v) => {
		sessionId = v;
	});

	function shortUrl(url: string): string {
		try {
			const u = new URL(url);
			return u.pathname.length > 50 ? u.pathname.slice(0, 47) + '...' : u.pathname;
		} catch {
			return url;
		}
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<div class="telemetry-container">
	<div class="legend">
		<span class="legend-item"><span class="dot retrieved-dot"></span> retrieved</span>
		<span class="legend-item"><span class="dot cited-dot"></span> cited</span>
		<span class="legend-item"><span class="dot engaged-dot"></span> engaged</span>
		{#if sessionId}
			<span class="session-id">Session: <code>{sessionId.slice(0, 8)}...</code></span>
		{/if}
	</div>

	<div class="events" bind:this={eventsEl}>
		{#if events.length === 0}
			<div class="empty">
				<p>No telemetry events yet.</p>
				<p class="hint">Events appear here as the chat retrieves and cites Guardian content.</p>
			</div>
		{/if}

		{#each events as event, i}
			<div class="event" class:retrieved={event.type === 'content_retrieved'} class:cited={event.type === 'content_cited'} class:engaged={event.type === 'content_engaged'}>
				<div class="event-header">
					<span class="badge" class:badge-retrieved={event.type === 'content_retrieved'} class:badge-cited={event.type === 'content_cited'} class:badge-engaged={event.type === 'content_engaged'}>
						{event.type === 'content_retrieved' ? 'RETRIEVED' : event.type === 'content_cited' ? 'CITED' : 'ENGAGED'}
					</span>
					<span class="count">{event.count} URL{event.count !== 1 ? 's' : ''}</span>
					<span class="time">{formatTime(event.timestamp)}</span>
				</div>
				<div class="event-urls">
					{#each event.urls as url}
						<a href={url} target="_blank" rel="noopener" class="url">{shortUrl(url)}</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>

</div>

<style>
	.telemetry-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.session-id {
		margin-left: auto;
		color: #525252;
	}

	.session-id code {
		color: #737373;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.events {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
		color: #525252;
		font-size: 0.8rem;
		text-align: center;
	}

	.hint {
		font-size: 0.7rem;
		max-width: 20rem;
	}

	.event {
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		border: 1px solid #262626;
		background: #141414;
	}

	.event.retrieved {
		border-left: 3px solid #5400f9;
	}

	.event.cited {
		border-left: 3px solid #22c55e;
	}

	.event.engaged {
		border-left: 3px solid #f59e0b;
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.badge {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
	}

	.badge-retrieved {
		background: #1e0a3f;
		color: #a78bfa;
	}

	.badge-cited {
		background: #14532d;
		color: #4ade80;
	}

	.badge-engaged {
		background: #422006;
		color: #fbbf24;
	}

	.count {
		font-size: 0.7rem;
		color: #a3a3a3;
	}

	.time {
		font-size: 0.65rem;
		color: #525252;
		margin-left: auto;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.event-urls {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.url {
		font-size: 0.7rem;
		color: #737373;
		text-decoration: none;
		font-family: 'SF Mono', 'Fira Code', monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.url:hover {
		color: #a3a3a3;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem 1rem;
		border-bottom: 1px solid #262626;
		background: #141414;
		font-size: 0.6rem;
		color: #525252;
		flex-shrink: 0;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.retrieved-dot {
		background: #5400f9;
	}

	.cited-dot {
		background: #22c55e;
	}

	.engaged-dot {
		background: #f59e0b;
	}
</style>
