"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { income, expenses, artworks, type ExpenseCategory } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createIncome(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const date = formData.get("date") as string;
  const amount = formData.get("amount") as string;
  const description = formData.get("description") as string;
  const artworkId = (formData.get("artworkId") as string) || null;

  if (!date) return { error: "Date is required" };
  if (!amount) return { error: "Amount is required" };
  if (!description) return { error: "Description is required" };

  if (artworkId) {
    const [artwork] = await db.select().from(artworks)
      .where(and(eq(artworks.id, artworkId), eq(artworks.userId, user.id)));
    if (!artwork) return { error: "Artwork not found" };
  }

  await db.insert(income).values({
    userId: user.id,
    date,
    amount,
    description,
    artworkId,
  });

  revalidatePath("/finance");
  revalidatePath("/finance/income");
  return {};
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const date = formData.get("date") as string;
  const amount = formData.get("amount") as string;
  const category = formData.get("category") as ExpenseCategory;
  const description = formData.get("description") as string;
  const file = formData.get("receipt") as File | null;

  if (!date) return { error: "Date is required" };
  if (!amount) return { error: "Amount is required" };
  if (!category) return { error: "Category is required" };

  const hasFile = !!file && file.size > 0;
  if (hasFile) {
    if (file.size > 20 * 1024 * 1024) return { error: "Receipt must be under 20MB" };
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return { error: "Receipt must be an image or PDF" };
    }
  }

  const [row] = await db.insert(expenses).values({
    userId: user.id,
    date,
    amount,
    category,
    description: description || null,
  }).returning();

  if (hasFile) {
    const ext = file!.name.split(".").pop();
    const path = `${user.id}/${row.id}/receipt.${ext}`;
    const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file!);
    if (uploadError) {
      await db.delete(expenses).where(and(eq(expenses.id, row.id), eq(expenses.userId, user.id)));
      return { error: `Receipt upload failed: ${uploadError.message}` };
    }

    await db.update(expenses).set({ receiptPath: path })
      .where(and(eq(expenses.id, row.id), eq(expenses.userId, user.id)));
  }

  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  return {};
}
