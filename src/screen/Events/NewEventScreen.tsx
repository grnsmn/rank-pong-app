import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, BarChart3, CheckCircle2, Swords } from 'lucide-react'
import { dbService, defaultEventPoints } from '../../services/db'
import { useFormState } from '../../hooks/useFormState'
import { PointsPills } from './PointsPills'
import { roundRobinMatches, totalPointsAtStake } from './eventHelpers'

interface Props {
	onBack: () => void
	onCreated: (eventId: string) => void
}

const PLAYER_OPTIONS = [4, 5, 6, 7, 8] as const

export const NewEventScreen: React.FC<Props> = ({ onBack, onCreated }) => {
	const { t } = useTranslation()
	const { isSaving, formError, setFormError, setIsSaving } = useFormState()

	const [seriesName, setSeriesName] = useState('Battle Royale')
	const [eventName, setEventName] = useState('')
	const [players, setPlayers] = useState<number>(6)
	const [bestOf, setBestOf] = useState<3 | 5>(5)
	const [deadline, setDeadline] = useState('')

	const points = defaultEventPoints(players)
	const matches = roundRobinMatches(players)
	const canSubmit = seriesName.trim() !== '' && eventName.trim() !== '' && !isSaving

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (seriesName.trim() === '') return setFormError(t('events.errorSeries'))
		if (eventName.trim() === '') return setFormError(t('events.errorName'))

		setIsSaving(true)
		setFormError(null)
		try {
			const id = await dbService.createEvent({
				seriesName: seriesName.trim(),
				eventName: eventName.trim(),
				participantsCount: players,
				bestOf,
				points,
				deadline: deadline ? new Date(deadline).toISOString() : null,
			})
			onCreated(id)
		} catch (err: any) {
			setFormError(err.message ?? 'Errore')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="flex items-center gap-3 px-4 pt-6 pb-2 shrink-0">
				<button
					onClick={onBack}
					className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-white"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>
				<div>
					<h2 className="text-xl font-bold tracking-tight text-white">
						{t('events.newTitle')}
					</h2>
					<p className="text-[13px] text-slate-400">{t('events.newSubtitle')}</p>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-24">
				<form onSubmit={handleSubmit} className="space-y-4 pt-3">
					<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20">
						<label className="label py-0 mb-2">
							<span className="label-text text-[13px] text-slate-300 font-bold tracking-wide">
								{t('events.fieldSeries')}
							</span>
						</label>
						<input
							type="text"
							value={seriesName}
							onChange={e => setSeriesName(e.target.value)}
							placeholder={t('events.fieldSeriesPlaceholder')}
							className="input input-sm w-full bg-slate-950 border-none text-white rounded-xl focus:ring-2 focus:ring-indigo-400/50 focus:outline-none placeholder-slate-500 text-[13px] h-9"
						/>

						<label className="label py-0 mt-3 mb-2">
							<span className="label-text text-[13px] text-slate-300 font-bold tracking-wide">
								{t('events.fieldName')}
							</span>
						</label>
						<input
							type="text"
							value={eventName}
							onChange={e => setEventName(e.target.value)}
							placeholder={t('events.fieldNamePlaceholder')}
							className="input input-sm w-full bg-slate-950 border-none text-white rounded-xl focus:ring-2 focus:ring-indigo-400/50 focus:outline-none placeholder-slate-500 text-[13px] h-9"
						/>
					</div>

					<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20">
						<div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-white/5">
							<Swords className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
							<span className="flex-1 text-[13px] font-bold text-slate-300">
								{seriesName || t('events.fieldSeriesPlaceholder')}
							</span>
						</div>

						<div className="text-xs font-bold text-slate-400 mb-2">
							{t('events.fieldPlayers')}
						</div>
						<div className="flex gap-1.5">
							{PLAYER_OPTIONS.map(n => (
								<button
									key={n}
									type="button"
									onClick={() => setPlayers(n)}
									className={`flex-1 py-2 rounded-xl text-sm font-extrabold transition-all ${
										players === n
											? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
											: 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
									}`}
								>
									{n}
								</button>
							))}
						</div>
						<p className="text-[11px] text-slate-500 mt-2.5 text-center">
							{t('events.fieldMatchesHint', {
								matches,
								perPlayer: players - 1,
							})}
						</p>
					</div>

					<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20">
						<div className="flex justify-between items-center">
							<span className="text-[13px] font-bold text-slate-300">
								{t('events.fieldFormat')}
							</span>
							<div className="flex gap-0.5 bg-slate-950 p-0.5 rounded-full">
								{([3, 5] as const).map(n => (
									<button
										key={n}
										type="button"
										onClick={() => setBestOf(n)}
										className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
											bestOf === n
												? 'bg-primary text-white'
												: 'text-slate-500 hover:text-slate-400'
										}`}
									>
										{t('common.bestOf')} {n}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20">
						<div className="flex justify-between items-center pb-2.5 mb-3.5 border-b border-white/5">
							<span className="text-[13px] font-bold text-slate-300">
								{t('events.fieldPoints')}
							</span>
							<span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-[10px] font-bold uppercase tracking-wide">
								{t('events.fieldPointsPreset', { count: players })}
							</span>
						</div>
						<p className="text-[11px] text-slate-500 mb-2">
							{t('events.fieldPointsHint')}
						</p>
						<PointsPills points={points} showPositions />
					</div>

					{/* Le partite d'evento sono sempre neutre per l'ELO: i punti li
					    da' gia' il piazzamento, contarle due volte non avrebbe senso. */}
					<div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/60 text-slate-400 shadow-sm shadow-black/20">
						<BarChart3 className="w-4 h-4 shrink-0" />
						<div className="flex-1 text-left">
							<span className="text-[13px] font-bold block">
								{t('events.eloNeutralTitle')}
							</span>
							<span className="text-[11px] opacity-75">
								{t('events.eloNeutralHint')}
							</span>
						</div>
					</div>

					<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20">
						<label className="label py-0 mb-2">
							<span className="label-text text-[13px] text-slate-300 font-bold tracking-wide">
								{t('events.fieldDeadline')}
							</span>
						</label>
						<input
							type="date"
							value={deadline}
							onChange={e => setDeadline(e.target.value)}
							className="input input-sm w-full bg-slate-950 border-none text-white rounded-xl focus:ring-2 focus:ring-indigo-400/50 focus:outline-none text-[13px] h-9"
						/>
					</div>

					<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20 space-y-2">
						<div className="flex justify-between items-center text-[13px]">
							<span className="text-slate-400">{t('events.summaryMatches')}</span>
							<span className="font-extrabold text-slate-200">
								{matches} · BO{bestOf}
							</span>
						</div>
						<div className="flex justify-between items-center text-[13px]">
							<span className="text-slate-400">{t('events.summaryPoints')}</span>
							<span className="font-extrabold text-indigo-400">
								{totalPointsAtStake(points)}
							</span>
						</div>
						<div className="pt-2 border-t border-white/5 flex items-center justify-between">
							<span className="text-[13px] font-bold text-slate-300">
								{t('newMatch.matchStatus')}
							</span>
							{canSubmit ? (
								<span className="text-[13px] text-success font-black flex items-center gap-1">
									<CheckCircle2 className="w-4 h-4" />
									{t('newMatch.statusReady')}
								</span>
							) : (
								<span className="text-[13px] text-yellow-500 font-bold">
									{t('newMatch.statusInProgress')}
								</span>
							)}
						</div>
					</div>

					{formError && (
						<div className="alert alert-error text-sm py-2 px-3 shadow-md">
							<span>{formError}</span>
						</div>
					)}

					<button
						type="submit"
						disabled={!canSubmit}
						className={`btn w-full font-bold uppercase tracking-wider rounded-2xl border-none text-white py-3.5 h-auto ${
							canSubmit
								? 'bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/25'
								: 'bg-slate-700 text-slate-500 cursor-not-allowed'
						}`}
					>
						{isSaving ? t('events.submitting') : t('events.submit')}
					</button>
				</form>
			</div>
		</div>
	)
}
