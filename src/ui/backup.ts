import type { BackupFile } from '../storage/types'

export function backupFilename(b: BackupFile): string {
  return `iron-ladder-backup-${b.exportedAt.slice(0, 10)}.json`
}

type BackupResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Hand the backup to the OS. On iPhone this opens the share sheet, where
 * "Mail" attaches the file (email it to yourself) or "Save to Files" drops it
 * in iCloud Drive. Elsewhere (or if sharing a file isn't supported) it falls
 * back to a normal download.
 *
 * Build the File synchronously and call share() with no awaits before it, so
 * iOS still treats it as part of the originating tap (a gesture requirement).
 */
export async function performBackup(backup: BackupFile): Promise<BackupResult> {
  const json = JSON.stringify(backup, null, 2)
  const name = backupFilename(backup)
  const nav = navigator as Navigator & {
    canShare?: (data?: { files?: File[] }) => boolean
  }

  try {
    const file = new File([json], name, { type: 'application/json' })
    if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      await nav.share({
        files: [file],
        title: 'Iron Ladder backup',
        text: 'My Iron Ladder workout backup.',
      })
      return 'shared'
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return 'cancelled'
    // any other share failure → fall through to download
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

/** Whole days since an ISO timestamp, or null if never. */
export function daysSince(iso: string | undefined): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
}
