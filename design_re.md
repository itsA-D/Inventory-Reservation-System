Implementation Plan — Premium Frontend Redesign
This plan outlines the end-to-end redesign of the Allo Inventory Reservation frontend to meet the SaaS-style dashboard requirements. It strictly respects the LOCKED backend constraint (leaving app/api, lib/reservation, prisma, database, redis, and cron untouched).

1. Goal Description
To rebuild the frontend layer from scratch, elevating a plain, basic template into a premium, responsive, and dynamic SaaS-style Inventory ERP/Warehouse platform. We will implement:

Collapsible sidebar and top navbar layout.
Executive summary metrics (Hero Metrics) on the main dashboard.
A high-performance, feature-rich TanStack Table for inventory management.
Live warehouse utilization analytics using Recharts.
A visual reservation timeline.
Zoomable product media components.
Interactive countdowns and custom micro-animations (Framer Motion).
Responsive layouts (Mobile/Tablet/Desktop grid optimization).
2. User Review Required
IMPORTANT

A-Drive Workaround for System Disk Storage: Since the user's C drive has 0 GB free space, npm package installation has been configured to use A:\.npm-cache as the cache location, resolving npm errors. All commands will run using this configuration.

TIP

Framer Motion & TanStack Table: Both libraries, along with Recharts, have been successfully installed and are ready for use.

3. Open Questions
No open questions. The design specifications in DESIGN_ARCHITECTURE.md are highly prescriptive and will be implemented precisely as written.

4. Proposed Changes
We will introduce a highly modular, clean folder structure in the frontend:

Components & Layout
[NEW] 
Sidebar.tsx
Collapsible sidebar navigation featuring workspace selection, quick links, active reservation indicator badges, and collapse/expand transition animations via Framer Motion.

[NEW] 
Navbar.tsx
Top navbar displaying the current page breadcrumbs, system database status (active/mocked SQLite indicators), active filters, and dark mode controls.

[MODIFY] 
layout.tsx
Refactor the root layout to integrate the responsive collapsible sidebar and global navigation wrapper.

Dashboard & Analytics
[MODIFY] 
page.tsx
Refactor the homepage from a simple product listing into a comprehensive, high-fidelity SaaS dashboard. It will fetch all necessary inventory, product, and reservation statistics directly on the server via Prisma (avoiding HTTP loopback fetches) and render:

Metric cards (Products, Reserved units, Available units, Expiring soon).
The advanced TanStack Inventory Table.
Recharts-powered warehouse utilization charts.
The recent reservation timeline.
[NEW] 
MetricCard.tsx
Sleek KPI metrics cards with micro-animations, loading skeletons, trend alerts, and focus rings.

[NEW] 
WarehouseAnalytics.tsx
Visually striking utilization pressure meters and charts showing capacity limits (reservedUnits / totalUnits) per warehouse.

[NEW] 
ReservationTimeline.tsx
A live feed showing recent checkout creations, confirmations, releases, or expires, with links to details.

Inventory Table & Product Details
[NEW] 
InventoryTable.tsx
High-performance table built using @tanstack/react-table supporting:

Sticky headers and column resizing.
Multi-column sorting, textual search, and pagination.
Fluid horizontal scroll wrappers (overflow-x-auto) to eliminate container breaks.
Responsive mobile cards view when the screen is under 768px.
[NEW] 
page.tsx
A premium details page for each SKU.

Left Panel: High-quality next/image media component, dynamic descriptions, and technical specifications.
Right Panel: Warehouse selection cards showing stock breakdown, utilization pressure bars, and a prominent "Reserve 1 Unit" checkout CTA.
[NEW] 
ImageViewer.tsx
Media viewer component supporting zoom-in lightbox modals, lazy-loading, blur placeholders, and fallback images for products.

Reservation & Checkout Details
[MODIFY] 
page.tsx
Refactor the checkout details page into a premium checkout screen:

Highlighted countdown timer turning red and pulsing (via Framer Motion) when < 60s remain.
Details of the product, warehouse locations, and confirmation actions (Confirm/Cancel).
Mobile-first vertical stacks.
[NEW] 
CountdownTimer.tsx
Framer-Motion-animated timer with a countdown and urgent pulsing effects.

5. Verification Plan
Automated Tests
Run npm run lint and npm run build to verify clean compiles.
Execute our new concurrency script npx ts-node scripts/test-concurrency.ts http://localhost:3000 to verify API and concurrency safety.
Manual Verification
Test viewport transitions (Desktop 4-col → Tablet 2-col → Mobile 1-col).
Verify dark/light mode switches.
Test scrollable tables, modal overlays, search filters, and checkout timers.
Audit for layout shifts (CLS), nested scrollbars, image clipping, and layout overflows.