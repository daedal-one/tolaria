import { useEffect, useState } from 'react'
import type { VaultEntry } from '../types'
import { hasAuxRootEntries } from '../utils/specs/auxRootsConfig'
import { resolveAuxRoots } from '../utils/specs/api'

interface SpecRootResolution {
  hasRoots: boolean
  vaultPath: string
}

export function useHasSpecRoots(vaultPath: string | undefined, entries: VaultEntry[]): boolean {
  const path = vaultPath?.trim() ?? ''
  const [resolution, setResolution] = useState<SpecRootResolution>({
    hasRoots: false,
    vaultPath: '',
  })

  useEffect(() => {
    if (!path) return
    let cancelled = false

    void resolveAuxRoots(path)
      .then((roots) => {
        if (!cancelled) setResolution({ hasRoots: roots.length > 0, vaultPath: path })
      })
      .catch(() => {
        if (!cancelled) setResolution({ hasRoots: false, vaultPath: path })
      })

    return () => { cancelled = true }
  }, [path])

  const hasResolvedRoots = resolution.vaultPath === path && resolution.hasRoots
  return hasResolvedRoots || hasAuxRootEntries(entries)
}
