'use client'

import { useState, useEffect } from 'react'
import StatusBadge from '@/components/StatusBadge'
import Button from '@/components/ui/Button'

type Request = {
  id: string
  title: string
  description: string
  urgency: string
  status: string
  createdAt: string
  category: { name: string }
  property: { name: string }
  organization: { name: string }
  jobs: Array<{
    id: string
    status: string
    vendor: { name: string }
  }>
}

type Vendor = {
  id: string
  name: string
  vendorSkills: Array<{ category: { name: string } }>
}

export default function DispatchBoard() {
  const [requests, setRequests] = useState<Request[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState<string | null>(null)
  const [selectedVendor, setSelectedVendor] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('pending')

  useEffect(() => {
    Promise.all([
      fetch('/api/requests').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
    ]).then(([reqs, vends]) => {
      setRequests(reqs)
      setVendors(vends)
      setLoading(false)
    })
  }, [])

  const filteredRequests = requests.filter(r => {
    if (filter === 'pending') return ['SUBMITTED', 'TRIAGED'].includes(r.status)
    if (filter === 'active') return ['DISPATCHED', 'IN_PROGRESS'].includes(r.status)
    return true
  })

  async function handleDispatch(requestId: string) {
    const vendorId = selectedVendor[requestId]
    if (!vendorId) return

    setDispatching(requestId)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, vendorId }),
      })
      if (res.ok) {
        const [reqs, vends] = await Promise.all([
          fetch('/api/requests').then(r => r.json()),
          fetch('/api/vendors').then(r => r.json()),
        ])
        setRequests(reqs)
        setVendors(vends)
        setSelectedVendor(prev => { const n = { ...prev }; delete n[requestId]; return n })
      }
    } finally {
      setDispatching(null)
    }
  }

  const urgencyOrder: Record<string, number> = { EMERGENCY: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  const urgencyColor: Record<string, string> = {
    EMERGENCY: 'bg-red-100 text-red-800 border border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border border-green-300',
  }

  const sorted = [...filteredRequests].sort((a, b) =>
    (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9)
  )

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dispatch board...</div>

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'active', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No requests to show</p>
          <p className="text-sm mt-1">Change the filter to see other requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgencyColor[req.urgency]}`}>
                        {req.urgency}
                      </span>
                      <span className="text-xs text-gray-400">{req.category.name}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{req.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {req.organization.name} · {req.property.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{req.description}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {/* Active Jobs */}
                {req.jobs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {req.jobs.map(job => (
                      <div key={job.id} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Dispatched to:</span>
                        <span className="font-medium">{job.vendor.name}</span>
                        <StatusBadge status={job.status} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Dispatch Controls */}
                {['SUBMITTED', 'TRIAGED'].includes(req.status) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3 items-center">
                    <select
                      value={selectedVendor[req.id] || ''}
                      onChange={e => setSelectedVendor(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="">Select vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.vendorSkills.map(s => s.category.name).join(', ')})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => handleDispatch(req.id)}
                      disabled={!selectedVendor[req.id] || dispatching === req.id}
                      loading={dispatching === req.id}
                    >
                      Dispatch
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
