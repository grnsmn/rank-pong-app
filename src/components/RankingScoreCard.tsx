import React from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
	eloRating: number
	eventPoints: number
}

/**
 * Il ranking unico del giocatore (come in classifica): ELO delle partite +
 * punti evento correnti, con le due componenti mostrate separatamente.
 */
export const RankingScoreCard: React.FC<Props> = ({ eloRating, eventPoints }) => {
	const { t } = useTranslation()

	return (
		<div className="mt-4 w-full px-5 py-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center">
			<span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
				{t('profile.rankingLabel')}
			</span>
			<span className="text-3xl font-black text-white leading-tight">
				{eloRating + eventPoints}
			</span>
			<div className="flex items-center justify-center gap-2.5 mt-2 pt-2.5 border-t border-slate-800/80 w-full">
				<div className="text-center">
					<div className="text-sm font-extrabold text-primary">{eloRating}</div>
					<div className="text-[9px] text-slate-500">
						{t('profile.rankingFromMatches')}
					</div>
				</div>
				<span className="text-sm font-extrabold text-slate-600">+</span>
				<div className="text-center">
					<div className="text-sm font-extrabold text-indigo-400">{eventPoints}</div>
					<div className="text-[9px] text-slate-500">
						{t('profile.rankingFromEvents')}
					</div>
				</div>
			</div>
		</div>
	)
}
