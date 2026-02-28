import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DispatchBoard from './DispatchBoard'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
        <p className="text-gray-500 mt-1">Triage service requests and dispatch to vendors</p>
      </div>
      <DispatchBoard />
    </div>
  )
}
