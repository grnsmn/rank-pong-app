import React from 'react'

export const PingPongLoader: React.FC = () => {
	return (
		<div className="relative w-44 h-20">
			<div className="absolute left-3 right-3 bottom-3 h-px bg-slate-700" />
			<div className="absolute left-1/2 bottom-3 w-px h-7 -translate-x-1/2 border-l border-dashed border-slate-500" />

			<svg
				viewBox="0 0 40 60"
				className="pingpong-paddle pingpong-paddle-left absolute left-0 top-1/2 w-8 h-12 -translate-y-1/2"
			>
				<rect x="16" y="36" width="8" height="22" rx="4" fill="#7c4a1e" />
				<ellipse
					cx="20"
					cy="20"
					rx="18"
					ry="20"
					fill="#dc2626"
					stroke="#0f172a"
					strokeWidth="3"
				/>
			</svg>

			<svg
				viewBox="0 0 40 60"
				className="pingpong-paddle pingpong-paddle-right absolute right-0 top-1/2 w-8 h-12 -translate-y-1/2"
			>
				<rect x="16" y="36" width="8" height="22" rx="4" fill="#7c4a1e" />
				<ellipse
					cx="20"
					cy="20"
					rx="18"
					ry="20"
					fill="#dc2626"
					stroke="#0f172a"
					strokeWidth="3"
				/>
			</svg>

			<div className="pingpong-hit pingpong-hit-left absolute left-3 top-1/2 -mt-2 w-4 h-4 rounded-full border-2 border-white/70" />
			<span className="pingpong-hit-text pingpong-hit-text-left absolute left-1 top-1 text-[9px] font-black text-orange-300">
				PING
			</span>

			<div className="pingpong-hit pingpong-hit-right absolute right-3 top-1/2 -mt-2 w-4 h-4 rounded-full border-2 border-white/70" />
			<span className="pingpong-hit-text pingpong-hit-text-right absolute right-1 top-1 text-[9px] font-black text-orange-300">
				PONG
			</span>

			<div className="pingpong-shadow absolute left-1/2 bottom-3 w-3 h-1.5 -ml-1.5 rounded-full bg-black/50 blur-[1px]" />

			<div className="pingpong-ball absolute left-1/2 top-1/2 w-3.5 h-3.5 -ml-[7px] -mt-[7px]">
				<div
					className="pingpong-ball-spin w-full h-full rounded-full shadow-md shadow-orange-500/40"
					style={{
						background:
							'radial-gradient(circle at 35% 30%, #fed7aa, #fb923c 55%, #c2410c 100%)',
					}}
				/>
			</div>
		</div>
	)
}
