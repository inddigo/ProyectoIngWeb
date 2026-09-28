/* eslint-disable */
// Datos de demostración idempotentes. Las contraseñas se pueden sobrescribir
// con SEED_BAKER_PASSWORD / SEED_CLIENT_PASSWORD. Poner SEED_DEMO_DATA=false
// para no crear usuarios de demo (ej. en producción).
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function upsertUser(email, name, role, plainPassword) {
  const password = await bcrypt.hash(plainPassword, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, password },
  });
  console.log(`Usuario demo listo: ${user.email} (${user.role})`);
}

async function main() {
  if (process.env.SEED_DEMO_DATA === 'false') {
    console.log('SEED_DEMO_DATA=false: se omite el seed de demo');
    return;
  }
  await upsertUser(
    'pastelero@pasteleria.com',
    'Pastelero Principal',
    'BAKER',
    process.env.SEED_BAKER_PASSWORD || 'pastelero123',
  );
  await upsertUser(
    'cliente@pasteleria.com',
    'Cliente Demo',
    'CLIENT',
    process.env.SEED_CLIENT_PASSWORD || 'cliente123',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
