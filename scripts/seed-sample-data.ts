import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { artworks, commissions, customers, exhibitions, exhibitionArtworks } from "../src/db/schema";

config({ path: ".env.local" });

const email = process.argv[2];
const imagesDir = process.argv[3];

if (!email || !imagesDir) {
  console.error("Usage: npm run seed:sample -- <email> <imagesDir>");
  process.exit(1);
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(sql);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const imageFiles = readdirSync(imagesDir).filter((f) =>
    IMAGE_EXTENSIONS.includes(extname(f).toLowerCase()),
  );
  if (imageFiles.length === 0) {
    console.error(`No image files (${IMAGE_EXTENSIONS.join(", ")}) found in ${imagesDir}`);
    process.exit(1);
  }
  imageFiles.sort();

  const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }
  const authUser = usersPage.users.find((u) => u.email === email);
  if (!authUser) {
    console.error(`No Supabase Auth user found for ${email}. Run "npm run seed -- ${email} <password>" first.`);
    process.exit(1);
  }
  const userId = authUser.id;

  const today = new Date();

  // Customers
  const [alex, jordan] = await db
    .insert(customers)
    .values([
      { userId, name: "Alex Rivera", email: "alex@example.com", phone: "555-0101" },
      { userId, name: "Jordan Blake", email: "jordan@example.com", phone: "555-0102" },
    ])
    .returning();

  // Artworks (statuses chosen to populate every dashboard status tile)
  const artworkSpecs = [
    { title: "Coastal Morning", medium: "Oil on canvas", dimensions: "24x36 in", price: "650", status: "in_progress" as const },
    { title: "Quiet Orchard", medium: "Acrylic on panel", dimensions: "18x24 in", price: "420", status: "finished" as const },
    { title: "Harbor Light", medium: "Watercolor", dimensions: "12x16 in", price: "280", status: "exhibited" as const },
    { title: "Autumn Study", medium: "Oil on canvas", dimensions: "20x20 in", price: "500", status: "sold" as const },
  ];

  const insertedArtworks = [];
  for (let i = 0; i < artworkSpecs.length; i++) {
    const spec = artworkSpecs[i];
    const [row] = await db.insert(artworks).values({ userId, ...spec }).returning();

    const imageFile = imageFiles[i % imageFiles.length];
    const ext = extname(imageFile).toLowerCase();
    const buffer = readFileSync(join(imagesDir, imageFile));
    const path = `${userId}/${row.id}/original${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("artwork-images")
      .upload(path, buffer, { contentType: CONTENT_TYPES[ext] });
    if (uploadError) {
      console.error(`Failed to upload image for "${spec.title}":`, uploadError.message);
      continue;
    }
    await db
      .update(artworks)
      .set({ imagePath: path })
      .where(and(eq(artworks.id, row.id), eq(artworks.userId, userId)));
    insertedArtworks.push({ ...row, imagePath: path });
    console.log("Created artwork:", spec.title);
  }

  // Commissions: one overdue (needs-attention + red styling), one upcoming, one delivered (should NOT show as needs-attention)
  await db.insert(commissions).values([
    {
      userId,
      customerId: alex.id,
      stage: "painting",
      deadline: addDays(today, -3),
      progressNotes: "Underpainting complete, working on highlights.",
    },
    {
      userId,
      customerId: jordan.id,
      stage: "inquiry",
      deadline: addDays(today, 3),
      progressNotes: "Awaiting deposit.",
    },
    {
      userId,
      customerId: alex.id,
      stage: "delivered",
      deadline: addDays(today, -30),
      progressNotes: "Delivered and framed.",
    },
  ]);
  console.log("Created 3 commissions");

  // Exhibitions: one within the dashboard's upcoming window, one outside it
  const [nearExhibition, autumnSalon] = await db
    .insert(exhibitions)
    .values([
      {
        userId,
        galleryName: "Downtown Gallery",
        submissionDeadline: addDays(today, 5),
        startDate: addDays(today, 20),
        endDate: addDays(today, 40),
      },
      {
        userId,
        galleryName: "Autumn Salon",
        submissionDeadline: addDays(today, 60),
        startDate: addDays(today, 90),
        endDate: addDays(today, 100),
      },
    ])
    .returning();
  console.log("Created 2 exhibitions");

  const exhibitedArtwork = insertedArtworks.find((a) => a.status === "exhibited");
  if (exhibitedArtwork && nearExhibition) {
    await db.insert(exhibitionArtworks).values({
      exhibitionId: nearExhibition.id,
      artworkId: exhibitedArtwork.id,
    });
    console.log("Assigned an artwork to Downtown Gallery");
  }

  const finishedArtwork = insertedArtworks.find((a) => a.status === "finished");
  if (finishedArtwork && autumnSalon) {
    await db.insert(exhibitionArtworks).values({
      exhibitionId: autumnSalon.id,
      artworkId: finishedArtwork.id,
    });
    console.log("Assigned an artwork to Autumn Salon");
  }

  console.log("Sample data seed complete.");
}

main()
  .then(() => sql.end())
  .catch(async (e) => {
    console.error(e);
    await sql.end();
    process.exit(1);
  });
