import React from 'react'
import type { Profile } from '../../services/db'

interface PlayerPickerProps {
	containerRef: React.RefObject<HTMLDivElement | null>
	label: string
	placeholder: string
	searchValue: string
	onSearchChange: (value: string) => void
	showDropdown: boolean
	onFocus: () => void
	profiles: Profile[]
	selectedId: string
	onSelect: (id: string) => void
	noResultsLabel: string
	eloLabel: string
}

export const PlayerPicker: React.FC<PlayerPickerProps> = ({
	containerRef,
	label,
	placeholder,
	searchValue,
	onSearchChange,
	showDropdown,
	onFocus,
	profiles,
	selectedId,
	onSelect,
	noResultsLabel,
	eloLabel,
}) => {
	return (
		<div className="form-control w-full p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20">
			<label className="label py-1">
				<span className="label-text text-xs text-slate-300 font-bold tracking-wide">
					{label}
				</span>
			</label>
			<div ref={containerRef} className="relative mt-1">
				<input
					type="text"
					className="input input-sm w-full bg-slate-950/70 border-none text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder-slate-500 text-xs h-9 pl-3"
					placeholder={placeholder}
					value={searchValue}
					onChange={e => onSearchChange(e.target.value)}
					onFocus={onFocus}
				/>
				{showDropdown && (
					<ul className="absolute z-50 w-full mt-1.5 bg-slate-800 rounded-xl shadow-xl shadow-black/40 max-h-48 overflow-y-auto hide-scrollbar">
						{profiles.length === 0 ? (
							<li className="px-3 py-2 text-xs text-slate-500">{noResultsLabel}</li>
						) : (
							profiles.map(p => (
								<li
									key={p.id}
									className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-700 ${selectedId === p.id ? 'text-primary' : 'text-white'}`}
									onMouseDown={() => onSelect(p.id)}
								>
									<span>
										{p.display_name}{' '}
										<span className="text-slate-400 text-xs">
											@{p.username}
										</span>
									</span>
									<span className="text-xs text-slate-400 ml-2 shrink-0">
										{p.elo_rating} {eloLabel}
									</span>
								</li>
							))
						)}
					</ul>
				)}
			</div>
		</div>
	)
}
