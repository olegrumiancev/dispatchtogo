import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminVendorsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  const vendors = await prisma.organization.findMany({
    where: { type: 'VENDOR' },
    include: {
      vendorSkills: { include: { category: true } },
      vendorCredentials: true,
      vendorJobs: {
        include: { request: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Directory</h1>
        <p className="text-gray-500 mt-1">{vendors.length} registered vendors</p>
      </div>

      <div className="grid gap-4">
        {vendors.map(vendor => (
          <div key={vendor.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">{vendor.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {vendor.phone && <span>{vendor.phone}</span>}
                  {vendor.phone && vendor.email && <span> · </span>}
                  {vendor.email && <span>{vendor.email}</span>}
                </p>
                {vendor.address && (
                  <p className="text-sm text-gray-400 mt-0.5">{vendor.address}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{vendor.vendorJobs.length} recent jobs</p>
              </div>
            </div>

            {/* Skills */}
            {vendor.vendorSkills.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.vendorSkills.map(skill => (
                    <span key={skill.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {skill.category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Credentials */}
            {vendor.vendorCredentials.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Credentials</p>
                <div className="flex flex-wrap gap-2">
                  {vendor.vendorCredentials.map(cred => (
                    <div key={cred.id} className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${cred.verified ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-gray-700">{cred.credentialType}</span>
                      {cred.expiresAt && (
                        <span className="text-gray-400">· expires {new Date(cred.expiresAt).toLocaleDateString('en-CA')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
