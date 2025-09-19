// prisma/seed.ts
import { PrismaClient } from "@prisma/client"
import { hash } from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  // Passwort-Hash erzeugen
  const passwordHash = await hash("change-me-123", 10)

  // Tenant (Organisation) anlegen oder updaten
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },       // <– where auf ein eindeutiges Feld
    update: {},
    create: {
      name: "Demo Tenant",
      slug: "demo",                // <– slug mitgeben (required)
      plan: "BASIC",
    },
  })

  // User anlegen oder updaten
  const user = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: { passwordHash },
    create: {
      email: "admin@demo.local",
      name: "Demo Admin",
      passwordHash,
      memberships: {
        create: { tenantId: tenant.id, role: "ADMIN" },
      },
    },
  })

  console.log("Seed OK → Login mit:")
  console.log("E-Mail: admin@demo.local")
  console.log("Passwort: change-me-123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
