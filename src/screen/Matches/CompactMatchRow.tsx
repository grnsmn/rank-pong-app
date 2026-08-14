import React from 'react'
import { useTranslation } from 'react-i18next'
import { Handshake } from 'lucide-react'
import type { MatchWithSets } from '../../services/db'
import { getSetsScore } from './matchHelpers'

interface CompactMatchRowProps {
	match: MatchWithSets
	variant: 'waiting' | 'disputed'
}

export const CompactMatchRow: React.FC<CompactMatchRowProps> = ({ match, variant }) => {
	const { t } = useTranslation()
	const { p1, p2 } = getSetsScore(match.sets)

	const shadowClass = variant === 'waiting' ? 'shadow-black/20' : 'shadow-error/10'

	return (
		<div
			className={`p-3 rounded-xl bg-slate-900/60 shadow-sm ${shadowClass} text-xs flex justify-between items-center ${
				match.is_friendly ? 'border-2 border-dashed border-emerald-500/40' : ''
			}`}
		>
			<div>
				{variant === 'waiting' ? (
					<p className="font-semibold text-slate-300 flex items-center gap-1.5 flex-wrap">
						{t('matches.challengeAgainst')}{' '}
						<strong className="text-white">@{match.player2?.username}</strong>
						{match.is_friendly && (
							<span className="badge badge-sm font-extrabold text-[9px] bg-emerald-600 text-white border-none gap-1">
								<Handshake className="w-2.5 h-2.5" />
								{t('matches.friendlyBadge')}
							</span>
						)}
					</p>
				) : (
					<p className="font-semibold text-slate-300 flex items-center gap-1.5 flex-wrap">
						{match.player1?.display_name} vs {match.player2?.display_name}
						{match.is_friendly && (
							<span className="badge badge-sm font-extrabold text-[9px] bg-emerald-600 text-white border-none gap-1">
								<Handshake className="w-2.5 h-2.5" />
								{t('matches.friendlyBadge')}
							</span>
						)}
					</p>
				)}
				<span
					className={`text-[10px] font-mono ${variant === 'waiting' ? 'text-slate-500' : 'text-error font-semibold'}`}
				>
					{variant === 'waiting' ? t('matches.recordedScore') : t('matches.disputedBy')}{' '}
					{p1} - {p2}
				</span>
			</div>
			{variant === 'waiting' ? (
				<span className="badge badge-warning badge-outline badge-sm text-[9px] font-bold py-2">
					{t('matches.waiting')}
				</span>
			) : (
				<span className="badge badge-error badge-outline badge-sm text-[9px] font-bold">
					{t('matches.disputedBadge')}
				</span>
			)}
		</div>
	)
}
