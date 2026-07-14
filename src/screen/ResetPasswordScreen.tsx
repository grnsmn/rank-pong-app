import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import { useFormState } from '../hooks/useFormState'

export const ResetPasswordScreen: React.FC = () => {
	const { t } = useTranslation()
	const { updatePassword, setRecoveryMode, error } = useAppStore()
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')

	const {
		formError: localError,
		successMsg,
		setFormError: setLocalError,
		setSuccessMsg,
		clearMessages,
	} = useFormState()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		clearMessages()

		if (!password || !confirm) {
			setLocalError(t('resetPassword.errorFillAll'))
			return
		}
		if (password.length < 6) {
			setLocalError(t('resetPassword.errorTooShort'))
			return
		}
		if (password !== confirm) {
			setLocalError(t('resetPassword.errorMismatch'))
			return
		}

		try {
			await updatePassword(password)
			setSuccessMsg(t('resetPassword.success'))
			// Piccolo delay per far leggere il messaggio, poi entra nell'app.
			// updatePassword ha già azzerato recoveryMode e caricato il profilo.
		} catch (err: any) {
			setLocalError(err.message || t('resetPassword.errorFillAll'))
		}
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-base-100">
			<div className="w-full max-w-md p-6 rounded-2xl bg-neutral shadow-xl border border-slate-700/50">
				{/* Intestazione Logo */}
				<div className="flex flex-col items-center mb-6">
					<div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
						<span className="text-white text-3xl font-extrabold">RP</span>
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-white mb-1">
						{t('resetPassword.title')}
					</h1>
					<p className="text-xs text-slate-400">{t('resetPassword.subtitle')}</p>
				</div>

				{/* Messaggi di feedback */}
				{(error || localError) && (
					<div className="alert alert-error shadow-sm mb-4 text-sm py-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="stroke-current shrink-0 h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{localError || error}</span>
					</div>
				)}

				{successMsg && (
					<div className="alert alert-success shadow-sm mb-4 text-sm py-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="stroke-current shrink-0 h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{successMsg}</span>
					</div>
				)}

				{/* Form nuova password */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="form-control">
						<label className="label py-1">
							<span className="label-text text-xs text-slate-300 font-medium">
								{t('resetPassword.newPasswordLabel')}
							</span>
						</label>
						<input
							type="password"
							placeholder={t('resetPassword.newPasswordPlaceholder')}
							className="input input-bordered input-sm w-full bg-slate-800 text-white focus:input-primary"
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
						/>
					</div>

					<div className="form-control">
						<label className="label py-1">
							<span className="label-text text-xs text-slate-300 font-medium">
								{t('resetPassword.confirmPasswordLabel')}
							</span>
						</label>
						<input
							type="password"
							placeholder={t('resetPassword.confirmPasswordPlaceholder')}
							className="input input-bordered input-sm w-full bg-slate-800 text-white focus:input-primary"
							value={confirm}
							onChange={e => setConfirm(e.target.value)}
							required
						/>
					</div>

					<button
						type="submit"
						className="btn btn-primary btn-sm w-full mt-6 text-white font-bold uppercase tracking-wider"
					>
						{t('resetPassword.submitButton')}
					</button>
				</form>

				<div className="divider text-xs text-slate-500 my-4">{t('login.or')}</div>

				<button
					onClick={() => setRecoveryMode(false)}
					className="btn btn-sm w-full font-semibold btn-ghost text-slate-300 hover:text-white"
				>
					{t('login.backToLogin')}
				</button>
			</div>
		</div>
	)
}
