import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import it from './locales/it'

i18n.use(initReactI18next).init({
	lng: 'it',
	fallbackLng: 'it',
	resources: {
		it: { translation: it },
	},
	interpolation: {
		escapeValue: false,
	},
})

export default i18n
