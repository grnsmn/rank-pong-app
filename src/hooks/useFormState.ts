import { useState } from 'react'

interface FormStateReturn {
	isSaving: boolean
	formError: string | null
	successMsg: string | null
	setFormError: (err: string | null) => void
	setSuccessMsg: (msg: string | null) => void
	setIsSaving: (val: boolean) => void
	showSuccess: (msg: string, ms?: number) => void
	clearMessages: () => void
}

export function useFormState(): FormStateReturn {
	const [isSaving, setIsSaving] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)
	const [successMsg, setSuccessMsg] = useState<string | null>(null)

	const showSuccess = (msg: string, ms = 3000) => {
		setSuccessMsg(msg)
		setTimeout(() => setSuccessMsg(null), ms)
	}

	const clearMessages = () => {
		setFormError(null)
		setSuccessMsg(null)
	}

	return {
		isSaving,
		formError,
		successMsg,
		setFormError,
		setSuccessMsg,
		setIsSaving,
		showSuccess,
		clearMessages,
	}
}
