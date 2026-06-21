import { create } from 'zustand'
import { dbService, type Profile } from '../services/db'

interface AppState {
	currentUser: { id: string; email: string; username: string; display_name: string } | null
	currentProfile: Profile | null
	isLoading: boolean
	error: string | null
	initialize: () => Promise<void>
	login: (email: string, password: string) => Promise<void>
	signup: (
		email: string,
		password: string,
		username: string,
		displayName: string,
		age: number,
		playerType: 'amateur' | 'competitive' | 'student'
	) => Promise<void>
	logout: () => Promise<void>
	refreshProfile: () => Promise<void>
	updateProfile: (updates: {
		display_name?: string
		age?: number | null
		player_type?: 'amateur' | 'competitive' | 'student'
	}) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
	currentUser: null,
	currentProfile: null,
	isLoading: true,
	error: null,

	initialize: async () => {
		set({ isLoading: true, error: null })
		try {
			const user = await dbService.getCurrentUser()
			if (user) {
				const profile = await dbService.getProfile(user.id)
				set({ currentUser: user, currentProfile: profile })
			}
		} catch (err: any) {
			console.error('Errore inizializzazione sessione:', err)
			localStorage.removeItem('rp_session')
		} finally {
			set({ isLoading: false })
		}
	},

	login: async (email, password) => {
		set({ isLoading: true, error: null })
		try {
			const profile = await dbService.login(email, password)
			set({
				currentUser: {
					id: profile.id,
					email: `${profile.username}@rankpong.local`,
					username: profile.username,
					display_name: profile.display_name,
				},
				currentProfile: profile,
				error: null,
			})
		} catch (err: any) {
			set({ error: err.message || 'Credenziali non valide' })
			throw err
		} finally {
			set({ isLoading: false })
		}
	},

	signup: async (email, password, username, displayName, age, playerType) => {
		set({ isLoading: true, error: null })
		try {
			const profile = await dbService.signup(
				email,
				password,
				username,
				displayName,
				age,
				playerType
			)
			set({
				currentUser: {
					id: profile.id,
					email,
					username: profile.username,
					display_name: profile.display_name,
				},
				currentProfile: profile,
				error: null,
			})
		} catch (err: any) {
			set({ error: err.message || 'Errore durante la registrazione' })
			throw err
		} finally {
			set({ isLoading: false })
		}
	},

	logout: async () => {
		set({ isLoading: true })
		try {
			await dbService.logout()
			set({ currentUser: null, currentProfile: null, error: null })
		} catch (err: any) {
			console.error('Errore logout:', err)
		} finally {
			set({ isLoading: false })
		}
	},

	refreshProfile: async () => {
		const { currentUser } = get()
		if (!currentUser) return
		try {
			const profile = await dbService.getProfile(currentUser.id)
			set({ currentProfile: profile })
		} catch (err) {
			console.error('Errore aggiornamento profilo:', err)
		}
	},

	updateProfile: async updates => {
		const { currentUser } = get()
		if (!currentUser) return
		const updated = await dbService.updateProfile(currentUser.id, updates)
		set({
			currentProfile: updated,
			currentUser: {
				...currentUser,
				display_name: updated.display_name,
			},
		})
	},
}))
