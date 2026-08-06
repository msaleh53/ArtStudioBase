import type { ExpenseCategory } from "@/db/schema";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "supplies", "framing", "printing", "studio_rent", "shipping",
  "website_fees", "submission_fees", "other",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  supplies: "Supplies",
  framing: "Framing",
  printing: "Printing",
  studio_rent: "Studio Rent",
  shipping: "Shipping",
  website_fees: "Website Fees",
  submission_fees: "Submission Fees",
  other: "Other",
};
