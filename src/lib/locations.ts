import { prisma } from "@/lib/prisma";

export async function listTenantLocations(tenantId: string, allowedLocationIds?: string[]) {
  const where: any = { tenantId };
  if (allowedLocationIds && allowedLocationIds.length) {
    where.id = { in: allowedLocationIds };
  }

  const rows = await prisma.location.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return rows; // [{id, name}]
}
