import React from 'react'

interface Props {
	points: Record<string, number>
	/** Mostra l'etichetta della posizione sotto ogni pill */
	showPositions?: boolean
}

const PILL_STYLES = [
	'bg-yellow-400/15 text-yellow-400',
	'bg-slate-300/10 text-slate-300',
	'bg-amber-600/15 text-amber-500',
]

/** La scala punti di un'edizione, come riga di pill colorate per piazzamento. */
export const PointsPills: React.FC<Props> = ({ points, showPositions = false }) => {
	const entries = Object.entries(points)
		.map(([position, value]) => ({ position: Number(position), value }))
		.sort((a, b) => a.position - b.position)

	return (
		<div>
			<div className="flex gap-1">
				{entries.map(({ position, value }) => (
					<span
						key={position}
						className={`flex-1 text-center py-1.5 rounded-lg text-xs font-extrabold ${
							PILL_STYLES[position - 1] ??
							(value === 0
								? 'bg-slate-500/10 text-slate-600'
								: 'bg-slate-500/15 text-slate-400')
						}`}
					>
						{value}
					</span>
				))}
			</div>
			{showPositions && (
				<div className="flex gap-1 mt-1">
					{entries.map(({ position }) => (
						<span
							key={position}
							className="flex-1 text-center text-[9px] font-bold text-slate-600"
						>
							{position}°
						</span>
					))}
				</div>
			)}
		</div>
	)
}
