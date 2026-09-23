import React from 'react'
import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'

interface Props {
	title: string
	message: string
	/** Etichetta dell'azione che conferma: dice cosa succede, non "Ok" */
	confirmLabel: string
	icon: LucideIcon
	/** Azione distruttiva: conferma in rosso invece che in arancione */
	danger?: boolean
	isSubmitting?: boolean
	onCancel: () => void
	onConfirm: () => void
}

/**
 * Conferma di un'azione irreversibile dentro la sezione eventi.
 * Sostituisce window.confirm, che mostrava l'URL del sito e non seguiva
 * nessuna delle convenzioni visive dell'app.
 */
export const ConfirmModal: React.FC<Props> = ({
	title,
	message,
	confirmLabel,
	icon: Icon,
	danger = false,
	isSubmitting = false,
	onCancel,
	onConfirm,
}) => {
	const { t } = useTranslation()

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-5"
			style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
			onClick={e => {
				if (e.target === e.currentTarget) onCancel()
			}}
		>
			<div className="w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
				<div className="px-6 pt-6 pb-4 border-b border-slate-800">
					<div className="flex items-center gap-2">
						<Icon
							className={`w-4 h-4 shrink-0 ${danger ? 'text-error' : 'text-indigo-400'}`}
						/>
						<h3 className="text-base font-bold text-white">{title}</h3>
					</div>
				</div>

				<div className="px-6 py-5">
					<p className="text-[13px] text-slate-400 leading-relaxed">{message}</p>
				</div>

				<div className="px-6 pb-6 flex gap-3">
					<button
						onClick={onCancel}
						disabled={isSubmitting}
						className="btn btn-ghost flex-1 border-none bg-slate-800/50 text-slate-300 hover:bg-slate-800"
					>
						{t('common.back')}
					</button>
					<button
						onClick={onConfirm}
						disabled={isSubmitting}
						className={`btn flex-1 font-bold border-none text-white shadow-lg ${
							danger
								? 'bg-error hover:bg-error/80'
								: 'bg-orange-500 hover:bg-orange-400'
						}`}
					>
						{isSubmitting ? (
							<span className="loading loading-spinner loading-xs" />
						) : (
							confirmLabel
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
