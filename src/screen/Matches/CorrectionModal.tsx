import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Handshake } from 'lucide-react'
import type { MatchWithSets } from '../../services/db'

interface CorrectionSetInput {
	score_p1: string
	score_p2: string
}

interface CorrectionModalProps {
	match: MatchWithSets
	sets: CorrectionSetInput[]
	error: string | null
	isSubmitting: boolean
	onSetsChange: (sets: CorrectionSetInput[]) => void
	onClearError: () => void
	onCancel: () => void
	onSubmit: () => void
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
	match,
	sets,
	error,
	isSubmitting,
	onSetsChange,
	onClearError,
	onCancel,
	onSubmit,
}) => {
	const { t } = useTranslation()

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-5"
			style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
			onClick={e => {
				if (e.target === e.currentTarget) onCancel()
			}}
		>
			<div className="w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
				{/* Header modale */}
				<div className="px-6 pt-6 pb-4 border-b border-slate-800">
					<div className="flex items-center gap-2 mb-1.5">
						<Pencil className="w-4 h-4 text-orange-400 shrink-0" />
						<h3 className="text-base font-bold text-white">
							{t('matches.correctionModalTitle')}
						</h3>
						{match.is_friendly && (
							<span className="badge badge-sm font-extrabold text-[9px] bg-emerald-600 text-white border-none gap-1">
								<Handshake className="w-2.5 h-2.5" />
								{t('matches.friendlyBadge')}
							</span>
						)}
					</div>
					<p className="text-xs text-slate-400 leading-relaxed">
						{t('matches.correctionModalSubtitle')}
					</p>
				</div>

				{/* Corpo modale */}
				<div className="px-6 py-5 space-y-3">
					{/* Intestazioni colonne */}
					<div className="grid grid-cols-[3rem_1fr_1rem_1fr] items-center gap-2 mb-1">
						<span />
						<span className="text-center text-[10px] text-slate-500 font-bold uppercase truncate">
							{match.player1?.display_name}
						</span>
						<span />
						<span className="text-center text-[10px] text-slate-500 font-bold uppercase truncate">
							{match.player2?.display_name}
						</span>
					</div>

					{sets.map((set, idx) => (
						<div
							key={idx}
							className="grid grid-cols-[3rem_1fr_1rem_1fr] items-center gap-2"
						>
							<span className="text-[10px] text-slate-500 font-mono text-center">
								{t('common.set')} {idx + 1}
							</span>
							<input
								type="number"
								min="0"
								value={set.score_p1}
								onChange={e => {
									const next = sets.map((s, i) =>
										i === idx ? { ...s, score_p1: e.target.value } : s
									)
									onSetsChange(next)
									onClearError()
								}}
								className="input input-sm w-full text-center bg-slate-800 border-none text-white focus:ring-2 focus:ring-orange-400/50 focus:outline-none"
							/>
							<span className="text-center text-slate-500 font-bold text-xs">–</span>
							<input
								type="number"
								min="0"
								value={set.score_p2}
								onChange={e => {
									const next = sets.map((s, i) =>
										i === idx ? { ...s, score_p2: e.target.value } : s
									)
									onSetsChange(next)
									onClearError()
								}}
								className="input input-sm w-full text-center bg-slate-800 border-none text-white focus:ring-2 focus:ring-orange-400/50 focus:outline-none"
							/>
						</div>
					))}

					{error && <p className="text-xs text-error text-center pt-1">{error}</p>}
				</div>

				{/* Footer modale */}
				<div className="px-6 pb-6 flex gap-3">
					<button
						onClick={onCancel}
						disabled={isSubmitting}
						className="btn btn-ghost flex-1 border-none bg-slate-800/50 text-slate-300 hover:bg-slate-800"
					>
						{t('matches.correctionModalCancel')}
					</button>
					<button
						onClick={onSubmit}
						disabled={isSubmitting}
						className="btn flex-1 font-bold bg-orange-500 hover:bg-orange-400 text-white border-none shadow-lg"
					>
						{isSubmitting ? (
							<span className="loading loading-spinner loading-xs" />
						) : (
							t('matches.correctionModalSend')
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
