<script lang="ts">
	import '$lib/style.css'
	import { pushState } from '$app/navigation'
	import { page } from '$app/stores'
	import { intervalToDuration, formatDuration } from 'date-fns'
	import { unstate, untrack } from 'svelte'
	import { browser } from '$app/environment'
	import { isEqual } from 'lodash-es'

	/** Chances of doing a first, second or third session */
	type DayProbabilities = [number, number?, number?]

	type WeekProbabilities = [
		DayProbabilities,
		DayProbabilities,
		DayProbabilities,
		DayProbabilities,
		DayProbabilities,
		DayProbabilities,
		DayProbabilities,
	]

	const CHARACTERS = ['rare', 'casual', 'common', 'power', 'max'] as const
	type Character = (typeof CHARACTERS)[number]

	const CHARACTER_PROBABILITIES: { [key in Character]: WeekProbabilities } = {
		rare: [[0], [90, 50, 5], [0], [90, 40, 5], [0], [0], [0]],
		casual: [[80, 40], [30, 20], [20], [50, 30], [40, 20], [5], [5]],
		common: [[80, 40, 10], [80, 40, 10], [80, 40, 10], [80, 40, 10], [80, 40, 10], [20], [20]],
		power: [
			[95, 40, 10],
			[95, 40, 10],
			[95, 40, 10],
			[95, 40, 10],
			[95, 40, 10],
			[90, 20, 5],
			[90, 20, 5],
		],
		max: [
			[100, 100, 100],
			[100, 100, 100],
			[100, 100, 100],
			[100, 100, 100],
			[100, 100, 100],
			[100, 100, 100],
			[100, 100, 100],
		],
	}
	const CHARACTER_DESCRIPTIONS: { [key in Character]: string } = {
		rare: 'Typically does a session on Tuesday and Thursday, but not always.',
		casual: 'Very likely to start with a session on Monday, and sometimes during the week.',
		common:
			'Typical (active) user. Has a 80% chance of doing a session Mo - Fr. Sometimes on the Weekend',
		power: 'Power user. Does a session nearly every day. Often a second one.',
		max: 'Every day three sessions.',
	}

	let initialPoints = {
		first: 3,
		second: 2,
		third: 1,
		target: 1000,
		multiplierIncrease: 1,
		multiplierDecay: 0.2,
		multiplierCap: 10,
	}

	type Points = typeof initialPoints

	if (browser && location.hash) {
		const params = new URLSearchParams(location.hash.slice(1))
		if (params.has('first')) {
			const state = Object.fromEntries(
				[...params.entries()].map(([key, value]) => [key, +value]),
			) as Points
			initialPoints = state
		}
	}

	let points = $state(initialPoints)

	$effect(() => {
		const state = unstate(points)
		const pageState = unstate(untrack(() => $page.state))
		if (isEqual(state, pageState)) return
		const params = new URLSearchParams(state)
		pushState(`#${params}`, unstate(points))
	})
	$effect(() => {
		const state = unstate(untrack(() => points))
		const pageState = unstate(untrack(() => $page.state))
		if ($page.state['first'] && !isEqual(state, pageState)) {
			points = $page.state
		}
	})

	type CalculatedProbabilities = {
		points: number
		daysUntilMaxMultiplier?: number | undefined
		daysUntilFirstLevel?: number | undefined
		daysUntilSecondLevel?: number | undefined
		daysUntilThirdLevel?: number | undefined
		maxMultiplier: number
	}

	type CharacterCalculatedProbabilities = {
		[key in keyof typeof CHARACTER_PROBABILITIES]: CalculatedProbabilities
	}

	const INITIAL_CALCULATED_PROBABILITIES: CalculatedProbabilities = Object.freeze({
		points: 0,
		maxMultiplier: 1,
	})

	const calculateProbabilites = (): CharacterCalculatedProbabilities => {
		let calculated = {} as CharacterCalculatedProbabilities
		for (let [name, probabilities] of Object.entries(CHARACTER_PROBABILITIES)) {
			const thisCalculated = { ...INITIAL_CALCULATED_PROBABILITIES }
			calculated[name as Character] = thisCalculated

			let sessionYesterday = false
			let multiplier = 1

			for (let i = 0; i < 365; i++) {
				if (sessionYesterday) multiplier += points.multiplierIncrease
				else multiplier -= points.multiplierDecay
				multiplier = Math.max(1, Math.min(multiplier, points.multiplierCap))
				thisCalculated.maxMultiplier = Math.max(thisCalculated.maxMultiplier, multiplier)

				const weekday = i % 7
				if (Math.random() * 100 <= probabilities[weekday][0]) {
					sessionYesterday = true
					thisCalculated.points += Math.ceil(points.first * multiplier)
					if (Math.random() * 100 <= (probabilities[weekday][1] ?? 0)) {
						thisCalculated.points += Math.ceil(points.second * multiplier)
						if (Math.random() * 100 <= (probabilities[weekday][2] ?? 0)) {
							thisCalculated.points += Math.ceil(points.third * multiplier)
						}
					}
				} else {
					sessionYesterday = false
				}

				if (!thisCalculated.daysUntilFirstLevel && thisCalculated.points >= 1000) {
					thisCalculated.daysUntilFirstLevel = i + 1
				}
				if (!thisCalculated.daysUntilSecondLevel && thisCalculated.points >= 2000) {
					thisCalculated.daysUntilSecondLevel = i + 1
				}
				if (!thisCalculated.daysUntilThirdLevel && thisCalculated.points >= 3000) {
					thisCalculated.daysUntilThirdLevel = i + 1
				}
				if (!thisCalculated.daysUntilMaxMultiplier && multiplier >= points.multiplierCap) {
					thisCalculated.daysUntilMaxMultiplier = i + 1
				}
			}
		}

		return calculated
	}

	let probabilities = $derived(calculateProbabilites())

	const formatDays = (days: number | undefined) => {
		if (!days) return 'Never'
		return formatDuration(intervalToDuration({ start: 0, end: days * 24 * 60 * 60 * 1000 }), {
			format: ['years', 'months', 'weeks', 'days'],
		})
	}

	const getDescription = (character: Character) => {
		const probs = CHARACTER_PROBABILITIES[character]
		if (!probs) return ''

		const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

		let text = `${character.toUpperCase()}\n\n${CHARACTER_DESCRIPTIONS[character]}\n\n`
		const f = (v: number | string) => v.toString().padEnd(5, ' ')

		for (let i = 0; i < 7; i++) {
			text += `${days[i].padStart(10, ' ')}  1: ${f(`${probs[i][0]}%`)} 2: ${f(
				`${probs[i][1] ?? 0}%`,
			)} 3: ${f(`${probs[i][2] ?? 0}%`)}\n`
		}
		return text
	}

	let debug = $state('')
</script>

<div class="values">
	<label>
		<span>First</span> <input type="number" bind:value={points.first} />
	</label>
	<label>
		<span>Second</span> <input type="number" bind:value={points.second} />
	</label>
	<label>
		<span>Third</span> <input type="number" bind:value={points.third} />
	</label>
	<label>
		<span>Target</span> <input type="number" bind:value={points.target} />
	</label>
	<label>
		<span>Multi increase</span> <input type="number" bind:value={points.multiplierIncrease} />
	</label>
	<label>
		<span>Multi decay</span> <input type="number" bind:value={points.multiplierDecay} />
	</label>
	<label>
		<span>Multi cap</span> <input type="number" bind:value={points.multiplierCap} />
	</label>
</div>

<!-- <button
	onclick={() => {
		points = {
			first: 50,
			second: 30,
			third: 10,
			miss: 30,
			target: 1000,
		}
	}}>Option 1</button
> -->

<hr />

<table border="1">
	<thead>
		<tr>
			<th>Type</th>
			<th title="After one year">Level</th>
			<th title="Time to reach level 1">Level 1</th>
			<th title="Time to reach level 2">Level 2</th>
			<th title="Time to reach level 3">Level 3</th>
			<th title="Time to reach max multiplier">x{points.multiplierCap} Multiplier</th>
		</tr>
	</thead>
	<tbody>
		{#each Object.entries(probabilities) as [name, values]}
			<tr
				onfocus={() => {}}
				onblur={() => {}}
				onmouseover={() => (debug = getDescription(name as Character))}
				onmouseout={() => (debug = '')}
			>
				<td title={getDescription(name as Character)}>{name.toUpperCase()}</td>
				<td title="Level after one year">{Math.floor(values.points / 1000)}</td>
				<td title="Time to reach level 1">{formatDays(values.daysUntilFirstLevel)}</td>
				<td title="Time to reach level 2">{formatDays(values.daysUntilSecondLevel)}</td>
				<td title="Time to reach level 3">{formatDays(values.daysUntilThirdLevel)}</td>
				<td title="Time to reach max multiplier">{formatDays(values.daysUntilMaxMultiplier)}</td>
			</tr>
		{/each}
	</tbody>
</table>

<pre>{debug}</pre>

<style>
	.values {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
		column-gap: 1rem;
		row-gap: 0.5rem;
	}
	label {
		display: flex;
		flex-direction: column;
	}
	label span {
		white-space: nowrap;
	}
	input {
		width: 3rem;
	}
	table {
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
