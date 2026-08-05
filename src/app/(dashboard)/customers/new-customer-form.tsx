"use client";

import { useState, useTransition } from "react";
import { createCustomer } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewCustomerForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createCustomer(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById("customer-form") as HTMLFormElement)?.reset();
      })}
      id="customer-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8 grid grid-cols-2 gap-3"
    >
      {error && <p className="text-sm text-red-600 col-span-2">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill col-span-2 w-fit">
        Add customer
      </Button>
    </form>
  );
}
