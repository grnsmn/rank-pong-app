import { create } from 'zustand'
import { dbService, type Profile } from '../services/db'
import { supabase, isSupabaseConfigured } from '../supabaseClient'

// Evita di registrare più volte il listener di auth
let authListenerRegistered = false

interface AppState {
	currentUser: { id: string; email: string; username: string; display_name: string } | null
	currentProfile: Profile | null
	isLoading: boolean
	error: string | null
	recoveryMode: boolean
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
	requestPasswordReset: (email: string) => Promise<void>
	updatePassword: (newPassword: string) => Promise<void>
	setRecoveryMode: (value: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
	currentUser: null,
	currentProfile: null,
	isLoading: true,
	error: null,
	recoveryMode: false,

	initialize: async () => {
		set({ isLoading: true, error: null })

		// Registra una sola volta il listener che intercetta il click sul link
		// di reset password ricevuto via email (evento PASSWORD_RECOVERY).
		if (isSupabaseConfigured && supabase && !authListenerRegistered) {
			authListenerRegistered = true
			supabase.auth.onAuthStateChange(event => {
				if (event === 'PASSWORD_RECOVERY') {
					// Pulisce il fragment dall'URL per evitare ri-trigger e link condivisibili
					if (window.history.replaceState) {
						window.history.replaceState(null, '', window.location.pathname)
					}
					set({ recoveryMode: true, isLoading: false })
				}
			})
		}

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

	requestPasswordReset: async email => {
		set({ error: null })
		try {
			await dbService.requestPasswordReset(email)
		} catch (err: any) {
			set({ error: err.message || 'Impossibile inviare il link di reset' })
			throw err
		}
	},

	updatePassword: async newPassword => {
		set({ isLoading: true, error: null })
		try {
			await dbService.updatePassword(newPassword)
			// La sessione di recovery è ora una sessione valida: carichiamo il profilo
			const user = await dbService.getCurrentUser()
			if (user) {
				const profile = await dbService.getProfile(user.id)
				set({ currentUser: user, currentProfile: profile })
			}
			set({ recoveryMode: false })
		} catch (err: any) {
			set({ error: err.message || 'Impossibile aggiornare la password' })
			throw err
		} finally {
			set({ isLoading: false })
		}
	},

	setRecoveryMode: value => set({ recoveryMode: value }),
}))
