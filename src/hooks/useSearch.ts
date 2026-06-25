import { useState, useMemo } from 'react'

export function useSearch<T>(items: T[], matcher: (item: T, query: string) => boolean) {
	const [search, setSearch] = useState('')

	const filtered = useMemo(() => {
		if (!search.trim()) return items
		const q = search.toLowerCase()
		return items.filter(item => matcher(item, q))
	}, [items, search, matcher])

	return { search, setSearch, filtered }
}
