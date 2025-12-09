import polyglotI18nProvider from 'ra-i18n-polyglot';
import bgMessages from './bg';

const i18nProvider = polyglotI18nProvider(() => bgMessages, 'bg', [
    { locale: 'bg', name: 'Български' },
]);

export default i18nProvider;
