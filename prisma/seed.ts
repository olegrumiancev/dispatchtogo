import { PrismaClient, UserRole, OrganizationType, Urgency, RequestStatus, JobStatus, InvoiceStatus, PhotoType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding DispatchToGo database...')

  // ── Service Categories ──────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.serviceCategory.upsert({
      where: { name: 'Plumbing' },
      update: {},
      create: { name: 'Plumbing', description: 'Pipe repairs, leak fixes, fixture installation', requiresLicense: true },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Electrical' },
      update: {},
      create: { name: 'Electrical', description: 'Wiring, panel work, outlet and fixture repairs', requiresLicense: true },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'HVAC' },
      update: {},
      create: { name: 'HVAC', description: 'Heating, ventilation, and air conditioning services', requiresLicense: true },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Snow Removal' },
      update: {},
      create: { name: 'Snow Removal', description: 'Parking lot, walkway, and roof snow clearing', requiresLicense: false },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Landscaping' },
      update: {},
      create: { name: 'Landscaping', description: 'Lawn care, tree trimming, seasonal cleanup', requiresLicense: false },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'General Maintenance' },
      update: {},
      create: { name: 'General Maintenance', description: 'Carpentry, drywall, painting, general repairs', requiresLicense: false },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Cleaning' },
      update: {},
      create: { name: 'Cleaning', description: 'Deep cleaning, post-construction cleanup, janitorial', requiresLicense: false },
    }),
    prisma.serviceCategory.upsert({
      where: { name: 'Pest Control' },
      update: {},
      create: { name: 'Pest Control', description: 'Inspection, treatment, and prevention services', requiresLicense: true },
    }),
  ])

  const [catPlumbing, catElectrical, catHVAC, catSnow, catLandscape, catMaintenance, catCleaning, catPest] = categories

  // ── Operator Organizations ──────────────────────────────────────────────────
  const orgBW = await prisma.organization.upsert({
    where: { id: 'org_bestwestern' },
    update: {},
    create: {
      id: 'org_bestwestern',
      name: 'Best Western Plus Cornwall',
      type: OrganizationType.OPERATOR,
      phone: '613-938-0001',
      email: 'maintenance@bwcornwall.ca',
      address: '1515 Vincent Massey Dr, Cornwall, ON K6H 5R6',
    },
  })

  const orgFarran = await prisma.organization.upsert({
    where: { id: 'org_farran' },
    update: {},
    create: {
      id: 'org_farran',
      name: 'Farran Park Campground',
      type: OrganizationType.OPERATOR,
      phone: '613-543-2221',
      email: 'ops@farranpark.ca',
      address: '16480 County Rd 2, Long Sault, ON K0C 1P0',
    },
  })

  const orgMarina = await prisma.organization.upsert({
    where: { id: 'org_marina' },
    update: {},
    create: {
      id: 'org_marina',
      name: 'Cornwall Marina',
      type: OrganizationType.OPERATOR,
      phone: '613-932-4255',
      email: 'facilities@cornwallmarina.ca',
      address: '100 Water St E, Cornwall, ON K6H 6N7',
    },
  })

  // ── Vendor Organizations ────────────────────────────────────────────────────
  const orgSDGPlumbing = await prisma.organization.upsert({
    where: { id: 'org_sdgplumbing' },
    update: {},
    create: {
      id: 'org_sdgplumbing',
      name: 'SDG Plumbing & Heating',
      type: OrganizationType.VENDOR,
      phone: '613-933-4400',
      email: 'dispatch@sdgplumbing.ca',
      address: '215 Pitt St, Cornwall, ON K6J 3R3',
    },
  })

  const orgCornwallElec = await prisma.organization.upsert({
    where: { id: 'org_cornwallelec' },
    update: {},
    create: {
      id: 'org_cornwallelec',
      name: 'Cornwall Electric Services',
      type: OrganizationType.VENDOR,
      phone: '613-938-9000',
      email: 'service@cornwallelectric.ca',
      address: '3399 Industrial Blvd, Cornwall, ON K6H 4M2',
    },
  })

  const orgSeaway = await prisma.organization.upsert({
    where: { id: 'org_seaway' },
    update: {},
    create: {
      id: 'org_seaway',
      name: 'Seaway Snow & Grounds',
      type: OrganizationType.VENDOR,
      phone: '613-935-7700',
      email: 'info@seawaygrounds.ca',
      address: '850 Campbell St, Cornwall, ON K6H 6C3',
    },
  })

  // ── Vendor Credentials ──────────────────────────────────────────────────────
  await prisma.vendorCredential.createMany({
    data: [
      { organizationId: orgSDGPlumbing.id, credentialType: 'Master Plumber License', credentialNumber: 'MP-ON-48291', expiresAt: new Date('2026-12-31'), verified: true },
      { organizationId: orgSDGPlumbing.id, credentialType: 'TSSA Gas Fitter', credentialNumber: 'GF2-ON-11934', expiresAt: new Date('2025-11-30'), verified: true },
      { organizationId: orgCornwallElec.id, credentialType: 'Electrical Safety Authority', credentialNumber: 'ESA-6649201', expiresAt: new Date('2026-06-30'), verified: true },
      { organizationId: orgCornwallElec.id, credentialType: 'Master Electrician', credentialNumber: 'ME-ON-39042', expiresAt: new Date('2027-03-31'), verified: true },
      { organizationId: orgSeaway.id, credentialType: 'WSIB Clearance Certificate', credentialNumber: 'WSIB-2024-882741', expiresAt: new Date('2025-12-31'), verified: true },
    ],
    skipDuplicates: true,
  })

  // ── Vendor Skills ───────────────────────────────────────────────────────────
  await prisma.vendorSkill.createMany({
    data: [
      { organizationId: orgSDGPlumbing.id, categoryId: catPlumbing.id },
      { organizationId: orgSDGPlumbing.id, categoryId: catHVAC.id },
      { organizationId: orgCornwallElec.id, categoryId: catElectrical.id },
      { organizationId: orgSeaway.id, categoryId: catSnow.id },
      { organizationId: orgSeaway.id, categoryId: catLandscape.id },
      { organizationId: orgSeaway.id, categoryId: catMaintenance.id },
    ],
    skipDuplicates: true,
  })

  // ── Properties ──────────────────────────────────────────────────────────────
  const propBW1 = await prisma.property.upsert({
    where: { id: 'prop_bw_main' },
    update: {},
    create: { id: 'prop_bw_main', name: 'Main Hotel Building', address: '1515 Vincent Massey Dr, Cornwall, ON', organizationId: orgBW.id },
  })
  const propBW2 = await prisma.property.upsert({
    where: { id: 'prop_bw_pool' },
    update: {},
    create: { id: 'prop_bw_pool', name: 'Pool & Fitness Wing', address: '1515 Vincent Massey Dr, Cornwall, ON', organizationId: orgBW.id },
  })
  const propFarran1 = await prisma.property.upsert({
    where: { id: 'prop_farran_main' },
    update: {},
    create: { id: 'prop_farran_main', name: 'Campground Main Site', address: '16480 County Rd 2, Long Sault, ON', organizationId: orgFarran.id },
  })
  const propFarran2 = await prisma.property.upsert({
    where: { id: 'prop_farran_bath' },
    update: {},
    create: { id: 'prop_farran_bath', name: 'Washroom & Shower Block', address: '16480 County Rd 2, Long Sault, ON', organizationId: orgFarran.id },
  })
  const propMarina1 = await prisma.property.upsert({
    where: { id: 'prop_marina_dock' },
    update: {},
    create: { id: 'prop_marina_dock', name: 'Dockside Facilities', address: '100 Water St E, Cornwall, ON', organizationId: orgMarina.id },
  })

  // ── Users ───────────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('demo123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', passwordHash: password, name: 'Admin User', role: UserRole.ADMIN },
  })

  const userOp1 = await prisma.user.upsert({
    where: { email: 'operator1@demo.com' },
    update: {},
    create: { email: 'operator1@demo.com', passwordHash: password, name: 'Sarah Mitchell', role: UserRole.OPERATOR, organizationId: orgBW.id },
  })

  const userOp2 = await prisma.user.upsert({
    where: { email: 'operator2@demo.com' },
    update: {},
    create: { email: 'operator2@demo.com', passwordHash: password, name: 'James Tremblay', role: UserRole.OPERATOR, organizationId: orgFarran.id },
  })

  await prisma.user.upsert({
    where: { email: 'operator3@demo.com' },
    update: {},
    create: { email: 'operator3@demo.com', passwordHash: password, name: 'Marina Manager', role: UserRole.OPERATOR, organizationId: orgMarina.id },
  })

  const userVendor1 = await prisma.user.upsert({
    where: { email: 'vendor1@demo.com' },
    update: {},
    create: { email: 'vendor1@demo.com', passwordHash: password, name: 'Mike Plumber', role: UserRole.VENDOR, organizationId: orgSDGPlumbing.id },
  })

  const userVendor2 = await prisma.user.upsert({
    where: { email: 'vendor2@demo.com' },
    update: {},
    create: { email: 'vendor2@demo.com', passwordHash: password, name: 'Ellen Sparks', role: UserRole.VENDOR, organizationId: orgCornwallElec.id },
  })

  await prisma.user.upsert({
    where: { email: 'vendor3@demo.com' },
    update: {},
    create: { email: 'vendor3@demo.com', passwordHash: password, name: 'Tom Seaway', role: UserRole.VENDOR, organizationId: orgSeaway.id },
  })

  // ── Admin User for assigning jobs ───────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } })
  if (!adminUser) throw new Error('Admin user not found')

  // ── Service Requests ────────────────────────────────────────────────────────
  const req1 = await prisma.serviceRequest.upsert({
    where: { id: 'req_001' },
    update: {},
    create: {
      id: 'req_001',
      title: 'Burst pipe in Room 214',
      description: 'Guest reported water spraying from wall pipe in bathroom. Room has been vacated. Urgent repair needed.',
      categoryId: catPlumbing.id,
      propertyId: propBW1.id,
      organizationId: orgBW.id,
      urgency: Urgency.EMERGENCY,
      status: RequestStatus.COMPLETED,
      createdById: userOp1.id,
    },
  })

  const req2 = await prisma.serviceRequest.upsert({
    where: { id: 'req_002' },
    update: {},
    create: {
      id: 'req_002',
      title: 'Electrical panel tripping breakers',
      description: 'Main electrical panel in the basement is continuously tripping circuit breakers. Affects guest room floors 2-3.',
      categoryId: catElectrical.id,
      propertyId: propBW1.id,
      organizationId: orgBW.id,
      urgency: Urgency.HIGH,
      status: RequestStatus.IN_PROGRESS,
      createdById: userOp1.id,
    },
  })

  const req3 = await prisma.serviceRequest.upsert({
    where: { id: 'req_003' },
    update: {},
    create: {
      id: 'req_003',
      title: 'Snow removal - main parking lot',
      description: 'Heavy overnight snowfall. Parking lot and entrance walkways need clearing before 7am guest checkout.',
      categoryId: catSnow.id,
      propertyId: propBW1.id,
      organizationId: orgBW.id,
      urgency: Urgency.HIGH,
      status: RequestStatus.DISPATCHED,
      createdById: userOp1.id,
    },
  })

  const req4 = await prisma.serviceRequest.upsert({
    where: { id: 'req_004' },
    update: {},
    create: {
      id: 'req_004',
      title: 'Campground shower block - cold water only',
      description: 'Hot water heater for the shower block appears to have failed. Campers are complaining. Needs same-day fix.',
      categoryId: catPlumbing.id,
      propertyId: propFarran2.id,
      organizationId: orgFarran.id,
      urgency: Urgency.HIGH,
      status: RequestStatus.TRIAGED,
      createdById: userOp2.id,
    },
  })

  const req5 = await prisma.serviceRequest.upsert({
    where: { id: 'req_005' },
    update: {},
    create: {
      id: 'req_005',
      title: 'Marina dock lighting not working',
      description: 'Several dock light fixtures are out. Safety concern for evening boat arrivals. 6 fixtures need replacement.',
      categoryId: catElectrical.id,
      propertyId: propMarina1.id,
      organizationId: orgMarina.id,
      urgency: Urgency.MEDIUM,
      status: RequestStatus.SUBMITTED,
      createdById: adminUser.id,
    },
  })

  const req6 = await prisma.serviceRequest.upsert({
    where: { id: 'req_006' },
    update: {},
    create: {
      id: 'req_006',
      title: 'Pool HVAC unit making loud noise',
      description: 'The HVAC unit in the pool area is making a loud grinding noise. Started yesterday. Pool is still open but needs inspection.',
      categoryId: catHVAC.id,
      propertyId: propBW2.id,
      organizationId: orgBW.id,
      urgency: Urgency.MEDIUM,
      status: RequestStatus.SUBMITTED,
      createdById: userOp1.id,
    },
  })

  // ── Jobs ─────────────────────────────────────────────────────────────────────
  const job1 = await prisma.job.upsert({
    where: { id: 'job_001' },
    update: {},
    create: {
      id: 'job_001',
      requestId: req1.id,
      vendorId: orgSDGPlumbing.id,
      status: JobStatus.COMPLETED,
      assignedById: adminUser.id,
      acceptedAt: new Date('2024-12-10T08:00:00Z'),
      enRouteAt: new Date('2024-12-10T08:30:00Z'),
      arrivedAt: new Date('2024-12-10T09:00:00Z'),
      completedAt: new Date('2024-12-10T11:30:00Z'),
    },
  })

  const job2 = await prisma.job.upsert({
    where: { id: 'job_002' },
    update: {},
    create: {
      id: 'job_002',
      requestId: req2.id,
      vendorId: orgCornwallElec.id,
      status: JobStatus.ON_SITE,
      assignedById: adminUser.id,
      acceptedAt: new Date('2024-12-11T09:00:00Z'),
      enRouteAt: new Date('2024-12-11T09:45:00Z'),
      arrivedAt: new Date('2024-12-11T10:15:00Z'),
    },
  })

  const job3 = await prisma.job.upsert({
    where: { id: 'job_003' },
    update: {},
    create: {
      id: 'job_003',
      requestId: req3.id,
      vendorId: orgSeaway.id,
      status: JobStatus.ACCEPTED,
      assignedById: adminUser.id,
      acceptedAt: new Date('2024-12-12T05:30:00Z'),
    },
  })

  // ── Job Notes ────────────────────────────────────────────────────────────────
  await prisma.jobNote.createMany({
    data: [
      { jobId: job1.id, userId: userVendor1.id, content: 'Arrived on site. Located burst in main supply line behind wall panel. Will need to shut off water to wing.' },
      { jobId: job1.id, userId: userVendor1.id, content: 'Repair complete. Replaced 2ft section of 3/4" copper pipe. Water restored. No further leaks detected.' },
      { jobId: job2.id, userId: userVendor2.id, content: 'Panel inspection in progress. Found corroded bus bar on circuits 12-16. Sourcing replacement part.' },
    ],
    skipDuplicates: true,
  })

  // ── Job Materials ────────────────────────────────────────────────────────────
  await prisma.jobMaterial.createMany({
    data: [
      { jobId: job1.id, description: '3/4" Copper Pipe (2ft)', quantity: 2, unitCost: 18.50 },
      { jobId: job1.id, description: 'Pipe Fitting Kit', quantity: 1, unitCost: 24.00 },
      { jobId: job1.id, description: 'Solder & Flux', quantity: 1, unitCost: 12.00 },
    ],
    skipDuplicates: true,
  })

  // ── Invoices ─────────────────────────────────────────────────────────────────
  await prisma.invoice.upsert({
    where: { id: 'inv_001' },
    update: {},
    create: {
      id: 'inv_001',
      jobId: job1.id,
      organizationId: orgBW.id,
      vendorOrganizationId: orgSDGPlumbing.id,
      laborTotal: 285.00,
      materialsTotal: 73.00,
      total: 358.00,
      status: InvoiceStatus.SENT,
    },
  })

  // ── Notifications ────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: userOp1.id, title: 'Job Completed', body: 'SDG Plumbing has completed the burst pipe repair in Room 214.', read: true },
      { userId: userOp1.id, title: 'Invoice Ready', body: 'Invoice #INV-001 for $358.00 is ready for review.', read: false },
      { userId: userOp1.id, title: 'Vendor En Route', body: 'Seaway Snow & Grounds is en route for snow removal.', read: false },
      { userId: userVendor1.id, title: 'New Job Offer', body: 'You have a new job offer: Campground shower block - cold water only.', read: false },
      { userId: userVendor2.id, title: 'Job Updated', body: 'Notes have been added to your active electrical job at Best Western.', read: false },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed complete!')
  console.log('   Organizations: 6 (3 operators, 3 vendors)')
  console.log('   Users: 7 (1 admin, 3 operators, 3 vendors)')
  console.log('   Properties: 5')
  console.log('   Service Categories: 8')
  console.log('   Service Requests: 6')
  console.log('   Jobs: 3')
  console.log('   Invoices: 1')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
