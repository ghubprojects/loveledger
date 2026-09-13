import { describe, expect, it } from 'vitest'
import { createSession, createState, decodeState, MAX_SCORE, parseScore, roundBalance, summarize } from './game'
import type { Round } from './game'

function round(scores: [number, number], pointValue = 1_000, rule: Round['rule'] = 'higher'): Round {
  return { id: crypto.randomUUID(), scores, pointValue, rule, createdAt: new Date().toISOString() }
}

describe('tính điểm và tiền', () => {
  it('tiền thắng và tiền thua luôn cân bằng, cho cả hai luật', () => {
    expect(roundBalance(round([10, 4]))).toBe(6_000)
    expect(roundBalance(round([10, 4], 2_000, 'lower'))).toBe(-12_000)
    expect(roundBalance(round([-5, 3], 1_000, 'lower'))).toBe(8_000)
    expect(roundBalance(round([8, 8]))).toBe(0)
  })
  it('đổi cài đặt không tính lại tiền các ván đã lưu', () => {
    const session = createSession()
    session.rounds = [round([10, 4]), round([3, 8], 2_000, 'lower'), round([2, 2])]
    session.settings.pointValue = 5_000
    session.settings.rule = 'lower'
    expect(summarize(session)).toEqual({ points: [15, 14], wins: [2, 0], draws: 1, balance: 16_000 })
  })
  it('sửa và xóa ván cập nhật lại toàn bộ tổng', () => {
    const session = createSession()
    session.rounds = [round([10, 4]), round([3, 8])]
    expect(summarize(session).balance).toBe(1_000)
    session.rounds[0].scores = [1, 4]
    expect(summarize(session).balance).toBe(-8_000)
    session.rounds.splice(1, 1)
    expect(summarize(session)).toEqual({ points: [1, 4], wins: [0, 1], draws: 0, balance: -3_000 })
  })
  it('mỗi buổi có cài đặt riêng', () => {
    const first = createSession()
    const second = createSession(first.settings)
    second.settings.players[0] = 'Anh'
    expect(first.settings.players[0]).toBe('Chồng')
    expect(first.id).not.toBe(second.id)
  })
})

describe('kiểm tra dữ liệu nhập và localStorage', () => {
  it('không biến ô trống hoặc giá trị sai thành một ván hợp lệ', () => {
    for (const value of ['', ' ', '1.5', 'NaN', 'Infinity', '1e3', '1,000', 'abc', String(MAX_SCORE + 1)]) expect(parseScore(value)).toBeNull()
    expect(parseScore('0')).toBe(0)
    expect(parseScore('-12')).toBe(-12)
    expect(parseScore(String(MAX_SCORE))).toBe(MAX_SCORE)
  })
  it('khôi phục đầy đủ các ván và buổi đang mở', () => {
    const state = createState()
    state.sessions[0].rounds.push(round([3, 5], 5_000, 'lower'))
    expect(decodeState(JSON.stringify(state))).toEqual(state)
  })
  it('từ chối dữ liệu hỏng, phiên bản lạ và buổi đang mở không tồn tại', () => {
    expect(() => decodeState('broken')).toThrow()
    expect(() => decodeState('{"version":1,"sessions":[]}')).toThrow()
    const state = createState()
    expect(() => decodeState(JSON.stringify({ ...state, version: 2 }))).toThrow()
    expect(() => decodeState(JSON.stringify({ ...state, activeSessionId: 'missing' }))).toThrow()
  })
  it('từ chối điểm vượt giới hạn và ID ván trùng', () => {
    const state = createState()
    const item = round([5, 7])
    state.sessions[0].rounds = [item, item]
    expect(() => decodeState(JSON.stringify(state))).toThrow()
    state.sessions[0].rounds = [round([MAX_SCORE + 1, 0])]
    expect(() => decodeState(JSON.stringify(state))).toThrow()
  })
})
