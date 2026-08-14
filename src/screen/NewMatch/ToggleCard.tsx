import React from 'react'
import type { LucideIcon } from 'lucide-react'

type Accent = 'purple' | 'emerald'

const ACCENT_STYLES: Record<Accent, { active: string; switchOn: string }> = {
	purple: {
		active: 'bg-purple-950/30 text-purple-300 shadow-lg shadow-purple-500/10',
		switchOn: 'bg-purple-500',
	},
	emerald: {
		active: 'bg-emerald-950/30 text-emerald-300 shadow-lg shadow-emerald-500/10',
		switchOn: 'bg-emerald-500',
	},
}

interface ToggleCardProps {
	icon: LucideIcon
	label: string
	description: string
	checked: boolean
	onChange: () => void
	accent: Accent
}

export const ToggleCard: React.FC<ToggleCardProps> = ({
	icon: Icon,
	label,
	description,
	checked,
	onChange,
	accent,
}) => {
	const accentStyles = ACCENT_STYLES[accent]

	return (
		<button
			type="button"
			onClick={onChange}
			className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
				checked
					? accentStyles.active
					: 'bg-slate-900/60 text-slate-400 shadow-sm shadow-black/20 hover:bg-slate-800/60'
			}`}
		>
			<Icon className="w-4 h-4 shrink-0" />
			<div className="flex-1 text-left">
				<span className="text-xs font-bold block">{label}</span>
				<span className="text-[10px] opacity-70">{description}</span>
			</div>
			<div
				className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${checked ? accentStyles.switchOn : 'bg-slate-700'}`}
			>
				<div
					className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
				/>
			</div>
		</button>
	)
}
