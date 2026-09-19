import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Swords } from 'lucide-react'
import type { EventMatchSlot } from '../../services/db'
import { setsToWin, validateSet } from './eventHelpers'

interface Props {
	slot: EventMatchSlot
	bestOf: 3 | 5
	isSubmitting: boolean
	error: string | null
	onCancel: () => void
	onSubmit: (sets: { set_number: number; score_p1: number; score_p2: number }[]) => void
	onClearError: () => void
}

/**
 * Registra il risultato di uno slot del calendario senza uscire dall'evento.
 * La partita nasce come una normale partita di RankPong e viene agganciata
 * allo slot dalla stessa chiamata a createMatch.
 */
export const RecordResultModal: React.FC<Props> = ({
	slot,
	bestOf,
	isSubmitting,
	error,
	onCancel,
	onSubmit,
	onClearError,
}) => {
	const { t } = useTranslation()
	const [rows, setRows] = useState<{ score1: string; score2: string }[]>([
		{ score1: '', score2: '' },
	])

	const needed = setsToWin(bestOf)
	const validations = rows.map(r => validateSet(r.score1, r.score2))
	const filled = rows.filter(r => r.score1 !== '' && r.score2 !== '')
	const allValid = filled.length === rows.length && validations.every(v => v.isValid)
	const wins1 = validations.filter(v => v.isValid && v.winner === 1).length
	const wins2 = validations.filter(v => v.isValid && v.winner === 2).length
	const finished = wins1 === needed || wins2 === needed
	const canSubmit = allValid && finished && rows.length > 0 && !isSubmitting

	const setScore = (index: number, side: 1 | 2, value: string) => {
		if (value !== '' && !/^\d+$/.test(value)) return
		setRows(prev =>
			prev.map((r, i) =>
				i === index ? { ...r, [side === 1 ? 'score1' : 'score2']: value } : r
			)
		)
		onClearError()
	}

	const submit = () => {
		onSubmit(
			rows.map((r, index) => ({
				set_number: index + 1,
				score_p1: parseInt(r.score1, 10),
				score_p2: parseInt(r.score2, 10),
			}))
		)
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-5"
			style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
			onClick={e => {
				if (e.target === e.currentTarget) onCancel()
			}}
		>
			<div className="w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
				<div className="px-6 pt-6 pb-4 border-b border-slate-800">
					<div className="flex items-center gap-2 mb-1.5">
						<Swords className="w-4 h-4 text-indigo-400 shrink-0" />
						<h3 className="text-base font-bold text-white">{t('events.register')}</h3>
						<span className="badge badge-sm font-extrabold text-[9px] bg-indigo-600 text-white border-none">
							BO{bestOf}
						</span>
					</div>
					<p className="text-xs text-slate-400 leading-relaxed">
						{slot.player1?.display_name} vs {slot.player2?.display_name}
					</p>
				</div>

				<div className="px-6 py-5 space-y-3">
					<div className="grid grid-cols-[3rem_1fr_1rem_1fr] items-center gap-2 mb-1">
						<span />
						<span className="text-center text-[10px] text-slate-500 font-bold uppercase truncate">
							{slot.player1?.display_name}
						</span>
						<span />
						<span className="text-center text-[10px] text-slate-500 font-bold uppercase truncate">
							{slot.player2?.display_name}
						</span>
					</div>

					{rows.map((row, index) => (
						<div
							key={index}
							className="grid grid-cols-[3rem_1fr_1rem_1fr] items-center gap-2"
						>
							<span className="text-[10px] text-slate-500 font-mono text-center">
								{t('common.set')} {index + 1}
							</span>
							<input
								type="text"
								pattern="\d*"
								inputMode="numeric"
								value={row.score1}
								onChange={e => setScore(index, 1, e.target.value)}
								className="input input-sm w-full text-center bg-slate-800 border-none text-white focus:ring-2 focus:ring-indigo-400/50 focus:outline-none"
							/>
							<span className="text-center text-slate-500 font-bold text-xs">–</span>
							<input
								type="text"
								pattern="\d*"
								inputMode="numeric"
								value={row.score2}
								onChange={e => setScore(index, 2, e.target.value)}
								className="input input-sm w-full text-center bg-slate-800 border-none text-white focus:ring-2 focus:ring-indigo-400/50 focus:outline-none"
							/>
						</div>
					))}

					<div className="flex gap-2 pt-1">
						{rows.length < bestOf && !finished && (
							<button
								onClick={() =>
									setRows(prev => [...prev, { score1: '', score2: '' }])
								}
								className="btn btn-sm flex-1 text-xs font-bold border-none bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
							>
								{t('newMatch.nextSet')}
							</button>
						)}
						{rows.length > 1 && (
							<button
								onClick={() => setRows(prev => prev.slice(0, -1))}
								className="btn btn-sm text-xs font-bold w-12 border-none bg-error/15 text-error hover:bg-error/25"
							>
								{t('newMatch.removeSet')}
							</button>
						)}
					</div>

					{error && <p className="text-xs text-error text-center pt-1">{error}</p>}
				</div>

				<div className="px-6 pb-6 flex gap-3">
					<button
						onClick={onCancel}
						disabled={isSubmitting}
						className="btn btn-ghost flex-1 border-none bg-slate-800/50 text-slate-300 hover:bg-slate-800"
					>
						{t('matches.correctionModalCancel')}
					</button>
					<button
						onClick={submit}
						disabled={!canSubmit}
						className={`btn flex-1 font-bold border-none text-white shadow-lg ${
							canSubmit
								? 'bg-orange-500 hover:bg-orange-400'
								: 'bg-slate-700 text-slate-500 cursor-not-allowed'
						}`}
					>
						{isSubmitting ? (
							<span className="loading loading-spinner loading-xs" />
						) : (
							t('events.register')
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
