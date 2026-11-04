import { beforeAll } from "vitest";
import { prisma } from "../src/lib/db";
import { seedTestFixtures } from "./test-seed";

beforeAll(async () => {
  await seedTestFixtures(prisma);
});
