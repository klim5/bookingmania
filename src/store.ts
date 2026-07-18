import type { EventPlan } from './types'

const hostKey = (id: string) => `gather:host:${id}`

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/events${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const text = await response.text()
  let body: (T & { error?: string }) | undefined

  if (text) {
    try {
      body = JSON.parse(text) as T & { error?: string }
    } catch {
      throw new Error(`API returned ${response.status} ${response.statusText} instead of JSON`)
    }
  }

  if (!response.ok) throw new Error(body?.error || `API request failed (${response.status} ${response.statusText})`)
  if (!body) throw new Error(`API returned an empty response (${response.status} ${response.statusText})`)
  return body
}

export async function getEvent(id: string): Promise<EventPlan> {
  const result = await api<{ event: EventPlan }>(`/${id}`)
  return result.event
}

export async function createEvent(event: EventPlan) {
  const hostToken = crypto.randomUUID()
  const result = await api<{ event: EventPlan }>('', { method: 'POST', body: JSON.stringify({ event, hostToken }) })
  localStorage.setItem(hostKey(event.id), hostToken)
  return result.event
}

export async function addPerson(eventId: string, name: string) {
  const result = await api<{ event: EventPlan; personId: string }>(`/${eventId}/people`, { method: 'POST', body: JSON.stringify({ name }) })
  return result
}

export async function saveResponse(eventId: string, personId: string, availability: EventPlan['responses'][string], optional: boolean, excluded: boolean) {
  const result = await api<{ event: EventPlan }>(`/${eventId}/responses/${personId}`, { method: 'PUT', body: JSON.stringify({ availability, optional, excluded }) })
  return result.event
}

export async function bookEvent(eventId: string, slotId: string) {
  const hostToken = localStorage.getItem(hostKey(eventId)) || ''
  const result = await api<{ event: EventPlan }>(`/${eventId}/book`, { method: 'PUT', headers: { 'X-Host-Token': hostToken }, body: JSON.stringify({ slotId }) })
  return result.event
}

export function isHost(id: string) {
  return Boolean(localStorage.getItem(hostKey(id)))
}

export function eventUrl(id: string) {
  return `${location.origin}${location.pathname}#/event/${id}`
}

export function makeId() {
  return crypto.randomUUID().split('-')[0]
}
