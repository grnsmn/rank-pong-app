// Colori neutri per i due giocatori in modalità arbitro: nessuno dei due è "tu",
// quindi niente verde/rosso ma un'identità cromatica per lato.
export const PLAYER_COLORS = {
	1: {
		text: 'text-sky-300',
		dot: 'bg-sky-400',
		avatar: 'bg-sky-950 text-sky-200 ring-2 ring-sky-500/60',
		cell: 'bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/50',
	},
	2: {
		text: 'text-amber-300',
		dot: 'bg-amber-400',
		avatar: 'bg-amber-950 text-amber-200 ring-2 ring-amber-500/60',
		cell: 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/50',
	},
} as const
