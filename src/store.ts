import type { EventPlan } from './types'

const key = (id: string) => `gather:event:${id}`

export function getEvent(id: string): EventPlan | null {
  try { return JSON.parse(localStorage.getItem(key(id)) || 'null') }
  catch { return null }
}

export function saveEvent(event: EventPlan) {
  localStorage.setItem(key(event.id), JSON.stringify(event))
}

export function eventUrl(id: string) {
  return `${location.origin}${location.pathname}#/event/${id}`
}

export function makeId() {
  return crypto.randomUUID().split('-')[0]
}
