import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Coffee, Copy, Crown, Link2, MapPin, Moon, Plus, Sandwich, Sparkles, Sunrise, Trash2, Utensils, Users, X } from 'lucide-react'
import type { EventPlan, EventTag, Person, Slot, Status } from './types'
import { addPerson, addTimeOption, bookEvent, createEvent, eventUrl, getEvent, isHost, makeId, saveResponse } from './store'

type Route = { page: 'home' } | { page: 'create' } | { page: 'event'; id: string }
const route = (): Route => {
  const parts = location.hash.slice(1).split('/').filter(Boolean)
  if (parts[0] === 'event' && parts[1]) return { page: 'event', id: parts[1] }
  if (parts[0] === 'create') return { page: 'create' }
  return { page: 'home' }
}

const fmtDate = (date: string) => new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`))
const fmtLong = (date: string) => new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`))
const fmtTime = (time: string) => new Date(`2020-01-01T${time}`).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
const tagOptions: { name: EventTag; icon: typeof Sunrise }[] = [
  { name: 'Sunrise', icon: Sunrise },
  { name: 'Morning', icon: Coffee },
  { name: 'Lunch', icon: Sandwich },
  { name: 'Dinner', icon: Utensils },
  { name: 'Late Hangs', icon: Moon },
]
function TagPicker({ selected, onChange }: { selected: EventTag[]; onChange: (tags: EventTag[]) => void }) {
  return <div className="tag-picker">{tagOptions.map(({ name, icon: Icon }) => <button key={name} className={selected.includes(name) ? 'active' : ''} onClick={() => onChange(selected.includes(name) ? selected.filter(tag => tag !== name) : [...selected, name])}><Icon /> {name}</button>)}</div>
}
function TimeTags({ tags = [] }: { tags?: EventTag[] }) {
  return tags.length ? <div className="time-tags">{tags.map(tag => { const option = tagOptions.find(item => item.name === tag); if (!option) return null; const Icon = option.icon; return <span key={tag}><Icon /> {tag}</span> })}</div> : null
}
const fmtRelativeDate = (date: string) => {
  const target = new Date(`${date}T12:00:00`)
  const today = new Date()
  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.round((targetDay - currentDay) / 86400000)
  const weekday = new Intl.DateTimeFormat('en-AU', { weekday: 'long' }).format(target)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow, 1 day from now'
  if (days > 1 && days < 7) return `Coming ${weekday}, ${days} days from now`
  if (days >= 7 && days < 14) return `Next ${weekday}, ${days} days from now`
  if (days === -1) return 'Yesterday, 1 day ago'
  if (days < 0) return `${Math.abs(days)} days ago`
  return `${days} days from now`
}

function Brand() {
  return <button className="brand" onClick={() => location.hash = ''}><span><Sparkles size={18} /></span> Gather</button>
}

function Header() {
  return <header><Brand /><span className="tagline">Make time, together.</span></header>
}

function Home() {
  return <main className="home">
    <section className="hero">
      <div className="eyebrow"><span className="pulse" /> Less planning. More gathering.</div>
      <h1>Find the time that<br /><em>works for everyone.</em></h1>
      <p className="hero-copy">Create an event, invite your people, and see the perfect time emerge — without the endless group chat.</p>
      <button className="primary big" onClick={() => location.hash = '/create'}>Create an event <ArrowRight size={19} /></button>
      <p className="micro">No account needed · Takes less than a minute</p>
    </section>
    <section className="how">
      <article><span>1</span><div><CalendarDays /><h3>Suggest some times</h3><p>Add a few options that work for you.</p></div></article>
      <article><span>2</span><div><Link2 /><h3>Share one simple link</h3><p>Everyone picks their name and responds.</p></div></article>
      <article><span>3</span><div><Check /><h3>Book the best time</h3><p>See the overlap and lock it in.</p></div></article>
    </section>
  </main>
}

function Create() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [title, setTitle] = useState('')
  const [creator, setCreator] = useState('')
  const [locationName, setLocationName] = useState('')
  const [note, setNote] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [personName, setPersonName] = useState('')
  const [slots, setSlots] = useState<Slot[]>([{ id: makeId(), date: tomorrow, start: '18:00', end: '19:30', tags: [] }])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const addPerson = () => {
    const name = personName.trim()
    if (!name || people.some(p => p.name.toLowerCase() === name.toLowerCase())) return
    setPeople([...people, { id: makeId(), name, optional: false, excluded: false }]); setPersonName('')
  }
  const create = async () => {
    if (!title.trim() || !creator.trim() || !people.length || !slots.length || slots.some(s => !s.date || !s.start || !s.end)) {
      setError('Add an event name, your name, at least one guest and one complete time option.'); return
    }
    const id = makeId()
    const host: Person = { id: makeId(), name: creator.trim(), optional: false, excluded: false }
    const hostAvailability = Object.fromEntries(slots.map(slot => [slot.id, 'available' as Status]))
    const plan: EventPlan = { id, title: title.trim(), creator: creator.trim(), location: locationName.trim(), note: note.trim(), people: [host, ...people], slots, responses: { [host.id]: hostAvailability }, createdAt: new Date().toISOString() }
    try {
      setCreating(true); setError('')
      await createEvent(plan)
      location.hash = `/event/${id}`
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the event.')
      setCreating(false)
    }
  }
  return <main className="create-shell">
    <button className="back" onClick={() => history.back()}><ArrowLeft size={17} /> Back</button>
    <div className="create-head"><div className="step">CREATE AN EVENT</div><h1>What are we planning?</h1><p>Start with the basics. You can share the invite as soon as you're done.</p></div>
    <div className="form-grid">
      <section className="card form-card">
        <h2><span className="icon-box coral"><Sparkles /></span> Event details</h2>
        <label>Event name <b>*</b><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sunday dinner, team offsite…" autoFocus /></label>
        <label>Your name <b>*</b><input value={creator} onChange={e => setCreator(e.target.value)} placeholder="How guests will see you" /></label>
        <label>Location <span>OPTIONAL</span><div className="input-icon"><MapPin /><input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Add a place or video link" /></div></label>
        <label>Note <span>OPTIONAL</span><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything your guests should know?" /></label>
      </section>
      <section className="card form-card">
        <h2><span className="icon-box blue"><Users /></span> Who's invited?</h2>
        <p className="section-copy">Add everyone you'd like to join. They'll choose their name when responding.</p>
        <div className="add-row"><input value={personName} onChange={e => setPersonName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} placeholder="Type a name" /><button onClick={addPerson}><Plus size={18} /> Add</button></div>
        <div className="people-list">{people.map(person => <div className="person" key={person.id}><span className="avatar">{person.name[0].toUpperCase()}</span><strong>{person.name}</strong><button className="icon-button" onClick={() => setPeople(people.filter(p => p.id !== person.id))}><X size={17} /></button></div>)}</div>
        {!people.length && <div className="empty-mini"><Users /><span>Your guest list will appear here</span></div>}
      </section>
      <section className="card form-card wide">
        <h2><span className="icon-box green"><CalendarDays /></span> Time options</h2>
        <p className="section-copy">Give everyone a few good options to choose from.</p>
        <div className="slots">{slots.map((slot, index) => <div className="slot-edit" key={slot.id}><span className="slot-num">{index + 1}</span><label>Date<input type="date" value={slot.date} onChange={e => setSlots(slots.map(s => s.id === slot.id ? { ...s, date: e.target.value } : s))} />{slot.date && <small className="date-preview">{fmtRelativeDate(slot.date)}</small>}</label><label>Starts<input type="time" value={slot.start} onChange={e => setSlots(slots.map(s => s.id === slot.id ? { ...s, start: e.target.value } : s))} /></label><label>Ends<input type="time" value={slot.end} onChange={e => setSlots(slots.map(s => s.id === slot.id ? { ...s, end: e.target.value } : s))} /></label><button className="icon-button trash" disabled={slots.length === 1} onClick={() => setSlots(slots.filter(s => s.id !== slot.id))}><Trash2 size={18} /></button><div className="slot-tags"><span>Vibe tags <small>OPTIONAL</small></span><TagPicker selected={slot.tags || []} onChange={tags => setSlots(slots.map(s => s.id === slot.id ? { ...s, tags } : s))} /></div></div>)}</div>
        <button className="secondary add-time" onClick={() => setSlots([...slots, { id: makeId(), date: tomorrow, start: '18:00', end: '19:30', tags: [] }])}><Plus size={17} /> Add another time</button>
      </section>
    </div>
    {error && <p className="error">{error}</p>}
    <div className="create-action"><button className="primary big" disabled={creating} onClick={create}>{creating ? 'Creating…' : 'Create & share'} {!creating && <ArrowRight size={19} />}</button></div>
  </main>
}

function StatusButton({ status, active, onClick }: { status: Status; active: boolean; onClick: () => void }) {
  const icons = { available: <Check />, tentative: <span>?</span>, unavailable: <X /> }
  const labels = { available: 'Available', tentative: 'If needed', unavailable: "Can't make it" }
  return <button className={`status ${status} ${active ? 'active' : ''}`} onClick={onClick}>{icons[status]}<span>{labels[status]}</span></button>
}

function EventPage({ id }: { id: string }) {
  const [event, setEvent] = useState<EventPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedPerson, setSelectedPerson] = useState('')
  const [newGuestName, setNewGuestName] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [draft, setDraft] = useState<Record<string, Status>>({})
  const [optional, setOptional] = useState(false)
  const [excluded, setExcluded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAddTime, setShowAddTime] = useState(false)
  const [newSlot, setNewSlot] = useState<{ date: string; start: string; end: string; tags: EventTag[] }>(() => ({ date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), start: '18:00', end: '19:30', tags: [] }))
  const [addingTime, setAddingTime] = useState(false)
  const host = isHost(id)

  useEffect(() => {
    setLoading(true)
    getEvent(id).then(setEvent).catch(cause => setLoadError(cause instanceof Error ? cause.message : 'Event not found')).finally(() => setLoading(false))
  }, [id])
  useEffect(() => {
    if (selectedPerson && event) {
      setDraft(event.responses[selectedPerson] || {})
      const person = event.people.find(person => person.id === selectedPerson)
      setOptional(person?.optional || false)
      setExcluded(person?.excluded || false)
    }
  }, [selectedPerson, event])
  const scores = useMemo(() => event?.slots.map(slot => {
    const required = event.people.filter(p => !p.optional && !p.excluded)
    const available = required.filter(p => event.responses[p.id]?.[slot.id] === 'available').length
    const blocked = required.filter(p => event.responses[p.id]?.[slot.id] === 'unavailable').length
    return { slot, available, blocked, total: required.length }
  }) || [], [event])
  if (loading) return <main className="not-found"><CalendarDays /><h1>Loading your event…</h1></main>
  if (!event) return <main className="not-found"><CalendarDays /><h1>We couldn't find that event</h1><p>{loadError || 'The invite link may be incorrect.'}</p><button className="primary" onClick={() => location.hash = ''}>Go home</button></main>

  const copy = async () => { await navigator.clipboard.writeText(eventUrl(id)); setCopied(true); setTimeout(() => setCopied(false), 1800) }
  const joinGuestList = async () => {
    const name = newGuestName.trim()
    if (!name) return
    try {
      setAddingGuest(true); setLoadError('')
      const result = await addPerson(id, name)
      setEvent(result.event)
      setSelectedPerson(result.personId)
      setNewGuestName('')
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Could not add your name')
    } finally {
      setAddingGuest(false)
    }
  }
  const addHostTime = async () => {
    if (!newSlot.date || !newSlot.start || !newSlot.end) return
    try {
      setAddingTime(true); setLoadError('')
      setEvent(await addTimeOption(id, { id: makeId(), ...newSlot }))
      setShowAddTime(false)
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Could not add the time option')
    } finally {
      setAddingTime(false)
    }
  }
  const submit = async (exclude = excluded) => {
    try {
      const updated = await saveResponse(id, selectedPerson, draft, optional, exclude)
      setEvent(updated); setSaved(true); setTimeout(() => setSaved(false), 1800)
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Could not save your response') }
  }
  const invitees = event.people.slice(1)
  const responded = invitees.filter(p => event.responses[p.id]).length
  const bestId = [...scores].sort((a, b) => a.blocked - b.blocked || b.available - a.available)[0]?.slot.id

  return <main className="event-shell">
    <div className="event-top"><Brand /><button className="share" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? 'Copied!' : 'Copy invite link'}</button></div>
    <section className="event-hero">
      <div><div className="eyebrow"><CalendarDays size={14} /> YOU'RE INVITED</div><h1>{event.title}</h1><p className="hosted">Hosted by {event.creator}</p></div>
      <div className="event-meta">{event.location && <span><MapPin /> {event.location}</span>}<span><Users /> {event.people.length} people invited</span></div>
      {event.note && <div className="note">“{event.note}”</div>}
    </section>

    {!host && <section className="response card">
      <div className="response-head"><div><span className="step">YOUR AVAILABILITY</span><h2>What's your name?</h2></div><span className="progress-count">{responded} of {invitees.length} replied</span></div>
      <div className="attendee-picker">{invitees.map(person => <button key={person.id} className={selectedPerson === person.id ? 'selected' : ''} onClick={() => setSelectedPerson(person.id)}><span className="avatar">{person.name[0].toUpperCase()}</span><span>{person.name}<small>{person.excluded ? 'Not attending' : person.optional ? 'Optional' : event.responses[person.id] ? 'Responded' : 'Waiting'}</small></span>{selectedPerson === person.id && <Check />}</button>)}</div>
      {!selectedPerson && <div className="guest-name-row"><span>Not on the list?</span><div><input value={newGuestName} onChange={e => setNewGuestName(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinGuestList()} placeholder="Add your name" /><button className="secondary" disabled={addingGuest || !newGuestName.trim()} onClick={joinGuestList}><Plus size={16} /> {addingGuest ? 'Adding…' : 'Add me'}</button></div></div>}
      {selectedPerson && <div className="availability">{excluded ? <div className="excluded-rsvp"><p>You're currently marked as not attending.</p><button className="secondary" onClick={() => setExcluded(false)}>Change my response</button></div> : <><label className="optional"><input type="checkbox" checked={optional} onChange={e => setOptional(e.target.checked)} /> My attendance is optional — don't let my availability block the group</label><p>Choose your availability for at least one option.</p>{event.slots.map(slot => <div className="availability-row" key={slot.id}><div className="slot-label"><strong>{fmtLong(slot.date)}</strong><small className="rsvp-date-preview">{fmtRelativeDate(slot.date)}</small><span><Clock3 /> {fmtTime(slot.start)} – {fmtTime(slot.end)}</span><TimeTags tags={slot.tags} /></div><div className="statuses">{(['available', 'unavailable'] as Status[]).map(s => <StatusButton key={s} status={s} active={draft[slot.id] === s} onClick={() => setDraft({ ...draft, [slot.id]: s })} />)}</div></div>)}<div className="rsvp-actions"><button className="decline-rsvp" onClick={() => submit(true)}>I can't attend</button><button className="primary" disabled={Object.keys(draft).length === 0} onClick={() => submit()}>{saved ? <><Check /> Saved!</> : <>Save my RSVP <ChevronRight /></>}</button></div></>}</div>}
    </section>}

    {host && <section className="results">
      <div className="results-head"><div><span className="step">HOST VIEW</span><h2>Find your best time</h2><p>{responded} of {invitees.length} invitees have responded.</p>{invitees.some(person => person.optional && !person.excluded) && <p>Optional attendees: {invitees.filter(person => person.optional && !person.excluded).map(person => person.name).join(', ')}</p>}</div><button className="share mobile-hide" onClick={copy}><Copy /> Share again</button></div>
      <div className="host-time-actions">{showAddTime ? <div className="host-time-form"><label>Date<input type="date" value={newSlot.date} onChange={event => setNewSlot({ ...newSlot, date: event.target.value })} />{newSlot.date && <small className="date-preview">{fmtRelativeDate(newSlot.date)}</small>}</label><label>Starts<input type="time" value={newSlot.start} onChange={event => setNewSlot({ ...newSlot, start: event.target.value })} /></label><label>Ends<input type="time" value={newSlot.end} onChange={event => setNewSlot({ ...newSlot, end: event.target.value })} /></label><div className="host-slot-tags"><span>Vibe tags <small>OPTIONAL</small></span><TagPicker selected={newSlot.tags} onChange={tags => setNewSlot({ ...newSlot, tags })} /></div><div className="host-time-buttons"><button className="secondary" onClick={() => setShowAddTime(false)}>Cancel</button><button className="primary" disabled={addingTime || !newSlot.date || !newSlot.start || !newSlot.end} onClick={addHostTime}>{addingTime ? 'Adding…' : 'Add time'}</button></div></div> : <button className="secondary add-host-time" onClick={() => setShowAddTime(true)}><Plus size={16} /> Add another time</button>}</div>
      <div className="summary-grid">{scores.map(score => <article className={`result-card ${score.slot.id === bestId ? 'best' : ''}`} key={score.slot.id}>{score.slot.id === bestId && <div className="best-label"><Crown /> Best option</div>}<div className="date-block"><span>{fmtDate(score.slot.date).split(' ')[0]}</span><strong>{new Date(`${score.slot.date}T12:00`).getDate()}</strong><small>{new Intl.DateTimeFormat('en-AU', { month: 'short' }).format(new Date(`${score.slot.date}T12:00`))}</small></div><div className="result-info"><h3>{fmtTime(score.slot.start)} – {fmtTime(score.slot.end)}</h3><p className="host-date-preview">{fmtRelativeDate(score.slot.date)}</p><TimeTags tags={score.slot.tags} /><div className="response-faces">{event.people.map(p => { const s = event.responses[p.id]?.[score.slot.id]; return p.excluded ? <span key={p.id} className="unavailable" title={`${p.name}: not attending`}><X /></span> : <span key={p.id} className={s || 'waiting'} title={`${p.name}${p.optional ? ' (optional)' : ''}: ${s || 'waiting'}`}>{s === 'available' ? <Check /> : s === 'unavailable' ? <X /> : s === 'tentative' ? '?' : p.name[0]}</span> })}</div><p>{score.available} available · {score.blocked} can't make it</p></div><button className="book" onClick={async () => { try { setEvent(await bookEvent(id, score.slot.id)) } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Could not book this time') } }}>{event.bookedSlotId === score.slot.id ? <><Check /> Booked</> : 'Book this time'}</button></article>)}</div>
      {loadError && <p className="error">{loadError}</p>}
      <div className="legend"><span><i className="dot yes" /> Available</span><span><i className="dot no" /> Can't make it / not attending</span><span><i className="dot wait" /> Waiting</span></div>
    </section>}
  </main>
}

export default function App() {
  const [current, setCurrent] = useState<Route>(route())
  useEffect(() => { const onHash = () => setCurrent(route()); addEventListener('hashchange', onHash); return () => removeEventListener('hashchange', onHash) }, [])
  let page
  if (current.page === 'home') page = <Home />
  else if (current.page === 'create') page = <Create />
  else page = <EventPage id={current.id} />
  return <>{current.page !== 'event' && <Header />}{page}<footer>Gather <span>·</span> Plans are better together.</footer></>
}
