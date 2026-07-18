interface D1Result<T = unknown> { results?: T[]; success: boolean }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  run<T = unknown>(): Promise<D1Result<T>>
}
interface D1Database { prepare(query: string): D1PreparedStatement }
interface Env { abcd: D1Database }
interface Person { id: string; name: string; optional: boolean }
interface Slot { id: string; date: string; start: string; end: string }
interface EventPlan {
  id: string; title: string; note: string; location: string; creator: string
  people: Person[]; slots: Slot[]
  responses: Record<string, Record<string, 'available' | 'tentative' | 'unavailable'>>
  createdAt: string; bookedSlotId?: string
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
const validStatus = (value: unknown) => ['available', 'tentative', 'unavailable'].includes(String(value))

async function readEvent(db: D1Database, id: string) {
  const row = await db.prepare('SELECT data FROM events WHERE id = ?').bind(id).first<{ data: string }>()
  return row ? JSON.parse(row.data) as EventPlan : null
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const parts = (Array.isArray(params.path) ? params.path : params.path ? [params.path] : []).map(String)
    const method = request.method.toUpperCase()

    if (method === 'POST' && parts.length === 0) {
      const body = await request.json() as { event?: EventPlan; hostToken?: string }
      const event = body.event
      if (!event || !body.hostToken || !event.id || !event.title || !event.people?.length || !event.slots?.length) return json({ error: 'Invalid event' }, 400)
      await env.abcd.prepare('INSERT INTO events (id, data, host_token) VALUES (?, ?, ?)')
        .bind(event.id, JSON.stringify(event), body.hostToken).run()
      return json({ event }, 201)
    }

    const [id, action, personId] = parts
    if (!id) return json({ error: 'Not found' }, 404)

    if (method === 'GET' && parts.length === 1) {
      const event = await readEvent(env.abcd, id)
      return event ? json({ event }) : json({ error: 'Event not found' }, 404)
    }

    if (method === 'PUT' && action === 'responses' && personId) {
      const event = await readEvent(env.abcd, id)
      if (!event) return json({ error: 'Event not found' }, 404)
      if (!event.people.some(person => person.id === personId)) return json({ error: 'Unknown guest' }, 400)
      const body = await request.json() as { availability?: Record<string, unknown> }
      const availability = body.availability || {}
      if (event.slots.some(slot => !validStatus(availability[slot.id]))) return json({ error: 'Respond to every time option' }, 400)
      event.responses[personId] = availability as EventPlan['responses'][string]
      await env.abcd.prepare('UPDATE events SET data = ? WHERE id = ?').bind(JSON.stringify(event), id).run()
      return json({ event })
    }

    if (method === 'PUT' && action === 'book') {
      const hostToken = request.headers.get('X-Host-Token')
      const row = await env.abcd.prepare('SELECT data, host_token FROM events WHERE id = ?').bind(id).first<{ data: string; host_token: string }>()
      if (!row) return json({ error: 'Event not found' }, 404)
      if (!hostToken || hostToken !== row.host_token) return json({ error: 'Only the host can book this event' }, 403)
      const body = await request.json() as { slotId?: string }
      const event = JSON.parse(row.data) as EventPlan
      if (!body.slotId || !event.slots.some(slot => slot.id === body.slotId)) return json({ error: 'Unknown time option' }, 400)
      event.bookedSlotId = body.slotId
      await env.abcd.prepare('UPDATE events SET data = ? WHERE id = ?').bind(JSON.stringify(event), id).run()
      return json({ event })
    }

    return json({ error: 'Not found' }, 404)
  } catch (error) {
    console.error(error)
    return json({ error: 'Something went wrong' }, 500)
  }
}
