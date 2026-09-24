import React from 'react'
import { useTranslation } from 'react-i18next'
import { PLAYER_COLORS } from './playerColors'

interface SetRowProps {
	index: number
	score1: string
	score2: string
	isValid: boolean
	winner: 1 | 2 | null
	isArbitratorMode: boolean
	placeholder1: string
	placeholder2: string
	onChange: (player: 1 | 2, value: string) => void
}

const INPUT_BASE =
	'input input-sm w-full bg-slate-950 border-none rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none text-center font-bold text-sm h-9 transition-colors'

export const SetRow: React.FC<SetRowProps> = ({
	index,
	score1,
	score2,
	isValid,
	winner,
	isArbitratorMode,
	placeholder1,
	placeholder2,
	onChange,
}) => {
	const { t } = useTranslation()
	const isComplete = score1 !== '' && score2 !== ''

	// Da arbitro l'esito del set si legge dalla cella evidenziata del vincitore
	const arbiterInputClass = (player: 1 | 2) => {
		if (!isArbitratorMode || !isComplete) return ''
		if (!isValid) return 'ring-1 ring-warning/60'
		return winner === player ? PLAYER_COLORS[player].cell : 'text-slate-500'
	}

	return (
		<div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl">
			<span className="text-xs font-black text-slate-400 w-12 shrink-0">
				{t('common.set')} {index + 1}
			</span>

			<input
				type="text"
				pattern="\d*"
				placeholder={placeholder1}
				className={`${INPUT_BASE} ${arbiterInputClass(1)}`}
				value={score1}
				onChange={e => onChange(1, e.target.value)}
				required
			/>

			<span className="text-slate-500 font-black text-sm">-</span>

			<input
				type="text"
				pattern="\d*"
				placeholder={placeholder2}
				className={`${INPUT_BASE} ${arbiterInputClass(2)}`}
				value={score2}
				onChange={e => onChange(2, e.target.value)}
				required
			/>

			{!isArbitratorMode && (
				<div className="w-16 shrink-0 text-center">
					{isComplete &&
						(isValid ? (
							<span
								className={`text-[10px] font-black uppercase ${winner === 1 ? 'text-success' : 'text-error'}`}
							>
								{winner === 1 ? t('common.won') : t('common.lost')}
							</span>
						) : (
							<span className="text-[9px] text-warning font-semibold">
								{t('common.invalid')}
							</span>
						))}
				</div>
			)}
		</div>
	)
}
