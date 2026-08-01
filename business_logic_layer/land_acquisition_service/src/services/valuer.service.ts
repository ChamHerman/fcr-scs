import { prisma } from "../prisma";
import { UserRole } from "@prisma/client";

export async function getAvailableValuers() {
  const valuers = await prisma.user.findMany({
    where: {
      role: UserRole.LAND_VALUER,
      isActive: true,
    },
    select: {
      userId: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return valuers;
}
