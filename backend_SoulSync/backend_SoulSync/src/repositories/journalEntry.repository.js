import { JournalEntry } from '../models/journalEntry.model.js';
import { BaseRepository } from './base.repository.js';

export const journalEntryRepository = new BaseRepository(JournalEntry);
