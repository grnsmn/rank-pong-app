import { useState, useEffect, useCallback, useRef } from 'react'

export function useDataFetch<T>(
	fetcher: () => Promise<T>,
	options: { refetchOnFocus?: boolean } = {}
) {
	const { refetchOnFocus = false } = options
	const [data, setData] = useState<T | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const fetcherRef = useRef(fetcher)
	useEffect(() => {
		fetcherRef.current = fetcher
	})

	const fetch = useCallback(async () => {
		setIsLoading(true)
		try {
			const result = await fetcherRef.current()
			setData(result)
		} catch (err) {
			console.error(err)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetch()
		if (!refetchOnFocus) return
		window.addEventListener('focus', fetch)
		return () => window.removeEventListener('focus', fetch)
	}, [fetch, refetchOnFocus])

	return { data, isLoading, refetch: fetch }
}
