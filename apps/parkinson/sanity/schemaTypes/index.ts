import type { SchemaTypeDefinition } from 'sanity'
import { attivita } from './attivita'
import { evento } from './evento'
import { impostazioni } from './impostazioni'
import { luogo } from './luogo'

export const schemaTypes: SchemaTypeDefinition[] = [attivita, evento, impostazioni, luogo]
