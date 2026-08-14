import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Pencil, Handshake, Trophy, Info } from 'lucide-react'
import type { MatchWithSets } from '../../services/db'
import { getSetsScore, isMyMatch, canRequestCorrection } from './matchHelpers'
import { useClickOutside } from '../../hooks/useClickOutside'

interface MatchCardProps {
	match: MatchWithSets
	currentUserId: string | undefined
	onRequestCorrection: (match: MatchWithSets) => void
}

export const MatchCard: React.FC<MatchCardProps> = ({
	match,
	currentUserId,
	onRequestCorrection,
}) => {
	const { t } = useTranslation()

	const [showInfo, setShowInfo] = useState(false)
	const infoRef = useRef<HTMLDivElement>(null)
	useClickOutside(infoRef, () => setShowInfo(false))

	const { p1, p2 } = getSetsScore(match.sets)
	const isP1Winner = p1 > p2
	const iAmRequester = match.correction_requested_by === currentUserId
	const hasPendingCorrection = match.correction_status === 'pending'
	const mine = isMyMatch(match, currentUserId)

	const player1NameClass = match.is_friendly
		? 'text-slate-200'
		: isP1Winner
			? 'text-yellow-400'
			: 'text-slate-400'
	const player2NameClass = match.is_friendly
		? 'text-slate-200'
		: !isP1Winner
			? 'text-yellow-400'
			: 'text-slate-400'

	return (
		<div
			className={`rounded-2xl bg-neutral/85 overflow-hidden border-2 ${
				match.is_friendly
					? 'shadow-md shadow-black/20 border-dashed border-emerald-500/40'
					: 'shadow-lg shadow-primary/20 border-primary/60'
			}`}
		>
			<div className="px-4 pt-4 pb-3">
				<div className="flex justify-between items-center text-[10px] text-slate-500 mb-3 border-b border-slate-800 pb-2">
					<span className="flex items-center gap-2">
						{match.is_friendly ? (
							<>
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-bold uppercase tracking-wide">
									<Handshake className="w-2.5 h-2.5" />
									{t('matches.friendlyBadge')}
								</span>
								<div ref={infoRef} className="relative">
									<button
										type="button"
										onClick={() => setShowInfo(prev => !prev)}
										className="flex items-center text-emerald-400/70 hover:text-emerald-300 transition-colors"
									>
										<Info className="w-3.5 h-3.5" />
									</button>
									{showInfo && (
										<div className="absolute z-20 top-full left-0 mt-1.5 w-40 p-2 rounded-lg bg-slate-800 shadow-lg shadow-black/40 text-[10px] leading-snug text-slate-200 normal-case font-normal">
											{t('matches.noRankingImpact')}
										</div>
									)}
								</div>
							</>
						) : (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white shadow-sm shadow-primary/30 text-[9px] font-bold uppercase tracking-wide">
								<Trophy className="w-2.5 h-2.5" />
								{t('matches.rankedBadge')}
							</span>
						)}
					</span>
					<span className="flex items-center gap-1">
						<Calendar className="w-3 h-3" />
						{new Date(match.created_at).toLocaleDateString()}
						{' · '}
						{new Date(match.created_at).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						})}
					</span>
				</div>

				<div className="grid grid-cols-7 items-center mb-3">
					<div className="col-span-2 flex flex-col items-center text-center">
						<div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 mb-1 flex items-center justify-center shrink-0">
							{match.player1?.avatar_url ? (
								<img
									src={match.player1.avatar_url}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-xs font-extrabold">
									{match.player1?.display_name.substring(0, 2)}
								</span>
							)}
						</div>
						<span
							className={`text-[10px] truncate max-w-full font-bold ${player1NameClass}`}
						>
							{match.player1?.display_name}
						</span>
						{match.elo_change_p1 !== null && (
							<span
								className={`text-[10px] font-extrabold mt-0.5 ${match.elo_change_p1 >= 0 ? 'text-success' : 'text-error'}`}
							>
								{match.elo_change_p1 >= 0
									? `+${match.elo_change_p1}`
									: match.elo_change_p1}{' '}
								{t('common.elo')}
							</span>
						)}
					</div>

					<div className="col-span-3 flex flex-col items-center justify-center">
						<span className="text-xl font-black text-white bg-slate-950 px-4 py-1 rounded-xl shadow-sm shadow-black/20">
							{p1} - {p2}
						</span>
						<span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">
							{t('common.bestOf')} {match.best_of}
						</span>
					</div>

					<div className="col-span-2 flex flex-col items-center text-center">
						<div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 mb-1 flex items-center justify-center shrink-0">
							{match.player2?.avatar_url ? (
								<img
									src={match.player2.avatar_url}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-xs font-extrabold">
									{match.player2?.display_name.substring(0, 2)}
								</span>
							)}
						</div>
						<span
							className={`text-[10px] truncate max-w-full font-bold ${player2NameClass}`}
						>
							{match.player2?.display_name}
						</span>
						{match.elo_change_p2 !== null && (
							<span
								className={`text-[10px] font-extrabold mt-0.5 ${match.elo_change_p2 >= 0 ? 'text-success' : 'text-error'}`}
							>
								{match.elo_change_p2 >= 0
									? `+${match.elo_change_p2}`
									: match.elo_change_p2}{' '}
								{t('common.elo')}
							</span>
						)}
					</div>
				</div>

				<div className="flex gap-1.5 justify-center mt-3 pt-2.5 border-t border-slate-800/40 text-[10px] text-slate-400">
					{match.sets.map((set, idx) => (
						<span
							key={set.id}
							className="bg-slate-950 px-2.5 py-1 rounded-md font-mono"
						>
							{t('common.set')} {idx + 1}:{' '}
							<strong className="text-slate-200">
								{set.score_p1}-{set.score_p2}
							</strong>
						</span>
					))}
				</div>
			</div>

			{/* Footer correzione */}
			{mine && (
				<div
					className={`px-4 py-2.5 ${hasPendingCorrection ? 'bg-orange-950/20' : 'bg-transparent'}`}
				>
					{hasPendingCorrection && iAmRequester ? (
						<div className="flex items-center justify-center gap-1.5 text-[11px] text-orange-400">
							<Clock className="w-3 h-3 shrink-0" />
							<span>{t('matches.correctionSentWaiting')}</span>
						</div>
					) : hasPendingCorrection ? (
						<div className="flex items-center justify-center gap-1.5 text-[11px] text-orange-400">
							<Clock className="w-3 h-3 shrink-0" />
							<span>{t('matches.correctionOpponentPending')}</span>
						</div>
					) : canRequestCorrection(match, currentUserId) ? (
						<button
							onClick={() => onRequestCorrection(match)}
							className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
						>
							<Pencil className="w-3 h-3" />
							{t('matches.correctionRequestButton')}
						</button>
					) : null}
				</div>
			)}
		</div>
	)
}
