import React from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Pencil, Handshake, Trophy, ShieldAlert } from 'lucide-react'
import type { MatchWithSets } from '../../services/db'
import { getSetsScore, isMyMatch, canRequestCorrection } from './matchHelpers'
import { InfoTooltip } from '../../components/InfoTooltip'
import { SetScoreRow } from './SetScoreRow'

interface MatchCardProps {
	match: MatchWithSets
	currentUserId: string | undefined
	onRequestCorrection: (match: MatchWithSets) => void
	onPlayerSelect?: (playerId: string) => void
}

export const MatchCard: React.FC<MatchCardProps> = ({
	match,
	currentUserId,
	onRequestCorrection,
	onPlayerSelect,
}) => {
	const { t } = useTranslation()

	const { p1, p2 } = getSetsScore(match.sets)
	const isP1Winner = p1 > p2
	const iAmRequester = match.correction_requested_by === currentUserId
	const hasPendingCorrection = match.correction_status === 'pending'
	const mine = isMyMatch(match, currentUserId)
	const mySide: 'p1' | 'p2' = mine && currentUserId === match.player_2_id ? 'p2' : 'p1'

	const isDisputed = match.status === 'disputed'
	const isAwaitingConfirm = match.status === 'pending'
	const isSettled = match.status === 'confirmed'

	const showWinnerColor = isSettled && !match.is_friendly
	const showSetOutcome = isSettled
	const player1NameClass = showWinnerColor
		? isP1Winner
			? 'text-yellow-400'
			: 'text-slate-400'
		: 'text-slate-200'
	const player2NameClass = showWinnerColor
		? !isP1Winner
			? 'text-yellow-400'
			: 'text-slate-400'
		: 'text-slate-200'

	const statusAccent = isDisputed
		? 'error'
		: isAwaitingConfirm
			? 'warning'
			: match.is_friendly
				? 'friendly'
				: 'primary'

	const borderClass = {
		error: 'shadow-md shadow-error/20 border-error/60',
		warning: 'shadow-md shadow-warning/10 border-dashed border-warning/50',
		friendly: 'shadow-md shadow-black/20 border-dashed border-emerald-500/40',
		primary: 'shadow-lg shadow-primary/20 border-primary/60',
	}[statusAccent]

	const typeBadge = match.is_friendly ? (
		<>
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-bold uppercase tracking-wide">
				<Handshake className="w-2.5 h-2.5" />
				{t('matches.friendlyBadge')}
			</span>
			<InfoTooltip
				text={t('matches.noRankingImpact')}
				iconClassName="text-emerald-400/70 hover:text-emerald-300"
			/>
		</>
	) : (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white shadow-sm shadow-primary/30 text-[9px] font-bold uppercase tracking-wide">
			<Trophy className="w-2.5 h-2.5" />
			{t('matches.rankedBadge')}
		</span>
	)

	return (
		<div className={`rounded-2xl bg-neutral/85 overflow-hidden border-2 ${borderClass}`}>
			<div className="px-4 pt-4 pb-3">
				<div className="flex justify-between items-center text-[10px] text-slate-500 mb-3 border-b border-slate-800 pb-2">
					<span className="flex items-center gap-2 flex-wrap">
						{isDisputed && (
							<>
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error text-white shadow-sm shadow-error/30 text-[9px] font-bold uppercase tracking-wide">
									<ShieldAlert className="w-2.5 h-2.5" />
									{t('matches.disputedBadge')}
								</span>
								<InfoTooltip
									text={t('matches.disputedInfo')}
									iconClassName="text-error/70 hover:text-error"
								/>
							</>
						)}
						{isAwaitingConfirm && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-[9px] font-bold uppercase tracking-wide">
								<Clock className="w-2.5 h-2.5" />
								{t('matches.waiting')}
							</span>
						)}
						{typeBadge}
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
					<div
						className="col-span-2 flex flex-col items-center text-center cursor-pointer"
						onClick={() => match.player1 && onPlayerSelect?.(match.player1.id)}
					>
						<div className="w-14 h-14 rounded-full overflow-hidden bg-slate-800 border border-slate-700 mb-1 flex items-center justify-center shrink-0">
							{match.player1?.avatar_url ? (
								<img
									src={match.player1.avatar_url}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-sm font-extrabold">
									{match.player1?.display_name.substring(0, 2)}
								</span>
							)}
						</div>
						<span
							className={`text-sm truncate max-w-full font-bold ${player1NameClass}`}
						>
							{match.player1?.display_name}
						</span>
						{match.elo_change_p1 !== null && (
							<span
								className={`text-xs font-extrabold mt-0.5 ${match.elo_change_p1 >= 0 ? 'text-success' : 'text-error'}`}
							>
								{match.elo_change_p1 >= 0
									? `+${match.elo_change_p1}`
									: match.elo_change_p1}{' '}
								{t('common.elo')}
							</span>
						)}
					</div>

					<div className="col-span-3 flex flex-col items-center justify-center">
						<span className="text-2xl font-black text-white bg-slate-950 px-4 py-1 rounded-xl shadow-sm shadow-black/20">
							{p1} - {p2}
						</span>
					</div>

					<div
						className="col-span-2 flex flex-col items-center text-center cursor-pointer"
						onClick={() => match.player2 && onPlayerSelect?.(match.player2.id)}
					>
						<div className="w-14 h-14 rounded-full overflow-hidden bg-slate-800 border border-slate-700 mb-1 flex items-center justify-center shrink-0">
							{match.player2?.avatar_url ? (
								<img
									src={match.player2.avatar_url}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<span className="text-sm font-extrabold">
									{match.player2?.display_name.substring(0, 2)}
								</span>
							)}
						</div>
						<span
							className={`text-md truncate max-w-full font-bold ${player2NameClass}`}
						>
							{match.player2?.display_name}
						</span>
						{match.elo_change_p2 !== null && (
							<span
								className={`text-xs font-extrabold mt-0.5 ${match.elo_change_p2 >= 0 ? 'text-success' : 'text-error'}`}
							>
								{match.elo_change_p2 >= 0
									? `+${match.elo_change_p2}`
									: match.elo_change_p2}{' '}
								{t('common.elo')}
							</span>
						)}
					</div>
				</div>

				<SetScoreRow
					sets={match.sets}
					showOutcome={showSetOutcome}
					mySide={mySide}
					isFriendly={match.is_friendly}
				/>
			</div>

			{/* Footer correzione */}
			{mine && isSettled && (
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
							className="w-full flex items-center justify-center cursor-pointer group"
						>
							<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/60 text-slate-300 text-[11px] font-semibold group-hover:bg-slate-950 group-hover:text-white transition-colors">
								<Pencil className="w-3 h-3" />
								{t('matches.correctionRequestButton')}
							</span>
						</button>
					) : null}
				</div>
			)}
		</div>
	)
}
