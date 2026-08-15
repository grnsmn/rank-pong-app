import React from 'react'
import { Trophy, User } from 'lucide-react'
import type { Profile } from '../../services/db'
import { TruncatedName } from './TruncatedName'

interface Props {
	topThree: Profile[]
	onPlayerSelect?: (playerId: string) => void
}

const RANK_CONFIG: Record<
	1 | 2 | 3,
	{
		avatarSize: string
		ring: string
		iconSize: string
		stepHeight: string
		stepBg: string
		stepText: string
		nameColor: string
		nameSize: string
	}
> = {
	1: {
		avatarSize: 'w-20 h-20',
		ring: 'border-4 border-yellow-400',
		iconSize: 'w-8 h-8 text-yellow-500',
		stepHeight: 'h-24',
		stepBg: 'bg-gradient-to-b from-yellow-400 to-yellow-600',
		stepText: 'text-slate-900',
		nameColor: 'text-yellow-400',
		nameSize: 'text-sm font-extrabold',
	},
	2: {
		avatarSize: 'w-16 h-16',
		ring: 'border-[3px] border-slate-300',
		iconSize: 'w-6 h-6 text-slate-500',
		stepHeight: 'h-14',
		stepBg: 'bg-gradient-to-b from-slate-300 to-slate-400',
		stepText: 'text-slate-900',
		nameColor: 'text-slate-200',
		nameSize: 'text-xs font-bold',
	},
	3: {
		avatarSize: 'w-16 h-16',
		ring: 'border-[3px] border-amber-600',
		iconSize: 'w-6 h-6 text-slate-500',
		stepHeight: 'h-10',
		stepBg: 'bg-gradient-to-b from-amber-500 to-amber-700',
		stepText: 'text-white',
		nameColor: 'text-slate-200',
		nameSize: 'text-xs font-bold',
	},
}

const COLUMNS: { rank: 1 | 2 | 3; playerIndex: number }[] = [
	{ rank: 2, playerIndex: 1 },
	{ rank: 1, playerIndex: 0 },
	{ rank: 3, playerIndex: 2 },
]

export const PodiumSection: React.FC<Props> = ({ topThree, onPlayerSelect }) => {
	if (topThree.length === 0) return null

	return (
		<div className="flex items-end justify-center gap-2 pt-8 px-2 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/50 to-slate-900/10 overflow-hidden">
			{COLUMNS.map(({ rank, playerIndex }) => {
				const player = topThree[playerIndex]
				if (!player) return <div key={rank} className="w-1/3" />

				const cfg = RANK_CONFIG[rank]

				return (
					<div
						key={player.id}
						className="flex flex-col items-center w-1/3 cursor-pointer"
						onClick={() => onPlayerSelect?.(player.id)}
					>
						<div className="relative mb-2">
							{rank === 1 && (
								<Trophy className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 text-yellow-400 fill-yellow-400/20" />
							)}
							<div
								className={`${cfg.avatarSize} rounded-full overflow-hidden bg-slate-800 flex items-center justify-center ${cfg.ring}`}
							>
								{player.avatar_url ? (
									<img
										src={player.avatar_url}
										alt=""
										className="w-full h-full object-cover"
									/>
								) : (
									<User className={cfg.iconSize} />
								)}
							</div>
						</div>

						<TruncatedName
							text={player.display_name}
							className={`text-center ${cfg.nameSize} ${cfg.nameColor}`}
							wrapperClassName="mb-0.5"
							block
						/>
						<TruncatedName
							text={`@${player.username}`}
							className="text-center text-[10px] text-slate-400"
							wrapperClassName="mb-2"
							block
						/>

						<div
							className={`w-full ${cfg.stepHeight} rounded-t-xl ${cfg.stepBg} flex items-start justify-center pt-1.5`}
						>
							<span className={`text-xl font-black ${cfg.stepText}`}>{rank}</span>
						</div>
					</div>
				)
			})}
		</div>
	)
}
