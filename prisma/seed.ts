import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding DispatchToGo database...')

  // ── Operator Organizations ──────────────────────────────────────────────────────────
  const orgBW = await prisma.organization.upsert({
    where: { id: 'org_bestwestern' },
    update: {},
    create: {
      id: 'org_bestwestern',
      name: 'Best Western Plus Cornwall',
      type: "OPERATOR",
      phone: '613-938-0001',
      email: 'maintenance@bwcornwall.ca',
      contactEmail: 'maintenance@bwcornwall.ca',
      contactPhone: '613-938-0001',
      address: '1515 Vincent Massey Dr, Cornwall, ON K6H 5R6',
    },
  })

  const orgFarran = await prisma.organization.upsert({
    where: { id: 'org_farran' },
    update: {},
    create: {
      id: 'org_farran',
      name: 'Farran Park Campground',
      type: "OPERATOR",
      phone: '613-543-2221',
      email: 'ops@farranpark.ca',
      contactEmail: 'ops@farranpark.ca',
      contactPhone: '613-543-2221',
      address: '16480 County Rd 2, Long Sault, ON K0C 1P0',
    },
  })

  const orgMarina = await prisma.organization.upsert({
    where: { id: 'org_marina' },
    update: {},
    create: {
      id: 'org_marina',
      name: 'Cornwall Marina',
      type: "OPERATOR",
      phone: '613-932-4255',
      email: 'facilities@cornwallmarina.ca',
      contactEmail: 'facilities@cornwallmarina.ca',
      contactPhone: '613-932-4255',
      address: '100 Water St E, Cornwall, ON K6H 6N7',
    },
  })

  // ── Vendors ─────────────────────────────────────────────────────────────────
  const vendorSDGPlumbing = await prisma.vendor.upsert({
    where: { email: 'dispatch@sdgplumbing.ca' },
    update: {},
    create: {
      id: 'vendor_sdgplumbing',
      companyName: 'SDG Plumbing & Heating',
      contactName: 'Mike Plumber',
      email: 'dispatch@sdgplumbing.ca',
      phone: '613-933-4400',
      address: '215 Pitt St, Cornwall, ON K6J 3R3',
      serviceArea: 'Cornwall & SDG',
      serviceRadiusKm: 50,
      specialties: ['Plumbing', 'HVAC'],
      isActive: true,
    },
  })

  const vendorCornwallElec = await prisma.vendor.upsert({
    where: { email: 'service@cornwallelectric.ca' },
    update: {},
    create: {
      id: 'vendor_cornwallelec',
      companyName: 'Cornwall Electric Services',
      contactName: 'Ellen Sparks',
      email: 'service@cornwallelectric.ca',
      phone: '613-938-9000',
      address: '3399 Industrial Blvd, Cornwall, ON K6H 4M2',
      serviceArea: 'Cornwall & SDG',
      serviceRadiusKm: 40,
      specialties: ['Electrical'],
      isActive: true,
    },
  })

  const vendorSeaway = await prisma.vendor.upsert({
    where: { email: 'info@seawaygrounds.ca' },
    update: {},
    create: {
      id: 'vendor_seaway',
      companyName: 'Seaway Snow & Grounds',
      contactName: 'Tom Seaway',
      email: 'info@seawaygrounds.ca',
      phone: '613-935-7700',
      address: '850 Campbell St, Cornwall, ON K6H 6C3',
      serviceArea: 'Cornwall & SDG',
      serviceRadiusKm: 60,
      specialties: ['Snow Removal', 'Landscaping', 'General Maintenance'],
      isActive: true,
    },
  })

  // ── Vendor Credentials ────────────────────────────────────────────────────────
  await prisma.vendorCredential.createMany({
    data: [
      { vendorId: vendorSDGPlumbing.id, type: 'Master Plumber License', credentialNumber: 'MP-ON-48291', expiresAt: new Date('2026-12-31'), verified: true },
      { vendorId: vendorSDGPlumbing.id, type: 'TSSA Gas Fitter', credentialNumber: 'GF2-ON-11934', expiresAt: new Date('2025-11-30'), verified: true },
      { vendorId: vendorCornwallElec.id, type: 'Electrical Safety Authority', credentialNumber: 'ESA-6649201', expiresAt: new Date('2026-06-30'), verified: true },
      { vendorId: vendorCornwallElec.id, type: 'Master Electrician', credentialNumber: 'ME-ON-39042', expiresAt: new Date('2027-03-31'), verified: true },
      { vendorId: vendorSeaway.id, type: 'WSIB Clearance Certificate', credentialNumber: 'WSIB-2024-882741', expiresAt: new Date('2025-12-31'), verified: true },
    ],
    skipDuplicates: true,
  })

  // ── Vendor Skills ─────────────────────────────────────────────────────────────
  await prisma.vendorSkill.createMany({
    data: [
      { vendorId: vendorSDGPlumbing.id, category: 'Plumbing' },
      { vendorId: vendorSDGPlumbing.id, category: 'HVAC' },
      { vendorId: vendorCornwallElec.id, category: 'Electrical' },
      { vendorId: vendorSeaway.id, category: 'Snow Removal' },
      { vendorId: vendorSeaway.id, category: 'Landscaping' },
      { vendorId: vendorSeaway.id, category: 'General Maintenance' },
    ],
    skipDuplicates: true,
  })

  // ── Properties ────────────────────────────────────────────────────────────────
  const propBW1 = await prisma.property.upsert({
    where: { id: 'prop_bw_main' },
    update: {},
    create: { id: 'prop_bw_main', name: 'Main Hotel Building', address: '1515 Vincent Massey Dr, Cornwall, ON', organizationId: orgBW.id, isActive: true },
  })
  const propBW2 = await prisma.property.upsert({
    where: { id: 'prop_bw_pool' },
    update: {},
    create: { id: 'prop_bw_pool', name: 'Pool & Fitness Wing', address: '1515 Vincent Massey Dr, Cornwall, ON', organizationId: orgBW.id, isActive: true },
  })
  const propFarran1 = await prisma.property.upsert({
    where: { id: 'prop_farran_main' },
    update: {},
    create: { id: 'prop_farran_main', name: 'Campground Main Site', address: '16480 County Rd 2, Long Sault, ON', organizationId: orgFarran.id, isActive: true },
  })
  const propFarran2 = await prisma.property.upsert({
    where: { id: 'prop_farran_bath' },
    update: {},
    create: { id: 'prop_farran_bath', name: 'Washroom & Shower Block', address: '16480 County Rd 2, Long Sault, ON', organizationId: orgFarran.id, isActive: true },
  })
  const propMarina1 = await prisma.property.upsert({
    where: { id: 'prop_marina_dock' },
    update: {},
    create: { id: 'prop_marina_dock', name: 'Dockside Facilities', address: '100 Water St E, Cornwall, ON', organizationId: orgMarina.id, isActive: true },
  })

  // ── Users ───────────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('demo123', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', passwordHash: password, name: 'Admin User', role: "ADMIN" },
  })

  const userOp1 = await prisma.user.upsert({
    where: { email: 'operator1@demo.com' },
    update: {},
    create: { email: 'operator1@demo.com', passwordHash: password, name: 'Sarah Mitchell', role: "OPERATOR", organizationId: orgBW.id },
  })

  const userOp2 = await prisma.user.upsert({
    where: { email: 'operator2@demo.com' },
    update: {},
    create: { email: 'operator2@demo.com', passwordHash: password, name: 'James Tremblay', role: "OPERATOR", organizationId: orgFarran.id },
  })

  await prisma.user.upsert({
    where: { email: 'operator3@demo.com' },
    update: {},
    create: { email: 'operator3@demo.com', passwordHash: password, name: 'Marina Manager', role: "OPERATOR", organizationId: orgMarina.id },
  })

  const userVendor1 = await prisma.user.upsert({
    where: { email: 'vendor1@demo.com' },
    update: {},
    create: { email: 'vendor1@demo.com', passwordHash: password, name: 'Mike Plumber', role: "VENDOR", vendorId: vendorSDGPlumbing.id },
  })

  const userVendor2 = await prisma.user.upsert({
    where: { email: 'vendor2@demo.com' },
    update: {},
    create: { email: 'vendor2@demo.com', passwordHash: password, name: 'Ellen Sparks', role: "VENDOR", vendorId: vendorCornwallElec.id },
  })

  await prisma.user.upsert({
    where: { email: 'vendor3@demo.com' },
    update: {},
    create: { email: 'vendor3@demo.com', passwordHash: password, name: 'Tom Seaway', role: "VENDOR", vendorId: vendorSeaway.id },
  })

  // ── Service Requests ────────────────────────────────────────────────────────
  const req1 = await prisma.serviceRequest.upsert({
    where: { id: 'req_001' },
    update: {},
    create: {
      id: 'req_001',
      referenceNumber: 'SR-2024-001',
      title: 'Burst pipe in Room 214',
      description: 'Guest reported water spraying from wall pipe in bathroom. Room has been vacated. Urgent repair needed.',
      category: 'Plumbing',
      propertyId: propBW1.id,
      organizationId: orgBW.id,
      urgency: "EMERGENCY",
      status: "COMPLETED",
    },
  })

  const req2 = await prisma.serviceRequest.upsert({
    where: { id: 'req_002' },
    update: {},
    create: {
      id: 'req_002',
      referenceNumber: 'SR-2024-002',
      title: 'Electrical panel tripping breakers',
      description: 'Main electrical panel in the basement is continuously tripping circuit breakers. Affects guest room floors 2-3.',
      category: 'Electrical',
      propertyId: propBW1.id,
      organizationId: orgBW.id,
      urgency: "HIGH",
      status: "IN_PROGRESS",
    },
  })

  const req3 = await prisma.serviceRequest.upsert({
    where: { id: 'req_003' },
    update: {},
    create: {
      id: 'req_003',
      referenceNumber: 'SR-2024-003',
      title: 'Snow removal - main parking lot',
      description: 'Heavy overnight snowfall. Parking lot and entrance walkways need clearing before 7am guest checkout.',
      category: 'Snow Removal',
      propertyId: propBW1.id,
      organizationId: orgBW.id,
      urgency: "HIGH",
      status: "DISPATCHED",
    },
  })

  const req4 = await prisma.serviceRequest.upsert({
    where: { id: 'req_004' },
    update: {},
    create: {
      id: 'req_004',
      referenceNumber: 'SR-2024-004',
      title: 'Campground shower block - cold water only',
      description: 'Hot water heater for the shower block appears to have failed. Campers are complaining. Needs same-day fix.',
      category: 'Plumbing',
      propertyId: propFarran2.id,
      organizationId: orgFarran.id,
      urgency: "HIGH",
      status: "TRIAGED",
    },
  })

  const req5 = await prisma.serviceRequest.upsert({
    where: { id: 'req_005' },
    update: {},
    create: {
      id: 'req_005',
      referenceNumber: 'SR-2024-005',
      title: 'Marina dock lighting not working',
      description: 'Several dock light fixtures are out. Safety concern for evening boat arrivals. 6 fixtures need replacement.',
      category: 'Electrical',
      propertyId: propMarina1.id,
      organizationId: orgMarina.id,
      urgency: "MEDIUM",
      status: "SUBMITTED",
    },
  })

  const req6 = await prisma.serviceRequest.upsert({
    where: { id: 'req_006' },
    update: {},
    create: {
      id: 'req_006',
      referenceNumber: 'SR-2024-006',
      title: 'Pool HVAC unit making loud noise',
      description: 'The HVAC unit in the pool area is making a loud grinding noise. Started yesterday. Pool is still open but needs inspection.',
      category: 'HVAC',
      propertyId: propBW2.id,
      organizationId: orgBW.id,
      urgency: "MEDIUM",
      status: "SUBMITTED",
    },
  })

  // ── Jobs ────────────────────────────────────────────────────────────────────
  const job1 = await prisma.job.upsert({
    where: { id: 'job_001' },
    update: {},
    create: {
      id: 'job_001',
      serviceRequestId: req1.id,
      vendorId: vendorSDGPlumbing.id,
      organizationId: orgBW.id,
      status: "COMPLETED",
      acceptedAt: new Date('2024-12-10T08:00:00Z'),
      enRouteAt: new Date('2024-12-10T08:30:00Z'),
      arrivedAt: new Date('2024-12-10T09:00:00Z'),
      completedAt: new Date('2024-12-10T11:30:00Z'),
      totalLabourHours: 3.5,
      totalMaterialsCost: 73.00,
      totalCost: 358.00,
      completionSummary: 'Replaced 2ft section of 3/4" copper pipe. Water restored. No further leaks detected.',
    },
  })

  const job2 = await prisma.job.upsert({
    where: { id: 'job_002' },
    update: {},
    create: {
      id: 'job_002',
      serviceRequestId: req2.id,
      vendorId: vendorCornwallElec.id,
      organizationId: orgBW.id,
      status: "ON_SITE",
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
      serviceRequestId: req3.id,
      vendorId: vendorSeaway.id,
      organizationId: orgBW.id,
      status: "ACCEPTED",
      acceptedAt: new Date('2024-12-12T05:30:00Z'),
    },
  })

  // ── Job Notes ───────────────────────────────────────────────────────────────
  await prisma.jobNote.createMany({
    data: [
      { jobId: job1.id, userId: userVendor1.id, text: 'Arrived on site. Located burst in main supply line behind wall panel. Will need to shut off water to wing.' },
      { jobId: job1.id, userId: userVendor1.id, text: 'Repair complete. Replaced 2ft section of 3/4" copper pipe. Water restored. No further leaks detected.' },
      { jobId: job2.id, userId: userVendor2.id, text: 'Panel inspection in progress. Found corroded bus bar on circuits 12-16. Sourcing replacement part.' },
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

  // ── Invoices ────────────────────────────────────────────────────────────────
  await prisma.invoice.upsert({
    where: { id: 'inv_001' },
    update: {},
    create: {
      id: 'inv_001',
      serviceRequestId: req1.id,
      organizationId: orgBW.id,
      invoiceNumber: 'INV-2024-001',
      amount: 358.00,
      status: "SENT",
    },
  })

  // ── Notifications ────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: userOp1.id, title: 'Job Completed', body: 'SDG Plumbing has completed the burst pipe repair in Room 214.', read: true },
      { userId: userOp1.id, title: 'Invoice Ready', body: 'Invoice #INV-2024-001 for $358.00 is ready for review.', read: false },
      { userId: userOp1.id, title: 'Vendor En Route', body: 'Seaway Snow & Grounds is en route for snow removal.', read: false },
      { userId: userVendor1.id, title: 'New Job Offer', body: 'You have a new job offer: Campground shower block - cold water only.', read: false },
      { userId: userVendor2.id, title: 'Job Updated', body: 'Notes have been added to your active electrical job at Best Western.', read: false },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed complete!')
  console.log('   Organizations: 3 (operators)')
  console.log('   Vendors: 3')
  console.log('   Users: 7 (1 admin, 3 operators, 3 vendors)')
  console.log('   Properties: 5')
  console.log('   Service Requests: 6')
  console.log('   Jobs: 3')
  console.log('   Invoices: 1')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
