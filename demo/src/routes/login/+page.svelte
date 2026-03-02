<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="login">
	<div class="card">
		<img class="logo" src="/spur-logo.png" alt="SPUR" />
		<p class="subtitle">Live telemetry demo</p>

		<form method="POST" use:enhance>
			<input
				type="password"
				name="password"
				placeholder="Password"
				autocomplete="off"
			/>
			{#if form?.incorrect}
				<p class="error">Incorrect password</p>
			{/if}
			<button type="submit">Enter</button>
		</form>
	</div>
</div>

<style>
	.login {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: #0a0a0a;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		padding: 2.5rem;
		background: #141414;
		border: 1px solid #262626;
		border-radius: 8px;
		width: 20rem;
	}

	.logo {
		height: 2rem;
		filter: invert(1);
	}

	.subtitle {
		font-size: 0.8rem;
		color: #737373;
		margin-top: -0.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	input {
		padding: 0.6rem 0.75rem;
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 6px;
		color: #e5e5e5;
		font-size: 0.85rem;
		outline: none;
		text-align: center;
	}

	input:focus {
		border-color: #5400f9;
	}

	.error {
		font-size: 0.75rem;
		color: #ef4444;
		text-align: center;
	}

	button {
		padding: 0.6rem 1rem;
		background: #5400f9;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
	}

	button:hover {
		background: #4500d4;
	}
</style>
