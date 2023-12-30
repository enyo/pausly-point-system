// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			first: number
			second: number
			third: number
			miss: number
			target: number
		}
		// interface Platform {}
	}
}

export {}
