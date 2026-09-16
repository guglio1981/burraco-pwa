export const SITO = {
  nome: 'Associazione Parkinson «Rino Gangemi» ODV',
  nomeBreve: 'Parkinson Rino Gangemi ODV',
  comune: 'Delebio',
  provincia: 'SO',
  territorio: 'Bassa Valle, Valchiavenna e Alto Lario',
  descrizione:
    'Associazione di volontariato per le persone con Parkinson e le loro famiglie. Sede a Delebio (SO), attività in Bassa Valle, Valchiavenna e Alto Lario.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rinogangemi-preview.vercel.app',
  /** Il sito vero dell'associazione, che questa proposta non tocca. */
  sitoUfficiale: 'https://rinogangemiparkinson.org',
} as const

/**
 * Questa è una proposta parallela, non il sito dell'associazione.
 * Finché è così NON deve finire su Google: farebbe concorrenza
 * all'originale sulle stesse ricerche e confonderebbe chi cerca aiuto.
 *
 * Il valore predefinito è "anteprima". Per andare davvero online bisogna
 * impostare NEXT_PUBLIC_SITO_ANTEPRIMA=false di proposito: così una
 * dimenticanza lascia il sito nascosto, non esposto.
 */
export const ANTEPRIMA = process.env.NEXT_PUBLIC_SITO_ANTEPRIMA !== 'false'
