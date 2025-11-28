import { db } from "./db";
import { stadiums, eq } from "@shared/schema";
import type { InsertStadium, Stadium } from "@shared/schema";

export class TempStorage {
  async getStadiums(clubId: number, seasonId: number): Promise<any[]> {
    return await db.select().from(stadiums)
      .where(eq(stadiums.clubId, clubId) && eq(stadiums.seasonId, seasonId));
  }

  async getStadium(id: number): Promise<any> {
    const [stadium] = await db.select().from(stadiums).where(eq(stadiums.id, id));
    return stadium;
  }

  async createStadium(stadium: InsertStadium): Promise<any> {
    const [created] = await db
      .insert(stadiums)
      .values(stadium as any)
      .returning();
    return created;
  }

  async updateStadium(id: number, stadium: Partial<InsertStadium>): Promise<any> {
    const [updated] = await db
      .update(stadiums)
      .set(stadium as any)
      .where(eq(stadiums.id, id))
      .returning();
    return updated;
  }

  async deleteStadium(id: number): Promise<void> {
    await db.delete(stadiums).where(eq(stadiums.id, id));
  }
}

export const tempStorage = new TempStorage();