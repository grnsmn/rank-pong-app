import React from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, CheckCircle, XCircle, Handshake } from 'lucide-react'
import type { MatchWithSets } from '../../services/db'
import { getSetsScore } from './matchHelpers'

interface CorrectionRequestCardProps {
	match: MatchWithSets
	onApprove: (matchId: string) => void
	onReject: (matchId: string) => void
}

export const CorrectionRequestCard: React.FC<CorrectionRequestCardProps> = ({
	match,
	onApprove,
	onReject,
}) => {
	const { t } = useTranslation()

	const opponent =
		match.player_1_id === match.correction_requested_by ? match.player1 : match.player2
	const currentSets = getSetsScore(match.sets)
	const proposedSets = match.correction_sets ? getSetsScore(match.correction_sets) : null

	return (
		<div
			className={`p-4 rounded-2xl bg-slate-900 shadow-lg shadow-orange-500/10 ${
				match.is_friendly ? 'border-2 border-dashed border-emerald-500/40' : ''
			}`}
		>
			<div className="flex justify-between items-start mb-3">
				<div className="flex gap-1.5">
					<span className="badge badge-sm font-extrabold text-[10px] text-white bg-orange-500 border-none">
						{t('matches.correctionBadge')}
					</span>
					{match.is_friendly && (
						<span className="badge badge-sm font-extrabold text-[10px] bg-emerald-600 text-white border-none gap-1">
							<Handshake className="w-2.5 h-2.5" />
							{t('matches.friendlyBadge')}
						</span>
					)}
				</div>
				<span className="text-[10px] text-slate-500 flex items-center gap-1">
					<Calendar className="w-3 h-3" />
					{new Date(match.created_at).toLocaleDateString()}
				</span>
			</div>

			<p className="text-sm mb-3">
				<span className="font-extrabold text-slate-200">{opponent?.display_name}</span>{' '}
				{t('matches.correctionIntro')}
			</p>

			<div className="bg-slate-950/60 rounded-xl overflow-hidden mb-4 shadow-sm shadow-black/20">
				<div className="flex justify-between items-center px-4 py-2 border-b border-slate-800/60">
					<span className="text-[10px] text-slate-500 uppercase font-bold">
						{t('matches.correctionCurrentLabel')}
					</span>
					<span className="font-mono text-sm text-slate-300 font-bold">
						{currentSets.p1} – {currentSets.p2}
					</span>
				</div>
				{proposedSets && (
					<div className="flex justify-between items-center px-4 py-2.5">
						<span className="text-[10px] text-orange-400 uppercase font-bold">
							{t('matches.correctionProposedLabel')}
						</span>
						<div className="flex flex-col items-end gap-1">
							<span className="font-mono text-sm text-orange-300 font-bold">
								{proposedSets.p1} – {proposedSets.p2}
							</span>
							{match.correction_sets && (
								<div className="flex flex-wrap gap-1 justify-end">
									{match.correction_sets.map((s, i) => (
										<span
											key={i}
											className="bg-orange-950/50 px-1.5 py-0.5 rounded text-[9px] font-mono text-orange-300"
										>
											S{s.set_number}: {s.score_p1}-{s.score_p2}
										</span>
									))}
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			<div className="flex gap-2">
				<button
					onClick={() => onApprove(match.id)}
					className="btn btn-success btn-sm flex-1 text-white font-bold gap-1"
				>
					<CheckCircle className="w-3.5 h-3.5" />
					{t('matches.correctionApprove')}
				</button>
				<button
					onClick={() => onReject(match.id)}
					className="btn btn-sm flex-1 font-bold gap-1 border border-error/40 bg-error/10 text-error hover:bg-error/20 hover:border-error/60"
				>
					<XCircle className="w-3.5 h-3.5" />
					{t('matches.correctionReject')}
				</button>
			</div>
		</div>
	)
}
