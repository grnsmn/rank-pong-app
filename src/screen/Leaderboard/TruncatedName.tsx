import React, { useEffect, useRef, useState } from 'react'

interface Props {
	text: string
	className?: string
	wrapperClassName?: string
	block?: boolean
}

// Testo troncato con ellipsis: tooltip nativo su hover (desktop) e tooltip
// cliccabile su mobile, mostrato solo se il testo è effettivamente troncato.
// `block`: usarlo quando più istanze devono impilarsi verticalmente in un
// contenitore non-flex (altrimenti, essendo inline-block, finiscono affiancate).
export const TruncatedName: React.FC<Props> = ({
	text,
	className = '',
	wrapperClassName = '',
	block = false,
}) => {
	const textRef = useRef<HTMLSpanElement>(null)
	const [showTooltip, setShowTooltip] = useState(false)

	useEffect(() => {
		if (!showTooltip) return

		const hide = () => setShowTooltip(false)
		const timer = setTimeout(hide, 2500)
		document.addEventListener('click', hide)

		return () => {
			clearTimeout(timer)
			document.removeEventListener('click', hide)
		}
	}, [showTooltip])

	const handleClick = (e: React.MouseEvent) => {
		const el = textRef.current
		if (!el || el.scrollWidth <= el.clientWidth) return
		e.stopPropagation()
		setShowTooltip(prev => !prev)
	}

	return (
		<span
			className={`relative min-w-0 ${block ? 'block w-full' : 'inline-block max-w-full'} ${wrapperClassName}`}
		>
			<span
				ref={textRef}
				title={text}
				onClick={handleClick}
				className={`block truncate ${className}`}
			>
				{text}
			</span>
			{showTooltip && (
				<span
					role="tooltip"
					className="absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow-lg"
				>
					{text}
				</span>
			)}
		</span>
	)
}
