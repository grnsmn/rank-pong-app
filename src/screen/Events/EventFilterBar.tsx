import React from 'react'
import { useTranslation } from 'react-i18next'
import { Search, UserCheck, X } from 'lucide-react'
import type { EventStatus } from '../../services/db'

export type StatusFilter = 'all' | EventStatus

interface Props {
	search: string
	onSearchChange: (value: string) => void
	status: StatusFilter
	onStatusChange: (value: StatusFilter) => void
	onlyMine: boolean
	onOnlyMineChange: (value: boolean) => void
	shown: number
	total: number
	onClear: () => void
}

/** Colore attivo per stato, allineato ai badge delle card. */
const STATUS_OPTIONS: { key: StatusFilter; labelKey: string; active: string }[] = [
	{ key: 'all', labelKey: 'events.filterAll', active: 'bg-slate-700 text-white' },
	{ key: 'open', labelKey: 'events.filterOpen', active: 'bg-warning text-slate-900' },
	{
		key: 'in_progress',
		labelKey: 'events.filterInProgress',
		active: 'bg-success text-slate-900',
	},
	{ key: 'completed', labelKey: 'events.filterCompleted', active: 'bg-slate-500 text-white' },
	{ key: 'cancelled', labelKey: 'events.filterCancelled', active: 'bg-error text-white' },
]

export const EventFilterBar: React.FC<Props> = ({
	search,
	onSearchChange,
	status,
	onStatusChange,
	onlyMine,
	onOnlyMineChange,
	shown,
	total,
	onClear,
}) => {
	const { t } = useTranslation()
	const hasActiveFilters = search !== '' || status !== 'all' || onlyMine

	return (
		<div className="bg-slate-900/40 rounded-2xl p-3.5 space-y-3 shadow-sm shadow-black/20">
			<div className="relative">
				<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
					<Search className="w-3.5 h-3.5" />
				</span>
				<input
					type="text"
					value={search}
					onChange={e => onSearchChange(e.target.value)}
					placeholder={t('events.searchPlaceholder')}
					className="input input-sm pl-8.5 pr-8 w-full bg-slate-950 border-none text-white rounded-xl focus:ring-2 focus:ring-indigo-400/50 focus:outline-none placeholder-slate-500 text-[13px] h-8"
				/>
				{search && (
					<button
						onClick={() => onSearchChange('')}
						className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500 hover:text-slate-300"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex gap-0.5 bg-slate-950/60 p-0.5 rounded-full shadow-inner shadow-black/20 w-fit">
					{STATUS_OPTIONS.map(option => (
						<button
							key={option.key}
							onClick={() => onStatusChange(option.key)}
							className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
								status === option.key
									? option.active
									: 'text-slate-500 hover:text-slate-400'
							}`}
						>
							{t(option.labelKey)}
						</button>
					))}
				</div>

				<button
					onClick={() => onOnlyMineChange(!onlyMine)}
					className={`btn btn-xs h-7 px-2.5 border-none rounded-xl gap-1 text-[11px] font-bold shrink-0 ${
						onlyMine
							? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
							: 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
					}`}
				>
					<UserCheck className="w-3 h-3" />
					{t('events.filterOnlyMine')}
				</button>
			</div>

			{hasActiveFilters && (
				<div className="flex justify-between items-center pt-2 border-t border-slate-900/60">
					<span className="text-[11px] text-slate-500">
						{t('events.showingCount', { count: shown, total })}
					</span>
					<button
						onClick={onClear}
						className="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10 text-[11px] font-bold uppercase tracking-wider rounded-lg px-2 cursor-pointer"
					>
						<X className="w-3 h-3" />
						{t('events.filterClear')}
					</button>
				</div>
			)}
		</div>
	)
}
