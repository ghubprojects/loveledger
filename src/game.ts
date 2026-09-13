export type Rule = 'higher' | 'lower'
export type Pair<T> = [T, T]
export interface Settings { players: Pair<string>; pointValue: number; rule: Rule }
export interface Round { id: string; scores: Pair<number>; pointValue: number; rule: Rule; createdAt: string }
export interface Session { id: string; title: string; createdAt: string; settings: Settings; rounds: Round[] }
export interface GameState { version: 1; activeSessionId: string; sessions: Session[] }

// Keep the original key so the LoveLedger rebrand preserves existing history.
export const STORAGE_KEY = 'so-bai-doi:v1'
export const MAX_SCORE = 100_000
export const MAX_RATE = 1_000_000
export const MAX_ROUNDS = 10_000
export const MAX_SESSIONS = 200
export const defaultSettings: Settings = { players: ['Chồng', 'Vợ'], pointValue: 1_000, rule: 'higher' }

export function createSession(settings: Settings = defaultSettings, title?: string): Session {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    title: title?.trim() || `Buổi chơi ${now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`,
    createdAt: now.toISOString(),
    settings: { ...settings, players: [...settings.players] },
    rounds: [],
  }
}

export function createState(): GameState {
  const session = createSession()
  return { version: 1, activeSessionId: session.id, sessions: [session] }
}

export function roundBalance(round: Pick<Round, 'scores' | 'rule' | 'pointValue'>): number {
  return (round.scores[0] - round.scores[1]) * round.pointValue * (round.rule === 'higher' ? 1 : -1)
}

export function summarize(session: Session) {
  return session.rounds.reduce((total, round) => {
    total.points[0] += round.scores[0]
    total.points[1] += round.scores[1]
    const balance = roundBalance(round)
    total.balance += balance
    if (balance > 0) total.wins[0]++
    if (balance < 0) total.wins[1]++
    if (balance === 0) total.draws++
    return total
  }, { points: [0, 0] as Pair<number>, wins: [0, 0] as Pair<number>, balance: 0, draws: 0 })
}

export const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value)
export const money = (value: number) => `${number(Math.abs(value))} ₫`
export const signedMoney = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(value)}`
export const ruleLabel = (rule: Rule) => rule === 'higher' ? 'Điểm cao thắng' : 'Điểm thấp thắng'

export function parseScore(value: string): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && Math.abs(parsed) <= MAX_SCORE ? parsed : null
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
const string = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
const validRule = (value: unknown): value is Rule => value === 'higher' || value === 'lower'
const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
function validSettings(value: unknown): value is Settings {
  return object(value) && Array.isArray(value.players) && value.players.length === 2 && value.players.every(name => string(name, 24))
    && value.players[0].trim().toLocaleLowerCase() !== value.players[1].trim().toLocaleLowerCase()
    && integer(value.pointValue, 1, MAX_RATE) && validRule(value.rule)
}

export function decodeState(raw: string): GameState {
  const value: unknown = JSON.parse(raw)
  if (!object(value) || value.version !== 1 || !Array.isArray(value.sessions) || value.sessions.length === 0 || value.sessions.length > MAX_SESSIONS) throw new Error('Dữ liệu không hợp lệ')
  const ids = new Set<string>()
  for (const session of value.sessions) {
    if (!object(session) || !string(session.id, 100) || ids.has(session.id) || !string(session.title, 60) || !validDate(session.createdAt)
      || !validSettings(session.settings) || !Array.isArray(session.rounds) || session.rounds.length > MAX_ROUNDS) throw new Error('Buổi chơi không hợp lệ')
    ids.add(session.id)
    const roundIds = new Set<string>()
    for (const round of session.rounds) {
      if (!object(round) || !string(round.id, 100) || roundIds.has(round.id) || !validDate(round.createdAt) || !validRule(round.rule)
        || !integer(round.pointValue, 1, MAX_RATE) || !Array.isArray(round.scores) || round.scores.length !== 2
        || !round.scores.every(score => integer(score, -MAX_SCORE, MAX_SCORE))) throw new Error('Ván chơi không hợp lệ')
      roundIds.add(round.id)
    }
  }
  if (typeof value.activeSessionId !== 'string' || !ids.has(value.activeSessionId)) throw new Error('Không tìm thấy buổi chơi')
  return value as unknown as GameState
}
