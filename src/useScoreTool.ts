import { useEffect, useRef } from 'react'
import { summarize } from './game'
import type { Session } from './game'

interface ModelContext {
  registerTool(tool: {
    name: string
    title: string
    description: string
    inputSchema: object
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }
    execute: (input: unknown) => unknown
  }, options: { signal: AbortSignal }): void | Promise<void>
}

// Optional progressive enhancement; browsers without WebMCP use the normal UI.
export function useScoreTool(session: Session) {
  const current = useRef(session)
  useEffect(() => { current.current = session }, [session])
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    try {
      void Promise.resolve(context.registerTool({
        name: 'get_current_score',
        title: 'Xem điểm buổi chơi hiện tại',
        description: 'Read the current session, player scores, wins, and net amounts in VND. Does not modify or settle any records.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length > 0) throw new Error('Expected an empty object')
          const session = current.current
          const summary = summarize(session)
          return { title: session.title, players: session.settings.players, rounds: session.rounds.length, scores: summary.points,
            wins: summary.wins, draws: summary.draws, netVnd: [summary.balance, -summary.balance] }
        },
      }, { signal: lifecycle.signal })).catch(() => { /* Native UI remains available. */ })
    } catch { /* Unsupported implementations must not interrupt scorekeeping. */ }
    return () => lifecycle.abort()
  }, [])
}
