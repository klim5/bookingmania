export type Status = 'available' | 'tentative' | 'unavailable'

export interface Person {
  id: string
  name: string
  optional: boolean
  excluded: boolean
}

export interface Slot {
  id: string
  date: string
  start: string
  end: string
}

export interface EventPlan {
  id: string
  title: string
  note: string
  location: string
  creator: string
  people: Person[]
  slots: Slot[]
  responses: Record<string, Record<string, Status>>
  createdAt: string
  bookedSlotId?: string
}
