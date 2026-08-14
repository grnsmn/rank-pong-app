import React from 'react'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, X, Trophy, Handshake } from 'lucide-react'

type ScopeFilter = 'all' | 'mine'
type OutcomeFilter = 'all' | 'wins' | 'losses'
type TypeFilter = 'all' | 'ranked' | 'friendly'
type TimeFilter = 'all' | 'week' | 'month' | 'threeMonths'
type FormatFilter = 'all' | '3' | '5'

interface FilterBarProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	scopeFilter: ScopeFilter
	onScopeChange: (value: ScopeFilter) => void
	outcomeFilter: OutcomeFilter
	onOutcomeChange: (value: OutcomeFilter) => void
	typeFilter: TypeFilter
	onTypeChange: (value: TypeFilter) => void
	timeFilter: TimeFilter
	onTimeChange: (value: TimeFilter) => void
	formatFilter: FormatFilter
	onFormatChange: (value: FormatFilter) => void
	includeDisputed: boolean
	onIncludeDisputedChange: (value: boolean) => void
	includeWaiting: boolean
	onIncludeWaitingChange: (value: boolean) => void
	showAdvanced: boolean
	onToggleAdvanced: () => void
	hasActiveFilters: boolean
	onClearAll: () => void
}

export const FilterBar: React.FC<FilterBarProps> = ({
	searchQuery,
	onSearchChange,
	scopeFilter,
	onScopeChange,
	outcomeFilter,
	onOutcomeChange,
	typeFilter,
	onTypeChange,
	timeFilter,
	onTimeChange,
	formatFilter,
	onFormatChange,
	includeDisputed,
	onIncludeDisputedChange,
	includeWaiting,
	onIncludeWaitingChange,
	showAdvanced,
	onToggleAdvanced,
	hasActiveFilters,
	onClearAll,
}) => {
	const { t } = useTranslation()

	return (
		<div className="bg-slate-900/40 rounded-2xl p-3.5 space-y-3 shadow-sm shadow-black/20">
			{/* Row 1: Scope pills (All vs Mine) e Outcome filters */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				{/* Scope Pills */}
				<div className="flex gap-1">
					<button
						onClick={() => onScopeChange('all')}
						className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all ${
							scopeFilter === 'all'
								? 'bg-primary text-white shadow-sm shadow-primary/20'
								: 'bg-slate-950 text-slate-500 hover:text-slate-300 cursor-pointer'
						}`}
					>
						{t('matches.filterAllMatches')}
					</button>
					<button
						onClick={() => onScopeChange('mine')}
						className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all ${
							scopeFilter === 'mine'
								? 'bg-primary text-white shadow-sm shadow-primary/20'
								: 'bg-slate-950 text-slate-500 hover:text-slate-300 cursor-pointer'
						}`}
					>
						{t('matches.filterMyMatches')}
					</button>
				</div>

				{/* Outcome Pills (mostrate solo con scopeFilter === 'mine') */}
				{scopeFilter === 'mine' && (
					<div className="flex gap-0.5 bg-slate-950/60 p-0.5 rounded-full shadow-inner shadow-black/20">
						<button
							onClick={() => onOutcomeChange('all')}
							className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
								outcomeFilter === 'all'
									? 'bg-slate-800 text-white'
									: 'text-slate-500 hover:text-slate-400'
							}`}
						>
							{t('matches.filterOutcomeAll')}
						</button>
						<button
							onClick={() => onOutcomeChange('wins')}
							className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
								outcomeFilter === 'wins'
									? 'bg-success text-white'
									: 'text-slate-500 hover:text-slate-400'
							}`}
						>
							<Trophy className="w-2.5 h-2.5" />
							{t('matches.filterOutcomeWins')}
						</button>
						<button
							onClick={() => onOutcomeChange('losses')}
							className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
								outcomeFilter === 'losses'
									? 'bg-error text-white'
									: 'text-slate-500 hover:text-slate-400'
							}`}
						>
							{t('matches.filterOutcomeLosses')}
						</button>
					</div>
				)}
			</div>

			{/* Row 2: Tipo partita (Ranked vs Amichevole) e Toggle Filtri Avanzati */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/60 pt-2.5">
				<div className="flex gap-0.5 bg-slate-950/60 p-0.5 rounded-full shadow-inner shadow-black/20 w-fit">
					<button
						onClick={() => onTypeChange('all')}
						className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
							typeFilter === 'all'
								? 'bg-slate-800 text-white'
								: 'text-slate-500 hover:text-slate-400'
						}`}
					>
						{t('matches.filterTypeAll')}
					</button>
					<button
						onClick={() => onTypeChange('ranked')}
						className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
							typeFilter === 'ranked'
								? 'bg-primary text-white'
								: 'text-slate-500 hover:text-slate-400'
						}`}
					>
						<Trophy className="w-2.5 h-2.5" />
						{t('matches.filterTypeRanked')}
					</button>
					<button
						onClick={() => onTypeChange('friendly')}
						className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
							typeFilter === 'friendly'
								? 'bg-emerald-500 text-white'
								: 'text-slate-500 hover:text-slate-400'
						}`}
					>
						<Handshake className="w-2.5 h-2.5" />
						{t('matches.filterTypeFriendly')}
					</button>
				</div>

				<button
					onClick={onToggleAdvanced}
					className={`btn btn-xs h-8 px-2.5 border-none rounded-xl gap-1 text-[11px] font-bold shrink-0 ${
						showAdvanced || timeFilter !== 'all' || formatFilter !== 'all'
							? 'bg-primary/15 text-primary hover:bg-primary/25'
							: 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
					}`}
				>
					<SlidersHorizontal className="w-3.5 h-3.5" />
					<span>
						{t(
							showAdvanced
								? 'matches.filterHideAdvanced'
								: 'matches.filterShowAdvanced'
						)}
					</span>
				</button>
			</div>

			{/* Row 3: Ricerca giocatore */}
			<div className="relative">
				<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
					<Search className="w-3.5 h-3.5" />
				</span>
				<input
					type="text"
					value={searchQuery}
					onChange={e => onSearchChange(e.target.value)}
					placeholder={t('matches.filterSearchPlaceholder')}
					className="input input-sm pl-8.5 pr-8 w-full bg-slate-950 border-none text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder-slate-500 text-xs h-8"
				/>
				{searchQuery && (
					<button
						onClick={() => onSearchChange('')}
						className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500 hover:text-slate-300"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			{/* Filtri Avanzati Collassabili */}
			{showAdvanced && (
				<div className="space-y-3 pt-2.5 border-t border-slate-900/60">
					<div className="grid grid-cols-2 gap-3">
						{/* Periodo Temporale */}
						<div className="space-y-1">
							<label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 pl-0.5">
								{t('matches.filterTimeAll')}
							</label>
							<select
								value={timeFilter}
								onChange={e => onTimeChange(e.target.value as TimeFilter)}
								className="select select-xs w-full bg-slate-950 border-none text-slate-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none py-1 h-8 text-[11px]"
							>
								<option value="all">{t('matches.filterTimeAll')}</option>
								<option value="week">{t('matches.filterTimeWeek')}</option>
								<option value="month">{t('matches.filterTimeMonth')}</option>
								<option value="threeMonths">
									{t('matches.filterTimeThreeMonths')}
								</option>
							</select>
						</div>

						{/* Formato di Gioco */}
						<div className="space-y-1">
							<label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 pl-0.5">
								{t('matches.filterFormatAll')}
							</label>
							<select
								value={formatFilter}
								onChange={e => onFormatChange(e.target.value as FormatFilter)}
								className="select select-xs w-full bg-slate-950 border-none text-slate-300 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none py-1 h-8 text-[11px]"
							>
								<option value="all">{t('matches.filterFormatAll')}</option>
								<option value="3">{t('matches.filterFormat3')}</option>
								<option value="5">{t('matches.filterFormat5')}</option>
							</select>
						</div>
					</div>

					{/* Includi anche: contestate / in attesa */}
					<div className="space-y-1.5">
						<label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 pl-0.5 block">
							{t('matches.filterIncludeAlso')}
						</label>
						<div className="flex flex-wrap gap-x-4 gap-y-1.5">
							<label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
								<input
									type="checkbox"
									checked={includeDisputed}
									onChange={e => onIncludeDisputedChange(e.target.checked)}
									className="checkbox checkbox-xs checkbox-error"
								/>
								{t('matches.disputedTitle')}
							</label>
							<label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
								<input
									type="checkbox"
									checked={includeWaiting}
									onChange={e => onIncludeWaitingChange(e.target.checked)}
									className="checkbox checkbox-xs checkbox-warning"
								/>
								{t('matches.waitingOpponent')}
							</label>
						</div>
					</div>
				</div>
			)}

			{/* Pulsante Azzera Filtri */}
			{hasActiveFilters && (
				<div className="flex justify-end pt-1 border-t border-slate-900/30">
					<button
						onClick={onClearAll}
						className="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 cursor-pointer"
					>
						<X className="w-3 h-3" />
						{t('matches.filterClear')}
					</button>
				</div>
			)}
		</div>
	)
}
