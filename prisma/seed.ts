import { PrismaClient, ReviewSource, ReplyType } from "@prisma/client";
// Falls dein Rollen-Enum "MembershipRole" oder "Role" heißt, importiere es hier:
// import { MembershipRole } from "@prisma/client";
// oder:
// import { Role as MembershipRole } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = "demo-tenant-id";

async function main() {
  // Admin-User
  const passwordHash = await (await import("bcrypt")).hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin", passwordHash },
  });

  // Tenant + Membership (mit slug & Enum-Role)
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: "Demo GmbH", slug: "demo-gmbh" }, // ← slug ergänzt
  });

  // HINWEIS: Passe den Enum-Namen unten an DEIN Schema an:
  // - Wenn dein Enum "MembershipRole" heißt: role: MembershipRole.ADMIN
  // - Wenn dein Enum "Role" heißt:          role: Role.ADMIN
  // - Wenn dein Enum lowercase-Werte hat:   role: "admin" (dann ohne Import)
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } }, // setzt @@unique([userId, tenantId], name: "userId_tenantId") voraus
    update: {
      // role: MembershipRole.ADMIN,
      role: "ADMIN" as any, // ← falls dein Enum anders heißt: oben import anpassen und diese Zeile ersetzen
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      // role: MembershipRole.ADMIN,
      role: "ADMIN" as any,
    },
  });

  // Locations
  const locA = await prisma.location.upsert({
    where: { id: "loc-a" },
    update: {},
    create: { id: "loc-a", tenantId: TENANT_ID, name: "Dorfstraße" },
  });
  const locB = await prisma.location.upsert({
    where: { id: "loc-b" },
    update: {},
    create: { id: "loc-b", tenantId: TENANT_ID, name: "City Center" },
  });

  // Reviews (+ teilweise Replies)
  const today = new Date();
  const ratings = [5, 4, 3, 2, 1];

  for (let i = 0; i < 15; i++) {
    const publishedAt = new Date(today.getTime() - i * 86400000);
    const locationId = i % 2 === 0 ? locA.id : locB.id;

    const review = await prisma.review.create({
      data: {
        tenantId: TENANT_ID,
        locationId,
        source: ReviewSource.GOOGLE, // Enum statt String
        rating: ratings[i % ratings.length],
        authorName: `Kunde ${i + 1}`,
        text: i % 3 === 0 ? null : `Sehr guter Service #${i + 1}`,
        publishedAt,
      },
    });

    // Jede 5. Review bekommt eine Reply
    if (i % 5 === 0) {
      const postedAt = new Date(publishedAt.getTime() + 3600_000);
      await prisma.reply.create({
        data: {
          reviewId: review.id,
          text: `Vielen Dank für Ihr Feedback #${i + 1}!`,
          postedAt,
          postedByUserId: user.id,
          type: ReplyType.MANUAL, // Enum statt String
        },
      });
      await prisma.review.update({
        where: { id: review.id },
        data: { answeredAt: postedAt },
      });
    }
  }

  console.log("Seeding done. Login: admin@example.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
