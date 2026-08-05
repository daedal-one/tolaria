import { useState } from 'react'
import { translate, type AppLocale } from '@/lib/i18n'
import { trackEvent } from '@/lib/telemetry'
import {
  listSourceSymbols,
  resolveSourceReference,
} from '@/utils/specs/api'
import type { ResolvedSource, SourceSymbol } from '@/utils/specs/types'

interface SourceSymbolPickerProps {
  specsDir: string
  locale: AppLocale
}

export function SourceSymbolPicker({ specsDir, locale }: SourceSymbolPickerProps) {
  const [path, setPath] = useState('')
  const [query, setQuery] = useState('')
  const [symbols, setSymbols] = useState<SourceSymbol[]>([])
  const [selected, setSelected] = useState<ResolvedSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadSymbols() {
    if (!path.trim()) return
    setLoading(true)
    setError(null)
    setSelected(null)
    try {
      const result = await listSourceSymbols(specsDir, path.trim(), query.trim())
      setSymbols(result)
      trackEvent('spec_source_symbols_loaded', { count: result.length })
    } catch (cause) {
      setSymbols([])
      setError(String(cause))
    } finally {
      setLoading(false)
    }
  }

  async function selectSymbol(symbol: SourceSymbol) {
    setError(null)
    try {
      setSelected(await resolveSourceReference(specsDir, symbol.reference))
    } catch (cause) {
      setError(String(cause))
    }
  }

  async function copyReference() {
    if (!selected) return
    await navigator.clipboard.writeText(selected.reference)
    trackEvent('spec_source_symbol_reference_copied', {
      language: selected.language ?? 'unknown',
    })
  }

  return (
    <details className="rounded border border-border bg-background/60 p-2" data-testid="source-symbol-picker">
      <summary className="cursor-pointer text-xs font-medium">
        {translate(locale, 'inspector.spec.symbols.title')}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          {translate(locale, 'inspector.spec.symbols.path')}
          <input
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder={translate(locale, 'inspector.spec.symbols.pathPlaceholder')}
            className="rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          {translate(locale, 'inspector.spec.symbols.query')}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </label>
        <button
          type="button"
          disabled={loading || !path.trim()}
          onClick={() => void loadSymbols()}
          className="self-start rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
        >
          {loading
            ? translate(locale, 'inspector.spec.symbols.loading')
            : translate(locale, 'inspector.spec.symbols.load')}
        </button>
        {error && <p role="alert" className="m-0 text-xs text-destructive">{error}</p>}
        {!loading && symbols.length === 0 && path && !error && (
          <p className="m-0 text-xs text-muted-foreground">
            {translate(locale, 'inspector.spec.symbols.empty')}
          </p>
        )}
        {symbols.length > 0 && (
          <div className="max-h-40 overflow-auto rounded border border-border" role="listbox">
            {symbols.map((symbol) => (
              <button
                type="button"
                role="option"
                aria-selected={selected?.reference === symbol.reference}
                key={`${symbol.reference}:${symbol.range.start.line}`}
                onClick={() => void selectSymbol(symbol)}
                className="flex w-full items-start justify-between gap-2 border-b border-border px-2 py-1.5 text-left last:border-b-0 hover:bg-muted"
              >
                <span className="min-w-0 truncate font-mono text-[11px]">{symbol.qualified_name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{symbol.kind}</span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="flex flex-col gap-1.5 rounded border border-border bg-muted/30 p-2">
            <code className="break-all text-[10px]">{selected.reference}</code>
            <pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap text-[10px]">{selected.snippet}</pre>
            <button
              type="button"
              onClick={() => void copyReference()}
              className="self-start rounded border border-border px-2 py-1 text-xs hover:bg-muted"
            >
              {translate(locale, 'inspector.spec.symbols.copy')}
            </button>
          </div>
        )}
      </div>
    </details>
  )
}
