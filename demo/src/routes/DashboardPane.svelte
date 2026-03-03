<script lang="ts">
	import type { PublisherSummary, PublisherEvent, PublisherUrlMetric, Paginated, AgentBreakdown } from '$lib/types';
	import { dashboardRefreshTrigger } from '$lib/stores';
	import { onMount } from 'svelte';

	let summary: PublisherSummary | null = $state(null);
	let recentEvents: PublisherEvent[] = $state([]);
	let topUrls: PublisherUrlMetric[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	async function fetchData() {
		try {
			error = null;
			const [summaryRes, eventsRes, urlsRes] = await Promise.all([
				fetch('/api/publisher?view=summary'),
				fetch('/api/publisher?view=events&limit=10'),
				fetch('/api/publisher?view=urls&limit=10')
			]);

			if (summaryRes.ok) summary = await summaryRes.json();
			if (eventsRes.ok) {
				const data: Paginated<PublisherEvent> = await eventsRes.json();
				recentEvents = data.items;
			}
			if (urlsRes.ok) {
				const data: Paginated<PublisherUrlMetric> = await urlsRes.json();
				topUrls = data.items;
			}
		} catch (err) {
			error = String(err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchData();
	});

	dashboardRefreshTrigger.subscribe(() => {
		// Small delay to let the OA server process events
		setTimeout(fetchData, 500);
	});

	function shortUrl(url: string): string {
		try {
			const u = new URL(url);
			return u.pathname.length > 40 ? u.pathname.slice(0, 37) + '...' : u.pathname;
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

<div class="dashboard-container">
	{#if loading}
		<div class="loading">Loading publisher data...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<div class="content">
			<!-- Summary cards -->
			{#if summary}
				<div class="cards">
					<div class="card">
						<div class="card-value">{summary.total_events}</div>
						<div class="card-label">Total events</div>
					</div>
					<div class="card">
						<div class="card-value">{summary.total_sessions}</div>
						<div class="card-label">Sessions</div>
					</div>
					{#each summary.events_by_type as evt}
						<div class="card">
							<div class="card-value">{evt.count}</div>
							<div class="card-label">{evt.event_type}</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Agents -->
			{#if summary?.agents && summary.agents.length > 0}
				<div class="section">
					<div class="section-title">Agents</div>
					<div class="agent-list">
						{#each summary.agents as agent}
							<div class="agent-row">
								<span class="agent-name">{agent.platform_id ?? 'unknown'}{agent.agent_id ? ` / ${agent.agent_id}` : ''}</span>
								<div class="agent-stats">
									<span class="stat">{agent.event_count} events</span>
									<span class="stat">{agent.session_count} sessions</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Top URLs -->
			{#if topUrls.length > 0}
				<div class="section">
					<div class="section-title">Top URLs</div>
					<div class="url-list">
						{#each topUrls as url}
							<div class="url-row">
								<a href={url.content_url} target="_blank" rel="noopener" class="url-path">
									{shortUrl(url.content_url)}
								</a>
								<div class="url-stats">
									<span class="stat">{url.total_events} events</span>
									<span class="stat">{url.unique_sessions} sessions</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Recent events -->
			{#if recentEvents.length > 0}
				<div class="section">
					<div class="section-title">Recent events</div>
					<div class="events-list">
						{#each recentEvents as event}
							<div class="event-row">
								<span class="event-badge" class:retrieved={event.event_type === 'content_retrieved'} class:cited={event.event_type === 'content_cited'} class:engaged={event.event_type === 'content_engaged'}>
									{event.event_type === 'content_retrieved' ? 'RET' : event.event_type === 'content_cited' ? 'CIT' : 'ENG'}
								</span>
								{#if event.platform_id}
									<span class="event-agent">{event.platform_id}</span>
								{/if}
								<span class="event-url">{event.content_url ? shortUrl(event.content_url) : '-'}</span>
								<span class="event-time">{formatTime(event.event_timestamp)}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if !summary?.total_events}
				<div class="no-data">
					<p>No telemetry data yet.</p>
					<p class="hint">Use the chat to generate content_retrieved and content_cited events.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dashboard-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
		padding: 0.75rem;
	}

	.loading, .error, .no-data {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #525252;
		font-size: 0.8rem;
		text-align: center;
		gap: 0.5rem;
	}

	.error {
		color: #ef4444;
	}

	.hint {
		font-size: 0.7rem;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.card {
		background: #141414;
		border: 1px solid #262626;
		border-radius: 6px;
		padding: 0.6rem 0.75rem;
	}

	.card-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: #fff;
	}

	.card-label {
		font-size: 0.6rem;
		color: #737373;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.15rem;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.section-title {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #525252;
	}

	.agent-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.agent-row {
		padding: 0.4rem 0.6rem;
		background: #141414;
		border: 1px solid #1a1a1a;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.agent-name {
		font-size: 0.7rem;
		color: #38bdf8;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.agent-stats {
		display: flex;
		gap: 0.75rem;
	}

	.event-agent {
		font-size: 0.55rem;
		font-weight: 600;
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		background: #0c2d48;
		color: #38bdf8;
		flex-shrink: 0;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.url-list, .events-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.url-row {
		padding: 0.4rem 0.6rem;
		background: #141414;
		border: 1px solid #1a1a1a;
		border-radius: 4px;
	}

	.url-path {
		font-size: 0.7rem;
		color: #a78bfa;
		text-decoration: none;
		font-family: 'SF Mono', 'Fira Code', monospace;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.url-path:hover {
		text-decoration: underline;
	}

	.url-stats {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.2rem;
	}

	.stat {
		font-size: 0.6rem;
		color: #525252;
	}

	.event-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.5rem;
		background: #141414;
		border: 1px solid #1a1a1a;
		border-radius: 4px;
	}

	.event-badge {
		font-size: 0.55rem;
		font-weight: 700;
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.event-badge.retrieved {
		background: #1e0a3f;
		color: #a78bfa;
	}

	.event-badge.cited {
		background: #14532d;
		color: #4ade80;
	}

	.event-badge.engaged {
		background: #422006;
		color: #fbbf24;
	}

	.event-url {
		font-size: 0.65rem;
		color: #737373;
		font-family: 'SF Mono', 'Fira Code', monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.event-time {
		font-size: 0.6rem;
		color: #404040;
		font-family: 'SF Mono', 'Fira Code', monospace;
		flex-shrink: 0;
	}
</style>
