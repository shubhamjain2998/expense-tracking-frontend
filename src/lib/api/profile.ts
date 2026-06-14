import { client } from './client'

export interface StatsResponse {
  transaction_count: number
  total_spend: number
}

export async function getMyStats(): Promise<StatsResponse> {
  const { data } = await client.get<StatsResponse>('/auth/me/stats')
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await client.patch('/auth/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
