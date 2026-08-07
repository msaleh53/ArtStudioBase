"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { materials, materialLogs } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createMaterial(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;
  const quantityRaw = ((formData.get("quantity") as string) || "0").trim() || "0";

  if (!name) return { error: "Name is required" };
  if (!unit) return { error: "Unit is required" };

  const quantity = Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { error: "Starting quantity must be a non-negative number" };
  }

  await db.transaction(async (tx) => {
    const [material] = await tx.insert(materials).values({
      userId: user.id,
      name,
      unit,
      quantity: quantityRaw,
    }).returning();

    if (quantity > 0) {
      await tx.insert(materialLogs).values({
        userId: user.id,
        materialId: material.id,
        date: new Date().toISOString().slice(0, 10),
        change: quantityRaw,
        note: "Opening balance",
      });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/materials");
  return {};
}

export async function logMaterialChange(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const materialId = formData.get("materialId") as string;
  const date = formData.get("date") as string;
  const changeRaw = formData.get("change") as string;
  const note = (formData.get("note") as string) || null;

  if (!materialId) return { error: "Material is required" };
  if (!date) return { error: "Date is required" };
  if (!changeRaw) return { error: "Change amount is required" };

  const change = Number(changeRaw);
  if (!Number.isFinite(change) || change === 0) {
    return { error: "Change must be a non-zero number" };
  }

  const result = await db.transaction(async (tx) => {
    const [material] = await tx.select().from(materials)
      .where(and(eq(materials.id, materialId), eq(materials.userId, user.id)))
      .for("update");
    if (!material) return { error: "Material not found" };

    const newQuantity = Number(material.quantity) + change;
    if (newQuantity < 0) return { error: `Not enough ${material.name} in stock` };

    await tx.insert(materialLogs).values({
      userId: user.id,
      materialId,
      date,
      change: changeRaw,
      note,
    });
    await tx.update(materials)
      .set({ quantity: sql`${materials.quantity} + ${changeRaw}::numeric` })
      .where(and(eq(materials.id, materialId), eq(materials.userId, user.id)));

    return {};
  });

  if (result.error) return result;

  revalidatePath("/inventory");
  revalidatePath("/inventory/materials");
  return {};
}
