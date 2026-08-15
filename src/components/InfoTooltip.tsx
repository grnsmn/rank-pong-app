import React, { useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { useClickOutside } from '../hooks/useClickOutside'

interface InfoTooltipProps {
	text: string
	iconClassName?: string
	align?: 'left' | 'right'
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
	text,
	iconClassName = 'text-slate-400 hover:text-slate-300',
	align = 'left',
}) => {
	const [show, setShow] = useState(false)
	const ref = useRef<HTMLDivElement>(null)
	useClickOutside(ref, () => setShow(false))

	return (
		<div ref={ref} className="relative inline-flex">
			<button
				type="button"
				onClick={() => setShow(prev => !prev)}
				className={`flex items-center transition-colors ${iconClassName}`}
			>
				<Info className="w-3.5 h-3.5" />
			</button>
			{show && (
				<div
					className={`absolute z-20 top-full ${align === 'left' ? 'left-0' : 'right-0'} mt-1.5 w-44 p-2 rounded-lg bg-slate-800 shadow-lg shadow-black/40 text-[10px] leading-snug text-slate-200 normal-case font-normal`}
				>
					{text}
				</div>
			)}
		</div>
	)
}
