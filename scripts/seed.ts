import { prisma } from '../lib/db';
import bcryptjs from 'bcryptjs';

async function main() {
  console.log('Seeding database...');

  // Create admin user (test account)
  const adminUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: await bcryptjs.hash('johndoe123', 10),
      name: 'Admin MotoGo',
      role: 'ADMIN',
    },
  });

  // Create admin profile if not exists
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
    },
  });

  // Create test client user
  const clientUser = await prisma.user.upsert({
    where: { email: 'cliente@motogo.com' },
    update: {},
    create: {
      email: 'cliente@motogo.com',
      password: await bcryptjs.hash('password123', 10),
      name: 'Cliente Prueba',
      role: 'CLIENT',
    },
  });

  // Create test driver user
  const driverUser = await prisma.user.upsert({
    where: { email: 'conductor@motogo.com' },
    update: {},
    create: {
      email: 'conductor@motogo.com',
      password: await bcryptjs.hash('password123', 10),
      name: 'Conductor Prueba',
      role: 'DRIVER',
    },
  });

  // Create driver profile
  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      licenseNumber: 'DRV123456',
      vehicleModel: 'Honda PCX 150',
      vehiclePlate: 'XYZ-123',
      averageRating: 4.8,
      totalRides: 25,
      status: 'online',
    },
  });

  // Create subscription for driver
  await prisma.subscription.upsert({
    where: { driverId: driver.id },
    update: {},
    create: {
      driverId: driver.id,
      status: 'ACTIVE',
      monthlyFee: 100.0,
      currency: 'MXN',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Create driver location
  await prisma.driverLocation.upsert({
    where: { driverId: driver.id },
    update: {
      latitude: 25.6866,
      longitude: -100.3161,
    },
    create: {
      driverId: driver.id,
      latitude: 25.6866, // Monterrey, MX coordinates
      longitude: -100.3161,
    },
  });

  // Create sample rides
  const ride1 = await prisma.ride.create({
    data: {
      clientId: clientUser.id,
      driverId: driverUser.id,
      originAddress: 'Av. Constitución, Monterrey',
      originLatitude: 25.6866,
      originLongitude: -100.3161,
      destinationAddress: 'Plaza Macroplaza, Monterrey',
      destinationLatitude: 25.6894,
      destinationLongitude: -100.3161,
      status: 'COMPLETED',
      fare: 85.5,
      estimatedDuration: 12,
      actualDuration: 15,
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completionTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    },
  });

  // Create rating for ride
  await prisma.rating.create({
    data: {
      rideId: ride1.id,
      fromUserId: clientUser.id,
      toUserId: driverUser.id,
      stars: 5,
      comment: 'Excelente servicio, muy puntual',
      isClientRating: true,
    },
  });

  // Create payment for ride
  await prisma.payment.create({
    data: {
      userId: clientUser.id,
      rideId: ride1.id,
      amount: 85.5,
      currency: 'MXN',
      type: 'RIDE_PAYMENT',
      status: 'COMPLETED',
      metadata: JSON.stringify({ description: 'Pago de viaje' }),
    },
  });

  console.log('Seeding completed successfully!');
  console.log('Test accounts created:');
  console.log('Admin: john@doe.com / johndoe123');
  console.log('Client: cliente@motogo.com / password123');
  console.log('Driver: conductor@motogo.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
