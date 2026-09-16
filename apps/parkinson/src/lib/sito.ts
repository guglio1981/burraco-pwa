export const SITO = {
  nome: 'Associazione Parkinson «Rino Gangemi» ODV',
  nomeBreve: 'Parkinson Rino Gangemi ODV',
  comune: 'Delebio',
  provincia: 'SO',
  territorio: 'Bassa Valle, Valchiavenna e Alto Lario',
  descrizione:
    'Associazione di volontariato per le persone con Parkinson e le loro famiglie. Sede a Delebio (SO), attività in Bassa Valle, Valchiavenna e Alto Lario.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rinogangemiparkinson.org',
} as const
