import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, Club, Equal, Heart, History, Minus, Pencil, Plus, Settings2, ShieldCheck, Trash2, Trophy, X } from 'lucide-react'
import { createSession, MAX_RATE, MAX_ROUNDS, MAX_SCORE, MAX_SESSIONS, money, number, parseScore, roundBalance, ruleLabel, signedMoney, summarize } from './game'
import type { Pair, Round, Rule, Session, Settings } from './game'
import { useGame } from './useGame'
import { useScoreTool } from './useScoreTool'

const dateLabel = (date: string) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeLabel = (date: string) => new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = oldOverflow }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal-inner"><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>{children}</div>
  </dialog>
}

function SettingsForm({ session, isNew, onSave, onClose }: { session: Session; isNew: boolean; onSave: (settings: Settings, title: string) => void; onClose: () => void }) {
  const [names, setNames] = useState<Pair<string>>([...session.settings.players])
  const [rate, setRate] = useState(String(session.settings.pointValue))
  const [rule, setRule] = useState<Rule>(session.settings.rule)
  const [title, setTitle] = useState(isNew ? createSession().title : session.title)
  const [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    const players: Pair<string> = [names[0].trim(), names[1].trim()]
    if (!players[0] || !players[1] || players[0].toLocaleLowerCase() === players[1].toLocaleLowerCase()) { setError('Nhập hai tên khác nhau để dễ phân biệt nhé.'); return }
    const pointValue = Number(rate)
    if (!/^\d+$/.test(rate) || !Number.isSafeInteger(pointValue) || pointValue < 1 || pointValue > MAX_RATE) { setError(`Tiền mỗi điểm phải từ 1 đến ${number(MAX_RATE)} đồng.`); return }
    if (!title.trim()) { setError('Hãy đặt tên cho buổi chơi.'); return }
    onSave({ players, pointValue, rule }, title.trim())
  }
  return <form onSubmit={submit} className="settings-form">
    <label>Tên buổi chơi<input autoFocus maxLength={60} value={title} onChange={e => setTitle(e.target.value)} required /></label>
    <div className="two-fields">{names.map((name, index) => <label key={index}>Người chơi {index + 1}<input maxLength={24} required value={name} onChange={e => setNames(index === 0 ? [e.target.value, names[1]] : [names[0], e.target.value])} /></label>)}</div>
    <label>Tiền mỗi điểm<div className="input-suffix"><input inputMode="numeric" value={rate} onChange={e => setRate(e.target.value)} required /><span>₫ / điểm</span></div></label>
    <div className="rate-presets">{[1_000, 2_000, 5_000, 10_000].map(value => <button key={value} type="button" className={Number(rate) === value ? 'selected' : ''} onClick={() => setRate(String(value))}>{number(value)} ₫</button>)}</div>
    <fieldset><legend>Cách tính thắng thua</legend><div className="rule-options">{(['higher', 'lower'] as const).map(value => <label key={value} className={rule === value ? 'selected' : ''}><input type="radio" name="rule" value={value} checked={rule === value} onChange={() => setRule(value)} />{ruleLabel(value)}</label>)}</div></fieldset>
    {!isNew && session.rounds.length > 0 && <p className="form-hint">Mức tiền và luật mới chỉ áp dụng cho các ván ghi sau. Các ván đã lưu giữ nguyên cách tính.</p>}
    {isNew && <p className="form-hint">Buổi hiện tại vẫn được giữ trong lịch sử. Bạn có thể mở lại bất cứ lúc nào.</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Hủy</button><button type="submit" className="button primary"><Check size={17} />{isNew ? 'Bắt đầu buổi mới' : 'Lưu cài đặt'}</button></div>
  </form>
}

function RoundForm({ session, editing, onSave, onCancel }: { session: Session; editing: Round | null; onSave: (scores: Pair<number>) => boolean; onCancel: () => void }) {
  const [scores, setScores] = useState<Pair<string>>(editing ? editing.scores.map(String) as Pair<string> : ['', ''])
  const [error, setError] = useState('')
  const firstInput = useRef<HTMLInputElement>(null)
  const parsed: Pair<number | null> = [parseScore(scores[0]), parseScore(scores[1])]
  const rate = editing?.pointValue ?? session.settings.pointValue
  const rule = editing?.rule ?? session.settings.rule
  const ready = parsed[0] !== null && parsed[1] !== null
  const delta = ready ? roundBalance({ scores: parsed as Pair<number>, pointValue: rate, rule }) : 0
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready) { setError(`Nhập điểm nguyên từ −${number(MAX_SCORE)} đến ${number(MAX_SCORE)} cho cả hai người.`); return }
    if (onSave(parsed as Pair<number>)) {
      setScores(['', '']); setError(''); firstInput.current?.focus()
    }
  }
  function adjust(index: number, amount: number) {
    const next = Math.max(-MAX_SCORE, Math.min(MAX_SCORE, (parseScore(scores[index]) ?? 0) + amount))
    setScores(index === 0 ? [String(next), scores[1]] : [scores[0], String(next)])
  }
  return <section className="panel entry-panel" id="ghi-diem">
    <div className="section-heading"><div className="heading-with-icon"><span className="small-icon"><Plus size={20} /></span><h2>{editing ? 'Sửa điểm' : 'Ghi ván mới'}</h2></div><span className="round-tag">VÁN {editing ? session.rounds.findIndex(r => r.id === editing.id) + 1 : session.rounds.length + 1}</span></div>
    <form onSubmit={submit} noValidate>
      <div className="score-fields">{session.settings.players.map((name, index) => <div className={`score-field player-${index}`} key={index}>
        <label htmlFor={`score-${index}`}><span className="suit">{index === 0 ? '♣' : '♥'}</span>{name}</label>
        <div className="stepper"><button type="button" aria-label={`Giảm điểm ${name}`} onClick={() => adjust(index, -1)}><Minus size={18} /></button><input ref={index === 0 ? firstInput : undefined} id={`score-${index}`} aria-label={`Điểm ${name}`} inputMode="numeric" autoComplete="off" type="text" placeholder="0" value={scores[index]} maxLength={7} onChange={e => { setScores(index === 0 ? [e.target.value, scores[1]] : [scores[0], e.target.value]); setError('') }} /><button type="button" aria-label={`Tăng điểm ${name}`} onClick={() => adjust(index, 1)}><Plus size={18} /></button></div>
        <span className="input-caption">điểm ván này</span>
      </div>)}</div>
      <div className="round-preview" aria-live="polite">{ready ? delta === 0 ? <><Equal size={17} /><span>Ván hòa · không phát sinh tiền</span></> : <><ArrowRight size={17} /><span><strong>{session.settings.players[delta > 0 ? 0 : 1]}</strong> thắng <strong>{money(delta)}</strong></span></> : <><Equal size={17} /><span>Nhập điểm của hai người để tính tiền</span></>}</div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="button primary save-round" type="submit">{editing ? <Check size={19} /> : <Plus size={19} />}{editing ? 'Lưu thay đổi' : 'Lưu điểm ván này'}<span aria-hidden="true">↵</span></button>
      {editing && <button type="button" className="text-button cancel-edit" onClick={onCancel}>Hủy chỉnh sửa</button>}
      <p className="entry-footnote">{money(rate)} / điểm <span>·</span> {ruleLabel(rule)}</p>
    </form>
  </section>
}

export default function App() {
  const { state, commit, error, clearError } = useGame()
  const session = state.sessions.find(item => item.id === state.activeSessionId)!
  useScoreTool(session)
  const stats = summarize(session)
  const [modal, setModal] = useState<'settings' | 'new' | 'history' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = session.rounds.find(round => round.id === editingId) ?? null
  const [deleting, setDeleting] = useState<Round | null>(null)
  const [toast, setToast] = useState('')
  const [showAll, setShowAll] = useState(false)
  const rounds = session.rounds.map((round, index) => ({ ...round, index })).reverse()
  const visibleRounds = showAll ? rounds : rounds.slice(0, 8)

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3_000); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { setEditingId(null); setShowAll(false); setDeleting(null) }, [session.id])
  function updateSession(update: (current: Session) => Session) {
    return commit(current => ({ ...current, sessions: current.sessions.map(item => item.id === session.id ? update(item) : item) }))
  }
  function saveRound(scores: Pair<number>) {
    if (!editing && session.rounds.length >= MAX_ROUNDS) { setToast('Buổi này đã đủ 10.000 ván. Hãy tạo buổi chơi mới.'); return false }
    const saved = updateSession(current => ({ ...current, rounds: editing ? current.rounds.map(round => round.id === editing.id ? { ...round, scores } : round)
      : [...current.rounds, { id: crypto.randomUUID(), scores, pointValue: current.settings.pointValue, rule: current.settings.rule, createdAt: new Date().toISOString() }] }))
    if (saved) { setEditingId(null); setToast(editing ? 'Đã cập nhật điểm và tiền.' : `Đã lưu ván ${session.rounds.length + 1}.`) }
    return saved
  }
  function saveSettings(settings: Settings, title: string) {
    if (modal === 'new' && state.sessions.length >= MAX_SESSIONS) { setToast('Đã đạt giới hạn 200 buổi chơi trên thiết bị này.'); return }
    const saved = modal === 'new' ? commit(current => { const next = createSession(settings, title); return { ...current, activeSessionId: next.id, sessions: [...current.sessions, next] } }) : updateSession(current => ({ ...current, settings, title }))
    if (saved) { setModal(null); setToast(modal === 'new' ? 'Bàn đã sẵn sàng. Chơi thôi!' : 'Đã lưu cài đặt.') }
  }

  return <>
    <header className="site-header"><div className="header-content"><a href="#" className="brand" aria-label="Sổ Bài Đôi — trang chính"><span className="brand-icon"><Heart size={22} fill="currentColor" strokeWidth={0} /></span><span>Sổ Bài Đôi<span className="brand-dot">.</span></span></a><div className="header-right"><span className="local-badge"><ShieldCheck size={16} />Lưu trên thiết bị</span><button className="button header-history" aria-label="Lịch sử buổi chơi" onClick={() => setModal('history')}><History size={18} /><span>Lịch sử buổi chơi</span></button></div></div></header>
    <main className="workspace">
      <div className="page-heading"><div><div className="eyebrow"><span className="tiny-suits">♣ <span>♥</span></span> GÓC CHƠI BÀI CỦA HAI NGƯỜI</div><h1>Bàn của hai mình</h1><div className="session-caption"><span>{session.title}</span><span className="separator">/</span><span>{dateLabel(session.createdAt)}</span></div></div><button className="button secondary new-session" onClick={() => setModal('new')}><Plus size={18} />Buổi chơi mới</button></div>
      {error && <div className="storage-error" role="alert"><p>{error}</p><button className="icon-button" aria-label="Đóng thông báo" onClick={clearError}><X size={18} /></button></div>}
      <div className="board-layout"><div className="board-column">
        <section className="scoreboard" aria-label="Tổng điểm và tiền của buổi chơi"><div className="board-topline"><span>TỈ SỐ HIỆN TẠI</span><span className="board-rounds"><Club size={14} />{number(session.rounds.length)} ván đã chơi</span></div>
          <div className="players">{session.settings.players.map((name, index) => {
            const balance = index === 0 ? stats.balance : -stats.balance
            return <div className={`player player-${index}`} key={index}><div className="player-name"><span className="avatar">{index === 0 ? <Club size={20} fill="currentColor" /> : <Heart size={20} fill="currentColor" />}</span><h2>{name}</h2>{balance > 0 && <Trophy className="leading-icon" size={17} aria-label="Đang dẫn tiền" />}</div><div className="total-score">{number(stats.points[index])}<span>điểm</span></div><div className={`player-balance ${balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'}`}>{balance > 0 ? <ArrowUpRight size={18} /> : balance < 0 ? <ArrowDownLeft size={18} /> : <Minus size={18} />}{signedMoney(balance)}</div><span className="win-count">Thắng {stats.wins[index]} ván</span></div>
          })}<span className="versus">VS</span></div>
          <div className="settlement"><span className="settlement-icon">{stats.balance === 0 ? <Equal size={21} /> : <ArrowRight size={21} />}</span><div><span className="settlement-label">CHỐT TIỀN HIỆN TẠI</span><p>{stats.balance === 0 ? session.rounds.length ? 'Đang hòa nhau, chưa ai nợ ai.' : 'Chưa ai nợ ai. Ván đầu thôi!' : <><strong>{session.settings.players[stats.balance > 0 ? 1 : 0]}</strong> trả <strong>{session.settings.players[stats.balance > 0 ? 0 : 1]}</strong></>}</p></div>{stats.balance !== 0 && <strong className="settlement-money">{money(stats.balance)}</strong>}</div>
        </section>
        <button className="rules-strip" onClick={() => setModal('settings')} aria-label="Cài đặt buổi chơi"><span className="rule-detail"><span className="rule-icon"><Settings2 size={18} /></span><span><strong>{money(session.settings.pointValue)}</strong> / điểm<span className="rule-divider">·</span>{ruleLabel(session.settings.rule)}</span></span><span className="change-rule">Cài đặt<ArrowRight size={16} /></span></button>
        <section className="panel history-panel"><div className="section-heading"><div className="heading-with-icon"><History size={20} /><h2>Các ván đã chơi</h2><span className="count-badge">{session.rounds.length}</span></div><span className="muted newest-label">Mới nhất trước</span></div>
          {rounds.length === 0 ? <div className="empty-rounds"><span className="empty-icon"><Club size={30} strokeWidth={1.4} /></span><h3>Chia bài rồi, ghi điểm thôi!</h3><p>Ván đầu tiên sẽ xuất hiện ở đây.<br />Mỗi ván đều có thể sửa hoặc xóa.</p></div> : <><div className="table-scroll"><table><thead><tr><th>Ván</th><th>{session.settings.players[0]}</th><th>{session.settings.players[1]}</th><th>Kết quả</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{visibleRounds.map(round => { const delta = roundBalance(round); return <tr key={round.id}><td><span className="round-number">{String(round.index + 1).padStart(2, '0')}</span><small>{timeLabel(round.createdAt)}</small></td><td className={delta > 0 ? 'winning-score' : ''}>{number(round.scores[0])}</td><td className={delta < 0 ? 'winning-score' : ''}>{number(round.scores[1])}</td><td><span className={`result-pill ${delta === 0 ? 'draw' : delta > 0 ? 'club' : 'heart'}`}>{delta === 0 ? 'Hòa' : <><span>{delta > 0 ? '♣' : '♥'}</span><span className="result-name">{session.settings.players[delta > 0 ? 0 : 1]}</span> +{money(delta)}</>}</span><small>{money(round.pointValue)}/đ · {round.rule === 'higher' ? 'Cao thắng' : 'Thấp thắng'}</small></td><td><div className="row-actions"><button className="icon-button" aria-label={`Sửa ván ${round.index + 1}`} title="Sửa ván" onClick={() => { setEditingId(round.id); document.getElementById('ghi-diem')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}><Pencil size={15} /></button><button className="icon-button delete-button" aria-label={`Xóa ván ${round.index + 1}`} title="Xóa ván" onClick={() => setDeleting(round)}><Trash2 size={15} /></button></div></td></tr> })}</tbody></table></div>{rounds.length > 8 && <button className="show-more" onClick={() => setShowAll(!showAll)}>{showAll ? 'Thu gọn' : `Xem tất cả ${rounds.length} ván`}<ChevronDown size={16} className={showAll ? 'rotated' : ''} /></button>}<div className="history-footer"><CheckCheck size={15} />Đã lưu {session.rounds.length} ván<span>{stats.draws} ván hòa</span></div></>}
        </section>
      </div><aside className="entry-column"><RoundForm key={`${session.id}-${editing?.id ?? 'new'}`} session={session} editing={editing} onSave={saveRound} onCancel={() => setEditingId(null)} /><div className="how-it-works"><span className="small-icon"><Equal size={18} /></span><div><h3>Tính tiền thật đơn giản</h3><p>Chênh lệch điểm × tiền mỗi điểm.<br />Ví dụ chênh 5 điểm = <strong>{money(5 * session.settings.pointValue)}</strong>.</p><p className="local-note">Dữ liệu chỉ lưu trên trình duyệt này, chưa đồng bộ giữa các thiết bị.</p></div></div></aside></div>
      <footer className="site-footer"><span>Sổ Bài Đôi <Heart size={12} /> Hai người, một cuốn sổ.</span><span>Chơi vui, ghi điểm gọn.</span></footer>
    </main>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    {(modal === 'settings' || modal === 'new') && <Modal title={modal === 'new' ? 'Bắt đầu buổi chơi mới' : 'Cài đặt buổi chơi'} onClose={() => setModal(null)}><SettingsForm session={session} isNew={modal === 'new'} onSave={saveSettings} onClose={() => setModal(null)} />{error && <p className="field-error" role="alert">{error}</p>}</Modal>}
    {modal === 'history' && <Modal title="Lịch sử buổi chơi" onClose={() => setModal(null)}><p className="modal-description">Mở một buổi để xem điểm hoặc chơi tiếp.</p><div className="session-list">{[...state.sessions].reverse().map(item => { const total = summarize(item); return <button key={item.id} className={`session-item ${item.id === session.id ? 'active' : ''}`} onClick={() => { if (commit(current => ({ ...current, activeSessionId: item.id }))) setModal(null) }}><span className="session-item-icon"><Club size={20} /></span><span className="session-item-body"><strong>{item.title}</strong><small>{dateLabel(item.createdAt)} · {item.rounds.length} ván</small><span>{item.settings.players.join(' & ')}</span></span><span className="session-item-result">{item.id === session.id && <span className="active-label">Đang mở</span>}<strong>{total.balance === 0 ? 'Hòa' : `${item.settings.players[total.balance > 0 ? 0 : 1]} +${money(total.balance)}`}</strong><ArrowRight size={17} /></span></button> })}</div>{error && <p className="field-error" role="alert">{error}</p>}</Modal>}
    {deleting && <Modal title={`Xóa ván ${session.rounds.findIndex(round => round.id === deleting.id) + 1}?`} onClose={() => setDeleting(null)}><p className="modal-description">Điểm và tiền của ván này sẽ được trừ khỏi tổng buổi chơi. Thao tác này không thể hoàn tác.</p><div className="modal-actions"><button className="button secondary" onClick={() => setDeleting(null)}>Giữ lại</button><button className="button danger" onClick={() => { if (updateSession(current => ({ ...current, rounds: current.rounds.filter(round => round.id !== deleting.id) }))) { if (editingId === deleting.id) setEditingId(null); setDeleting(null); setToast('Đã xóa ván và tính lại tổng.') } }}><Trash2 size={17} />Xóa ván</button></div>{error && <p className="field-error" role="alert">{error}</p>}</Modal>}
  </>
}
