/**
 * Liste di opzioni condivise fra gli schemi.
 * Regola del progetto: nessun campo a testo libero per i dati strutturati.
 * Chi redige sceglie sempre da un elenco o da un calendario.
 */

export const GIORNI = [
  { title: 'Lunedì', value: 'lunedi' },
  { title: 'Martedì', value: 'martedi' },
  { title: 'Mercoledì', value: 'mercoledi' },
  { title: 'Giovedì', value: 'giovedi' },
  { title: 'Venerdì', value: 'venerdi' },
  { title: 'Sabato', value: 'sabato' },
  { title: 'Domenica', value: 'domenica' },
] as const

/** Orari da 07:00 a 21:45, a passi di 15 minuti. */
export const ORARI: { title: string; value: string }[] = Array.from({ length: (22 - 7) * 4 }, (_, i) => {
  const ore = 7 + Math.floor(i / 4)
  const minuti = (i % 4) * 15
  const valore = `${String(ore).padStart(2, '0')}:${String(minuti).padStart(2, '0')}`
  return { title: valore, value: valore }
})

export const QUALIFICHE = [
  { title: 'Fisioterapista', value: 'Fisioterapista' },
  { title: 'Logopedista', value: 'Logopedista' },
  { title: 'Neurologo', value: 'Neurologo' },
  { title: 'Psicologo', value: 'Psicologo' },
  { title: 'Terapista occupazionale', value: 'Terapista occupazionale' },
  { title: 'Istruttore di ginnastica', value: 'Istruttore di ginnastica' },
  { title: 'Musicoterapeuta', value: 'Musicoterapeuta' },
  { title: 'Insegnante di canto', value: 'Insegnante di canto' },
  { title: 'Massoterapista', value: 'Massoterapista' },
  { title: 'Volontario dell’associazione', value: 'Volontario dell’associazione' },
] as const

export const DESTINATARI = [
  { title: 'Persone con Parkinson', value: 'persone-con-parkinson' },
  { title: 'Persone con Parkinson e familiari', value: 'persone-e-familiari' },
  { title: 'Familiari e caregiver', value: 'familiari-caregiver' },
  { title: 'Aperto a tutti', value: 'tutti' },
] as const

export const COMUNI = [
  { title: 'Delebio (SO)', value: 'Delebio' },
  { title: 'Traona (SO)', value: 'Traona' },
  { title: 'Morbegno (SO)', value: 'Morbegno' },
  { title: 'Cosio Valtellino (SO)', value: 'Cosio Valtellino' },
  { title: 'Chiavenna (SO)', value: 'Chiavenna' },
  { title: 'Novate Mezzola (SO)', value: 'Novate Mezzola' },
  { title: 'Colico (LC)', value: 'Colico' },
  { title: 'Dorio (LC)', value: 'Dorio' },
  { title: 'Dervio (LC)', value: 'Dervio' },
] as const

export const RUOLI_DIRETTIVO = [
  { title: 'Presidente', value: 'Presidente' },
  { title: 'Vicepresidente', value: 'Vicepresidente' },
  { title: 'Segretario', value: 'Segretario' },
  { title: 'Tesoriere', value: 'Tesoriere' },
  { title: 'Consigliere', value: 'Consigliere' },
] as const

export const TIPI_DOCUMENTO = [
  { title: 'Statuto', value: 'statuto' },
  { title: 'Bilancio', value: 'bilancio' },
  { title: 'Relazione di missione', value: 'relazione' },
  { title: 'Altro documento', value: 'altro' },
] as const
