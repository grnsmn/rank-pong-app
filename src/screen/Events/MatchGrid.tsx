import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, LayoutGrid, X } from 'lucide-react'
import type { EventMatchSlot } from '../../services/db'
import { getSetsScore } from '../Matches/matchHelpers'

interface Props {
	slots: EventMatchSlot[]
	currentUserId?: string
	bestOf: 3 | 5
	/** Assente quando l'edizione è conclusa: le righe diventano sola lettura */
	onRecord?: (slot: EventMatchSlot) => void
	/** Conferma un risultato registrato dall'avversario */
	onConfirm?: (slot: EventMatchSlot) => void
	/** Rifiuta un risultato: annulla la registrazione e libera lo slot */
	onReject?: (slot: EventMatchSlot) => void
	isActing?: boolean
}

const VISIBLE_BY_DEFAULT = 6

export const MatchGrid: React.FC<Props> = ({
	slots,
	currentUserId,
	bestOf,
	onRecord,
	onConfirm,
	onReject,
	isActing,
}) => {
	const { t } = useTranslation()
	const [expanded, setExpanded] = useState(false)

	const played = slots.filter(s => s.match?.status === 'confirmed').length
	const visible = expanded ? slots : slots.slice(0, VISIBLE_BY_DEFAULT)

	const name = (id: string | undefined, display: string | undefined) =>
		id && id === currentUserId ? t('common.you') : (display ?? '—')

	return (
		<div>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-1.5">
					<LayoutGrid className="w-3 h-3 text-slate-400" />
					<span className="text-xs font-bold uppercase tracking-widest text-slate-400">
						{t('events.matchesTitle')}
					</span>
				</div>
				<span className="text-[11px] font-bold text-slate-500">
					BO{bestOf} · {played} / {slots.length}
				</span>
			</div>

			<div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
				{visible.map((slot, index) => {
					const match = slot.match
					const isMine =
						slot.player_1_id === currentUserId || slot.player_2_id === currentUserId
					const label = (
						<span className="text-xs text-slate-400 truncate">
							<span
								className={
									slot.player_1_id === currentUserId
										? 'text-indigo-400 font-bold'
										: ''
								}
							>
								{name(slot.player_1_id, slot.player1?.display_name)}
							</span>
							<span className="text-slate-600"> vs </span>
							<span
								className={
									slot.player_2_id === currentUserId
										? 'text-indigo-400 font-bold'
										: ''
								}
							>
								{name(slot.player_2_id, slot.player2?.display_name)}
							</span>
						</span>
					)

					if (match?.status === 'confirmed') {
						const score = getSetsScore(match.sets)
						// getSetsScore ragiona su player_1/player_2 del match, che possono
						// essere invertiti rispetto allo slot: riallineo allo slot.
						const flipped = match.player_1_id !== slot.player_1_id
						const left = flipped ? score.p2 : score.p1
						const right = flipped ? score.p1 : score.p2

						return (
							<div
								key={slot.id}
								className={`grid grid-cols-[1fr_58px_18px] gap-2 items-center px-3 py-2.5 ${
									index > 0 ? 'border-t border-slate-800/60' : ''
								}`}
							>
								{label}
								<span className="text-[13px] font-extrabold text-slate-200 text-center tabular-nums">
									{left} – {right}
								</span>
								<Check className="w-3.5 h-3.5 text-success" strokeWidth={3} />
							</div>
						)
					}

					// Qui il match, se c'è, è per forza pending o disputed:
					// il ramo confirmed è già uscito sopra.
					const pending = !!match
					// Chi ha registrato risulta già confermato: tocca all'altro.
					// Senza onConfirm l'edizione non accetta più risposte (conclusa o
					// annullata): la riga resta leggibile ma senza bottoni morti.
					const waitingForMe =
						!!match &&
						match.status === 'pending' &&
						((match.player_1_id === currentUserId && !match.player_1_confirmed) ||
							(match.player_2_id === currentUserId && !match.player_2_confirmed))

					return (
						<div
							key={slot.id}
							className={`grid grid-cols-[1fr_114px] gap-2 items-center px-3 py-2.5 ${
								index > 0 ? 'border-t border-slate-800/60' : ''
							} ${isMine && onRecord && !match ? 'bg-indigo-500/10' : ''}`}
						>
							{label}
							{pending ? (
								waitingForMe && onConfirm ? (
									<span className="flex gap-1 justify-end">
										<button
											onClick={() => onConfirm?.(slot)}
											disabled={isActing}
											className="btn btn-success btn-xs h-6 min-h-0 px-2 text-white font-bold text-[11px]"
										>
											{t('matches.approve')}
										</button>
										<button
											onClick={() => onReject?.(slot)}
											disabled={isActing}
											className="btn btn-xs h-6 min-h-0 px-1.5 font-bold border border-error/40 bg-error/10 text-error hover:bg-error/20"
											title={t('events.rejectResult')}
										>
											<X className="w-3 h-3" />
										</button>
									</span>
								) : (
									<span className="text-[11px] font-semibold text-warning text-center">
										{t('matches.waiting')}
									</span>
								)
							) : onRecord ? (
								<button
									onClick={() => onRecord(slot)}
									className={`px-2 py-1 rounded-full text-[11px] font-bold text-center cursor-pointer ${
										isMine
											? 'bg-indigo-500 text-white'
											: 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
									}`}
								>
									{t('events.register')}
								</button>
							) : (
								<span className="text-[11px] font-semibold text-slate-600 text-center">
									{t('events.matchesToPlay')}
								</span>
							)}
						</div>
					)
				})}

				{slots.length > VISIBLE_BY_DEFAULT && (
					<div className="flex justify-center px-3 py-2.5 border-t border-slate-800/60 bg-slate-950/40">
						<button
							onClick={() => setExpanded(prev => !prev)}
							className="px-4 py-1.5 rounded-xl bg-slate-800/50 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-800"
						>
							{expanded
								? t('events.showLess')
								: t('events.showAll', { count: slots.length })}
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
