import React from 'react'
import type { SetScore } from '../../services/db'

interface SetScoreRowProps {
	sets: SetScore[]
	showOutcome: boolean
	mySide: 'p1' | 'p2'
	isFriendly: boolean
}

export const SetScoreRow: React.FC<SetScoreRowProps> = ({
	sets,
	showOutcome,
	mySide,
	isFriendly,
}) => {
	const wonDotClass = isFriendly
		? 'bg-emerald-500 border-emerald-500'
		: 'bg-primary border-primary'
	return (
		<div className="flex justify-center mt-3 pt-3 px-2 border-t border-slate-800/40">
			<div className="relative flex justify-between gap-8">
				<div className="absolute left-2.5 right-2.5 top-2 h-px bg-slate-600" />
				{sets.map(set => {
					const isSetP1Winner = set.score_p1 > set.score_p2
					const didIWinSet = mySide === 'p1' ? isSetP1Winner : !isSetP1Winner

					const dotClass = !showOutcome
						? 'bg-slate-700 border-slate-600'
						: didIWinSet
							? wonDotClass
							: 'bg-neutral border-slate-600'

					return (
						<div
							key={set.id}
							className="relative z-10 flex flex-col items-center gap-2"
						>
							<div className={`w-4 h-4 rounded-full border ${dotClass}`} />
							<span className="text-sm font-bold text-slate-200 font-mono">
								{set.score_p1}-{set.score_p2}
							</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}
