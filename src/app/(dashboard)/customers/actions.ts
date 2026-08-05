"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  await db.insert(customers).values({
    userId: user.id,
    name,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/customers");
  return {};
}
