export type Status = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type Region = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTRAL' | 'NORTHEAST';

/** A clean, normalised order. Every messy-data rule from data-notes.md is already applied. */
export interface Order {
  id: string;
  /** Position in the source file. Used for stable ordering. */
  seq: number;
  customer: string;
  email: string;
  status: string;
  /** Rupees (paise already converted). null when the source value was unusable. */
  amount: number | null;
  /** Epoch ms (UTC). null when unusable. */
  createdAt: number | null;
  updatedAt: number | null;
  region: string;
  channel: string;
  /** 1 (highest) to 3 (lowest). null = no priority. */
  priority: number | null;
  paymentMethod: string;
  itemCount: number | null;
  /** Plain text. Never rendered as HTML. */
  notes: string;
  // Pre-computed lowercase keys: sorting and text filters then allocate nothing per keystroke.
  idKey: string;
  customerKey: string;
  emailKey: string;
  notesKey: string;
  /** Numeric part of the ID, used for sorting and compact URL encoding. */
  idNum: number | null;
}

export interface LoadStats {
  rawCount: number;
  duplicatesRemoved: number;
  skipped: number;
}
