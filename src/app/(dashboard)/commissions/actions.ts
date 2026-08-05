"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { commissions, customers, type CommissionStage } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createCommission(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const customerId = formData.get("customerId") as string;
  const deadline = formData.get("deadline") as string;
  if (!customerId) return { error: "Customer is required" };

  const [customer] = await db.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.userId, user.id)));
  if (!customer) return { error: "Customer not found" };

  await db.insert(commissions).values({
    userId: user.id,
    customerId,
    deadline: deadline || null,
  });

  revalidatePath("/commissions");
  return {};
}

export async function updateCommissionStage(id: string, stage: CommissionStage) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await db.update(commissions).set({ stage, updatedAt: new Date() }).where(and(eq(commissions.id, id), eq(commissions.userId, user.id)));
  revalidatePath("/commissions");
  return {};
}

export async function updateProgressNotes(id: string, notes: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await db.update(commissions).set({ progressNotes: notes, updatedAt: new Date() }).where(and(eq(commissions.id, id), eq(commissions.userId, user.id)));
  revalidatePath("/commissions");
  return {};
}
