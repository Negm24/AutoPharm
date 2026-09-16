const en = {
  kiosk: {
    brandName: 'Pharma',
    terminalLabel: 'Terminal 04 \u2022 open 24h',
    subtitle: 'Buy over-the-counter items, collect a prescription, or tell us what hurts.',
    touchToStart: 'Touch anywhere to start',
    touchToStartAr: '\u0625\u0644\u0645\u0633 \u0644\u0644\u0628\u062f\u0626',
    status: {
      dispenserOnline: 'Dispenser online',
      pharmacistOnCall: 'Pharmacist on call',
      cardAccepted: 'Card & wallet accepted',
    },
    callPharmacist: 'Call pharmacist',
    emergency: 'Emergency? Dial 997 \u2014 this kiosk cannot help in an emergency',
    startOver: 'Start over',
    footerTerminal: 'Terminal 04 \u00b7 v2.4',
    search: 'Search',
    languageEnglish: 'English',
    languageArabic: '\u0639\u0631\u0628\u064a',
    menu: {
      welcome: 'Welcome to Al Waha Pharmacy',
      subtitle: 'Browse our services',
      demoBtn1: 'Browse medicines',
      demoBtn2: 'Search products',
    },
  },
} as const

export default en
export type TranslationSchema = typeof en
