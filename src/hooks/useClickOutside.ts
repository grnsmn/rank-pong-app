import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

export function useClickOutside(
	refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
	handler: () => void
) {
	const handlerRef = useRef(handler)
	useEffect(() => {
		handlerRef.current = handler
	})

	useEffect(() => {
		const refArray = Array.isArray(refs) ? refs : [refs]
		const listener = (e: MouseEvent) => {
			const clickedOutsideAll = refArray.every(
				ref => !ref.current || !ref.current.contains(e.target as Node)
			)
			if (clickedOutsideAll) handlerRef.current()
		}
		document.addEventListener('mousedown', listener)
		return () => document.removeEventListener('mousedown', listener)
	}, [])
}
