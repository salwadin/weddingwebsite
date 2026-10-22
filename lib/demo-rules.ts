// Pure rules for keeping the interactive demo sealed off. No server-only imports,
// so tests can check them directly.

/**
 * Outbox rows the demo must never email: anything from the demo wedding (visitors
 * can type any address into it) and anything to example.com, the reserved domain
 * every sample guest, vendor and account uses (including
 * subdomains like noorlight.example.com).
 */
export function isDemoOutboxRow(row: { wedding_id: string | null; recipient: string }, demoWeddingId: string) {
  return row.wedding_id === demoWeddingId || /@([a-z0-9-]+\.)*example\.com$/i.test(row.recipient.trim());
}
