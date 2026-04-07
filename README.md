# Bar Management System

A full-stack bar management application built with **Next.js**, **Drizzle ORM**, and **PostgreSQL**. It handles daily stock operations, purchase orders, credit sales, and activity tracking for both employees and admins.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Actions)
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **UI**: Tailwind CSS, shadcn/ui, MUI DataGrid
- **Auth**: Session-based (cookie)

### Why Drizzle ORM

Drizzle is used because it is fully type-safe — the schema is defined in TypeScript and all queries are typed end-to-end. There is no code generation step, migrations are straightforward, and it works natively with Next.js Server Actions without any extra setup.

---

## Roles

The system has two roles:

- **ADMIN** — full access: manages users, products, reviews reports, approves purchase orders
- **EMPLOYEE** — operational access: verifies stock, records sales, creates purchase orders, manages credits

---

## Daily Flow

### 1. Employee Opens the Day — Stock Verification

When the employee arrives, the first thing they do is open a **Stock Day**. The system creates a snapshot of every product with its expected opening stock (carried over from the previous day's closing stock).

The employee then physically counts each product on the shelf and enters the actual quantity found. This is called **stock verification**. Once all products are verified, the stock day status moves from `OPEN` to `VERIFIED`.

- If the actual count matches the expected count → no variance
- If there is a difference → the system records the variance for the admin to review

### 2. Employee Starts Selling

After verifying the stock, the employee can start recording sales. Each sale reduces the stock quantity and logs a `SOLD` stock action with the selling price and quantity.

### 3. Employee Creates a Purchase Order

When stock is running low, the employee creates a **Purchase Order** in `DRAFT` status. They add the products they need with the desired quantities and unit costs. The order can be edited freely while in draft.

Once ready, the employee submits the order — status moves to `SUBMITTED`.

### 4. Admin Reviews and Confirms the Purchase Order

The admin reviews the submitted order and either:
- **Confirms** it — approves the quantities, status moves to `CONFIRMED`
- **Rejects** it — status moves to `REJECTED_FOR_STOCK`

### 5. Employee Executes the Order at the Market

The employee goes to the market and records the actual quantities found for each item. Status moves to `EXECUTED_AT_MARKET`.

### 6. Stock is Entered

Once back, the employee enters the stock into the system. The system automatically:
- Adds the quantities to the product stock
- Creates stock action records (`STOCK_IN`)
- Links the entry to the current open stock day

Status moves to `STOCK_ENTERED` — this is final and cannot be repeated.

### 7. Employee Closes the Day

At the end of the day, the employee closes the stock day. The system records the closing stock for every product. Status moves to `CLOSED`.

---

## Purchase Order Status Flow

```
DRAFT → SUBMITTED → CONFIRMED → EXECUTED_AT_MARKET → STOCK_ENTERED
                              ↘ REJECTED_FOR_STOCK
         ↘ CANCELLED
```

---

## Stock Day Status Flow

```
OPEN → VERIFIED → CLOSED
```

---

## Product Management (Admin)

- Create products with name, type (BEER, SODA, WINE, SPIRIT, LIQUOR), size, buying price, and selling price
- Edit products — name, type, size, and prices can be changed at any time
- Duplicate detection — two active products cannot share the same name + type + size
- Archive products — only allowed if current stock is zero
- All product changes are recorded in the activity log with old and new values

---

## Credit Sales

Employees can record credit sales for customers who pay later. Each credit sale tracks:
- Customer name and phone number
- Products sold and total amount
- Payment status (`UNPAID` / `PAID`)

When the customer pays, the employee marks the credit as paid.

---

## Activity Log

Every significant action in the system is recorded:
- Product created, updated, archived
- Stock in, sold, broken, counted
- Purchase order created, confirmed, stock entered
- Credit sales created and paid
- User login and profile changes

Admins can view the full activity log. Employees see only their own activity.

---

## User Management (Admin only)

- Create employees with name, email, phone, and password
- Disable or enable employee accounts
- Each user can change their own password from their profile

---

## Test Credentials

| Role | Phone | Password |
|------|-------|----------|
| Admin | +250788123456 | admin123 |
| Employee | +250788123457 | john123 |
| Employee | +250788123458 | jane123 |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

Configure your database connection in `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bar_management
```

Run migrations:

```bash
npm run db:push
```
