import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, type UpsertUser } from "@shared/schema";

export const storage = {
  async upsertUser(userData: UpsertUser) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userData.id),
    });

    if (existingUser) {
      await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, userData.id));
      return;
    }

    await db.insert(users).values(userData);
  },
};
