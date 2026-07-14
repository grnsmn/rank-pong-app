import { useEffect, useState } from 'react'

/**
 * useState che persiste il valore in sessionStorage.
 * I dati sopravvivono al cambio tab / re-render ma vengono
 * eliminati alla chiusura della scheda del browser.
 */
export function useSessionState<T>(
	key: string,
	initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
	const [value, setValue] = useState<T>(() => {
		try {
			const stored = sessionStorage.getItem(key)
			return stored !== null ? (JSON.parse(stored) as T) : initialValue
		} catch {
			return initialValue
		}
	})

	// Salva ad ogni cambiamento
	useEffect(() => {
		try {
			sessionStorage.setItem(key, JSON.stringify(value))
		} catch {
			// storage pieno o non disponibile: ignora
		}
	}, [key, value])

	return [value, setValue]
}
