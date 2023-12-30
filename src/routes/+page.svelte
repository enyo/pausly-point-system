<script lang="ts">
	import '$lib/style.css'
	import { pushState } from '$app/navigation'
	import { page } from '$app/stores'
	import { intervalToDuration, formatDuration } from 'date-fns'
	import { unstate, untrack } from 'svelte'
	import { browser } from '$app/environment'
	import { isEqual } from 'lodash-es'

	let initialState = {
		first: 50,
		second: 30,
		third: 10,
		miss: 30,
		target: 1000,
	}

	type Numbers = typeof initialState

	if (browser && location.hash) {
		const params = new URLSearchParams(location.hash.slice(1))
		if (params.has('first')) {
			const state = Object.fromEntries(
				[...params.entries()].map(([key, value]) => [key, +value]),
			) as Numbers
			initialState = state
		}
	}

	let numbers = $state(initialState)

	$effect(() => {
		const state = unstate(numbers)
		const pageState = unstate(untrack(() => $page.state))
		if (isEqual(state, pageState)) return
		const params = new URLSearchParams(state)
		pushState(`#${params}`, unstate(numbers))
	})
	$effect(() => {
		const state = unstate(untrack(() => numbers))
		const pageState = unstate(untrack(() => $page.state))
		if ($page.state['first'] && !isEqual(state, pageState)) {
			numbers = $page.state
		}
	})

	const minSessions = () => {
		let points = 0
		let sessions = 0

		do {
			sessions++
			points = numbers.first * sessions - (7 - sessions) * numbers.miss
		} while (points <= 0 && sessions < 7)

		return sessions
	}

	let fastest = $derived(numbers.target / (numbers.first + numbers.second + numbers.third))
	let minNumberOfSessionsPerWeek = $derived(minSessions())
	let fastestWithWeekends = $derived(
		numbers.target /
			(((numbers.first + numbers.second + numbers.third) * 5 - numbers.miss * 2) / 7),
	)
	let fastestWithWeekendsOnly1 = $derived(
		numbers.target / ((numbers.first * 5 - numbers.miss * 2) / 7),
	)
	let mostCommon = $derived(
		numbers.target / ((numbers.first * 4 + numbers.second * 2 - numbers.miss * 4) / 7),
	)
	let powerUser = $derived(
		numbers.target /
			((numbers.first * 6 + numbers.second * 4 + numbers.third - numbers.miss * 1) / 7),
	)
	let timeWithMinimum = $derived(
		numbers.target / ((numbers.first * minNumberOfSessionsPerWeek) / 7),
	)

	const formatDays = (days: number) => {
		return formatDuration(intervalToDuration({ start: 0, end: days * 24 * 60 * 60 * 1000 }), {
			format: ['years', 'months', 'weeks', 'days'],
		})
	}
</script>

<div class="values">
	<span>First</span> <input type="number" bind:value={numbers.first} />
	<span>Second</span> <input type="number" bind:value={numbers.second} />
	<span>Third</span> <input type="number" bind:value={numbers.third} />
	<span>Miss</span> <input type="number" bind:value={numbers.miss} />
	<span>Target</span> <input type="number" bind:value={numbers.target} />
</div>

<button
	onclick={() => {
		numbers = {
			first: 50,
			second: 30,
			third: 10,
			miss: 30,
			target: 1000,
		}
	}}>Option 1</button
>

<button
	onclick={() => {
		numbers = {
			first: 40,
			second: 20,
			third: 10,
			miss: 20,
			target: 1000,
		}
	}}>Option 2</button
>

<button
	onclick={() => {
		numbers = {
			first: 40,
			second: 20,
			third: 10,
			miss: 15,
			target: 1000,
		}
	}}>Option 3</button
>

<hr />
<dl>
	<dt>Min sessions / week to gain points:</dt>
	<dd>{minNumberOfSessionsPerWeek}</dd>

	<dt>Reach {numbers.target} with {minNumberOfSessionsPerWeek} sessions / week:</dt>
	<dd>{formatDays(timeWithMinimum)}</dd>

	<dt>Reach {numbers.target} points with 3 sessions / day:</dt>
	<dd>{formatDays(fastest)}</dd>

	<dt>Reach {numbers.target} points with 3 sessions / day, except weekends:</dt>
	<dd>{formatDays(fastestWithWeekends)}</dd>

	<dt>Reach {numbers.target} points with 1 session / day, except weekends:</dt>
	<dd>{formatDays(fastestWithWeekendsOnly1)}</dd>

	<dt>Reach {numbers.target} points with common usage (4 times a week, twice double):</dt>
	<dd>{formatDays(mostCommon)}</dd>

	<dt>Reach {numbers.target} points as power user (6 times a week, 4 times double, once third):</dt>
	<dd>{formatDays(powerUser)}</dd>
</dl>

<style>
	.values {
		display: grid;
		grid-template-columns: auto 1fr;
		width: 10rem;
		column-gap: 1rem;
		row-gap: 0.5rem;
	}
	input {
		width: 100%;
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
	}
	dt,
	dd {
		margin: 0;
	}
	dt {
		text-align: right;
	}
	dd {
		white-space: nowrap;
	}
</style>
