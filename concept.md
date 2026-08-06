Target System: Artist Studio Management System (Portfolio Project)
Tech Stack: Next.js (App Router), Supabase (Postgres, Auth, Storage), Tailwind CSS, Shadcn UI
Goal: Build a full-stack, visually rich MVP application optimized for an independent artist's workflow.

---

### 1. SYSTEM OVERVIEW & ARCHITECTURAL RULES
- The system must use Next.js Server Actions or Route Handlers for backend operations.
- UI components must leverage Tailwind CSS and Shadcn UI primitives for accessibility and high aesthetic polish.
- Database: Supabase PostgreSQL managed via Prisma or Drizzle ORM [Agent: Choose the cleanest ORM fit].
- File Storage: Leverage Supabase Storage Buckets to securely host high-resolution artwork uploads.

---

### 2. CORE FEATURE SPECIFICATIONS (MVP SCOPE)

#### Feature 1: Visual Artwork Inventory Catalog
- Create an 'Artworks' table schema: id, title, medium, dimensions, price, status, image_url, user_id.
- Status Options: [In Progress, Finished, Exhibited, Sold].
- UI Requirement: A responsive Shadcn-based Card gallery layout displaying artwork images. Cards must show a color-coded badge for the current status. Include an upload form utilizing Supabase Storage to handle image asset uploads directly.

#### Feature 2: Commission Pipeline & Client CRM
- Create 'Customers' and 'Commissions' tables linked relationally.
- Track commissions through explicit pipeline stages: [Inquiry, Deposit Paid, Painting, Finished, Delivered].
- Include deadline management and a "progress notes" text field for active pieces.

#### Feature 3: Exhibition Calendar & Mapping
- Create an 'Exhibitions' table tracking Gallery Name, Submission Deadline, Start Date, and End Date.
- Create a join/mapping table to link multiple 'Artworks' to a single 'Exhibition'.
- Data Validation Rule: Prevent double-booking. If an artwork is assigned to an active exhibition or marked 'Sold', throw an error or validation warning if the user tries to assign it to another simultaneous event.

---

### 3. DATABASE SCHEMA RELATIONSHIPS
Implement the following relational structure in Postgres:
- auth.users (1) ----< Artworks (M) [Multi-tenant protection]
- Customers (1) ----< Commissions (M)
- Artworks (1) ----< Commissions (1)
- Artworks (1) ----< Exhibition_Mappings >---- (1) Exhibitions

---

### 4. INITIAL EXECUTION PROMPT FOR THE AGENT
Please execute this project incrementally. Do not generate all frontend code and backend schemas simultaneously.

Step 1: Generate the full database schema definitions (Prisma/Drizzle schema or raw Supabase SQL migrations) that reflect the visual inventory, commission tracking, and exhibition mapping described above. Include the necessary Row Level Security (RLS) configurations for user ownership.
Step 2: Output a functional TypeScript utility or Server Action template for handling image file uploads to a Supabase Storage bucket.
Step 3: Create the main Dashboard UI layout showcasing a mockup gallery of the Artwork inventory cards.
