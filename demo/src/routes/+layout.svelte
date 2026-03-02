<script>
	let { children } = $props();
</script>

<div class="app">
	<header>
		<img class="logo" src="/spur-logo.png" alt="SPUR" />
		<div class="title">Live telemetry demo</div>
		<div class="subtitle">OpenAttribution Telemetry + Guardian content</div>
	</header>
	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		background: #0a0a0a;
		color: #e5e5e5;
		height: 100vh;
		overflow: hidden;
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	header {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		background: #141414;
		border-bottom: 1px solid #262626;
	}

	.logo {
		height: 1.4rem;
		filter: invert(1);
	}

	.title {
		font-size: 0.9rem;
		font-weight: 500;
		color: #d4d4d4;
	}

	.subtitle {
		font-size: 0.75rem;
		color: #737373;
		margin-left: auto;
	}

	main {
		flex: 1;
		overflow: hidden;
	}
</style>
