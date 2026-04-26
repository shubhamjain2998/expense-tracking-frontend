import type { Person } from '../../types/settings'

import { client } from './client'

export async function getPersons(): Promise<Person[]> {
  const { data } = await client.get<Person[]>('/persons')
  return data
}

export async function createPerson(name: string): Promise<Person> {
  const { data } = await client.post<Person>('/persons', { name })
  return data
}

export async function deletePerson(id: string): Promise<void> {
  await client.delete(`/persons/${id}`)
}
