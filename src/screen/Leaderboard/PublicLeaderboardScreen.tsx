import React from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Handshake, Swords, ArrowUpRight } from 'lucide-react'
import { dbService } from '../../services/db'
import { useDataFetch } from '../../hooks/useDataFetch'
import { PodiumSection } from './PodiumSection'
import { RankingListItem } from './RankingListItem'

/** Sezione "Richiedi l'accesso" di Sky Spin Hub: la community e' chiusa, si entra da li'. */
const SKY_SPIN_JOIN_URL = 'https://skyspin-hub.netlify.app/#whatsapp'

// Palette di Sky Spin Hub (variabili CSS del sito): la pagina vive incorporata
// nella bacheca, quindi ne riprende i colori invece del tema dell'app.
//   sfondo #080b10 · pannelli #111720 / #171e29 · bordi #283241
//   rosso brand #e72a36, gradiente CTA #e32333 → #ff4851 · rosa #ffb5b9
//   testo #f2f4f7 · testo secondario #9da9b9

const ABOUT = [
	{ key: 'live', Icon: MapPin },
	{ key: 'closed', Icon: Handshake },
	{ key: 'events', Icon: Swords },
] as const

/**
 * Classifica in sola lettura per chi non ha fatto login (/ranking).
 * Pensata anche per essere incorporata in un iframe dalla bacheca della community.
 */
export const PublicLeaderboardScreen: React.FC = () => {
	const { t } = useTranslation()

	const { data, isLoading } = useDataFetch(() => dbService.getPublicRanking(), {
		refetchOnFocus: true,
	})
	const players = data ?? []

	const topThree = players.slice(0, 3)
	const rest = players.slice(3)
	const eventPoints = players.reduce((sum, p) => sum + p.event_points, 0)

	return (
		<div
			className="min-h-screen bg-[#080b10] text-[#f2f4f7]"
			style={{
				backgroundImage:
					'radial-gradient(650px 550px at 75% -10%, rgba(170, 38, 47, 0.18), transparent 60%)',
			}}
		>
			<div className="max-w-md mx-auto flex flex-col min-h-screen">
				{/* Intestazione */}
				<header className="px-4 pt-7 pb-4">
					<span className="inline-flex items-center rounded-full border border-[#f22932]/40 bg-[#f22932]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffb5b9]">
						{t('publicLeaderboard.badge')}
					</span>
					<h1 className="mt-3 text-3xl font-black tracking-tight leading-none">
						{t('publicLeaderboard.titleLead')}{' '}
						<span className="bg-gradient-to-r from-[#ff4851] to-[#ffb5b9] bg-clip-text text-transparent">
							{t('publicLeaderboard.titleAccent')}
						</span>
					</h1>
					<p className="mt-2 text-sm text-[#9da9b9] leading-relaxed">
						{t('publicLeaderboard.subtitle')}
					</p>
				</header>

				{/* Numeri della community */}
				<section className="px-4 mb-4">
					<div
						className={`grid ${eventPoints > 0 ? 'grid-cols-3' : 'grid-cols-2'} rounded-2xl border border-[#283241] bg-[#111720]/90 divide-x divide-[#283241]`}
					>
						<Stat
							value={players.length > 0 ? String(players.length) : '—'}
							label={t('publicLeaderboard.statPlayers')}
						/>
						<Stat
							value={players[0] ? String(players[0].total_points) : '—'}
							label={t('publicLeaderboard.statLeader')}
						/>
						{eventPoints > 0 && (
							<Stat
								value={String(eventPoints)}
								label={t('publicLeaderboard.statEventPoints')}
							/>
						)}
					</div>
				</section>

				{isLoading ? (
					<div className="flex-1 flex items-center justify-center py-16">
						<span className="loading loading-spinner loading-md text-[#f22932]"></span>
					</div>
				) : players.length === 0 ? (
					<div className="flex-1 flex items-center justify-center p-8 text-center text-[#9da9b9]">
						<p className="text-sm">{t('leaderboard.empty')}</p>
					</div>
				) : (
					<div className="flex-1 px-4 pb-6 space-y-4">
						<PodiumSection topThree={topThree} />

						{rest.length > 0 && (
							<div className="rounded-2xl border border-[#283241] bg-[#111720]/90 divide-y divide-[#283241]/70 overflow-hidden">
								{rest.map((player, i) => (
									<RankingListItem
										key={player.id}
										player={player}
										position={i + 4}
									/>
								))}
							</div>
						)}

						{/* Come si leggono i punti */}
						<p className="px-1 text-[11px] text-[#9da9b9]">
							<span className="font-bold text-[#f2f4f7]">
								{t('publicLeaderboard.legendTotal')}
							</span>
							{' = '}
							{t('publicLeaderboard.legendElo')}
							{' + '}
							<span className="font-semibold text-indigo-400">
								{t('publicLeaderboard.legendEvents')}
							</span>
						</p>

						{/* Cos'e' Sky Spin */}
						<section className="relative overflow-hidden rounded-2xl border border-[#f22932]/30 bg-gradient-to-br from-[#e72a36]/15 via-[#111720] to-[#111720] p-5">
							<div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#e72a36]/20 blur-3xl" />
							<p className="relative text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffb5b9]">
								{t('publicLeaderboard.aboutKicker')}
							</p>
							<h2 className="relative mt-1 text-xl font-black tracking-tight">
								{t('publicLeaderboard.aboutTitle')}
							</h2>
							<ul className="relative mt-4 space-y-3.5">
								{ABOUT.map(({ key, Icon }) => (
									<li key={key} className="flex gap-3">
										<div className="w-9 h-9 rounded-xl bg-[#f22932]/10 border border-[#f22932]/25 flex items-center justify-center shrink-0">
											<Icon className="w-4 h-4 text-[#ff7f86]" />
										</div>
										<div>
											<p className="text-sm font-bold">
												{t(`publicLeaderboard.about.${key}.title`)}
											</p>
											<p className="text-xs text-[#9da9b9] leading-snug">
												{t(`publicLeaderboard.about.${key}.text`)}
											</p>
										</div>
									</li>
								))}
							</ul>
						</section>
					</div>
				)}

				{/* Unica CTA: l'ingresso passa dall'hub */}
				<div className="sticky bottom-0 border-t border-[#283241] bg-[#0b1118]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-sm font-bold leading-tight">
							{t('publicLeaderboard.ctaText')}
						</p>
						<p className="text-[11px] text-[#9da9b9] leading-tight mt-0.5">
							{t('publicLeaderboard.ctaHint')}
						</p>
					</div>
					<a
						href={SKY_SPIN_JOIN_URL}
						// _top: incorporata nell'hub, apre la sezione nella pagina dell'hub, non nel riquadro
						target="_top"
						className="btn btn-sm h-10 rounded-xl bg-gradient-to-r from-[#e32333] to-[#ff4851] hover:brightness-110 text-white border-none font-extrabold shadow-lg shadow-[#e72a36]/30 shrink-0 gap-1"
					>
						{t('publicLeaderboard.ctaButton')}
						<ArrowUpRight className="w-4 h-4" />
					</a>
				</div>
			</div>
		</div>
	)
}

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
	<div className="px-2 py-3.5 text-center">
		<p className="text-xl font-black">{value}</p>
		<p className="text-[9px] font-semibold uppercase tracking-wide text-[#9da9b9] mt-0.5">
			{label}
		</p>
	</div>
)
