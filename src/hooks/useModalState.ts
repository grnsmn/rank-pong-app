import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

interface ModalStateReturn<T> {
	modalData: T | null
	modalError: string | null
	isSubmitting: boolean
	open: (data: T) => void
	close: () => void
	setModalData: Dispatch<SetStateAction<T | null>>
	setModalError: (err: string | null) => void
	setIsSubmitting: (val: boolean) => void
}

export function useModalState<T>(): ModalStateReturn<T> {
	const [modalData, setModalData] = useState<T | null>(null)
	const [modalError, setModalError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const open = (data: T) => {
		setModalError(null)
		setModalData(data)
	}

	const close = () => {
		setModalData(null)
		setModalError(null)
		setIsSubmitting(false)
	}

	return {
		modalData,
		modalError,
		isSubmitting,
		open,
		close,
		setModalData,
		setModalError,
		setIsSubmitting,
	}
}
