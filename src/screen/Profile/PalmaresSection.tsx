import React from 'react'
import { useTranslation } from 'react-i18next'
import { Crown, History, Info, Medal, Trophy } from 'lucide-react'
import type { Palmares } from '../../services/db'

interface Props {
	palmares: Palmares
}

/**
 * I punti evento vengono sostituiti a ogni edizione, i trofei no:
 * questa sezione è la memoria lunga del giocatore.
 */
export const PalmaresSection: React.FC<Props> = ({ palmares }) => {
	const { t } = useTranslation()

	if (palmares.editions_played === 0) {
		return (
			<div>
				<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
					{t('profile.palmaresTitle')}
				</h4>
				<div className="p-6 text-center rounded-2xl bg-slate-900/20 border border-slate-800 text-slate-500 text-xs">
					{t('profile.palmaresEmpty')}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{palmares.reigning.length > 0 && (
				<div className="flex items-center gap-3 p-3.5 rounded-2xl bg-yellow-400/[0.08] border border-yellow-400/35">
					<Crown className="w-5 h-5 text-yellow-400 fill-yellow-400/20 shrink-0" />
					<div className="min-w-0">
						<div className="text-xs font-extrabold text-yellow-400">
							{t('profile.reigningChampion')}
						</div>
						<div className="text-[10px] text-yellow-200/80 truncate">
							{palmares.reigning.join(' · ')}
						</div>
					</div>
				</div>
			)}

			<div>
				<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
					{t('profile.palmaresTitle')}
				</h4>
				<div className="flex gap-2.5">
					<div className="flex-1 flex flex-col items-center gap-1 py-3.5 rounded-xl bg-yellow-400/[0.08] border border-yellow-400/25">
						<Trophy className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
						<span className="text-xl font-black text-yellow-400 leading-none">
							{palmares.titles}
						</span>
						<span className="text-[9px] font-bold uppercase tracking-wide text-yellow-700">
							{t('profile.palmaresTitles')}
						</span>
					</div>
					<div className="flex-1 flex flex-col items-center gap-1 py-3.5 rounded-xl bg-slate-300/[0.06] border border-slate-300/20">
						<Medal className="w-5 h-5 text-slate-300 fill-slate-300/15" />
						<span className="text-xl font-black text-slate-300 leading-none">
							{palmares.seconds}
						</span>
						<span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
							{t('profile.palmaresSeconds')}
						</span>
					</div>
					<div className="flex-1 flex flex-col items-center gap-1 py-3.5 rounded-xl bg-amber-600/[0.08] border border-amber-600/25">
						<Medal className="w-5 h-5 text-amber-600 fill-amber-600/15" />
						<span className="text-xl font-black text-amber-600 leading-none">
							{palmares.thirds}
						</span>
						<span className="text-[9px] font-bold uppercase tracking-wide text-amber-800">
							{t('profile.palmaresThirds')}
						</span>
					</div>
				</div>
			</div>

			<div>
				<div className="flex items-center gap-1.5 mb-2.5">
					<History className="w-3 h-3 text-indigo-400" />
					<h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
						{t('profile.historyTitle')}
					</h4>
				</div>

				<div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
					{palmares.results.map((result, index) => (
						<div
							key={result.id}
							className={`flex items-center gap-3 px-3.5 py-3 ${
								index > 0 ? 'border-t border-slate-800/80' : ''
							} ${result.is_current ? 'bg-indigo-500/[0.07]' : ''}`}
						>
							<div
								className={`w-1 h-8 rounded-full shrink-0 ${
									result.final_rank === 1
										? 'bg-yellow-400'
										: result.final_rank === 2
											? 'bg-slate-300'
											: result.final_rank === 3
												? 'bg-amber-600'
												: 'bg-slate-700'
								}`}
							/>
							<div className="flex-1 min-w-0">
								<div
									className={`text-xs font-bold truncate ${
										result.is_current ? 'text-slate-200' : 'text-slate-400'
									}`}
								>
									{result.event_name}
								</div>
								<div className="text-[10px] text-slate-500">
									{result.final_rank}° posto
								</div>
							</div>
							<div className="text-right shrink-0">
								<div
									className={`text-[13px] font-black ${
										result.is_current
											? 'text-indigo-400'
											: 'text-slate-600 line-through'
									}`}
								>
									{result.ranking_points}
								</div>
								<div
									className={`text-[8px] font-bold uppercase tracking-wide ${
										result.is_current ? 'text-success' : 'text-slate-600'
									}`}
								>
									{result.is_current
										? t('profile.historyActive')
										: t('profile.historyReplaced')}
								</div>
							</div>
						</div>
					))}

					<div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-950/60 border-t border-slate-800/80">
						<Info className="w-3 h-3 text-slate-600 shrink-0" />
						<span className="text-[10px] text-slate-500 leading-snug">
							{t('profile.historyInfo')}
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
