# 📋 Process Description: Product Editing

> **Purpose:** This document defines the complete business process for editing product information in the inventory management system, ensuring data integrity, proper authorization, and audit compliance.

---

## 1️⃣ Process Overview

### Process Name
**Name:** Product Information Update and Editing

### Process ID
**ID:** `PROC-PROD-001`

---

## 2️⃣ Purpose & Business Value

### Why does this process exist?

This process enables authorized users to modify product master data (name, type, size, prices, images) to reflect real-world changes such as supplier price updates, rebranding, product corrections, or status changes. It ensures the inventory system maintains accurate, up-to-date product information while preserving data integrity and maintaining a complete audit trail of all changes.

### Success Metrics
- Product data accuracy rate: 99%+
- Price update lag time: < 24 hours from supplier notification
- Zero unauthorized product modifications
- 100% audit trail coverage for all changes

---

## 3️⃣ Stakeholders & Actors

### Primary Actor
**Role:** Admin or Employee with product management permissions  
**Responsibility:** Update product details, prices, and status; ensure accuracy of changes

### Secondary Actors
| Role | Responsibility | Interaction Point |
|------|---------------|-------------------|
| Store Manager | Reviews price changes | Approval for significant price changes |
| Accountant | Monitors price changes | Daily/weekly price change reports |
| Inventory Auditor | Validates product data integrity | Monthly audit reviews |
| Stock Manager | Uses updated product info | Daily stock operations |

### External Systems
- **Stock Management System** - Reads current product quantities
- **Purchase Order System** - Uses product prices for ordering
- **Daily Stock Snapshots** - References product data
- **Audit Logging Service** - Records all product changes

---

## 4️⃣ Preconditions

### Required State
What must be true **before** this process can start?

- [x] User is authenticated and logged in
- [x] User has appropriate role (ADMIN or designated EMPLOYEE)
- [x] Product to be edited exists in the system
- [x] Product is not currently locked by another editing session
- [x] Related stock data is accessible

### Data Prerequisites
- Product record exists with valid UUID
- Current product data is loaded
- User permissions are verified
- Product type enum values are available
- Product status enum values are loaded

---

## 5️⃣ Trigger Events

### What initiates this process?

**User-Initiated:**
- User clicks "Edit" button on product list/detail screen
- User selects product from search results and clicks "Modify"
- User scans barcode and selects edit option

**Business-Initiated:**
- Supplier sends price update notification
- Product rebranding/repackaging event
- Discovery of data entry error
- Product size or specification change
- Product discontinuation decision

---

## 6️⃣ Process Flow (Main Scenario)

### Happy Path - Step by Step

| Step | Actor | Action | System Response |
|------|-------|--------|-----------------|
| 1 | User | Navigates to Products section | Displays list of all products with search/filter options |
| 2 | User | Searches for product or scrolls to find it | Shows matching products with current details |
| 3 | User | Clicks "Edit" button for selected product | Opens edit form with all fields pre-populated |
| 4 | System | Loads product data | Displays: name, type, size, image, buying price, selling price, status |
| 5 | System | Displays current stock information (read-only) | Shows current quantity from stocks table for reference |
| 6 | User | Modifies desired fields (name, type, size, prices, image, status) | Validates each field on blur/change |
| 7 | User | Updates buying price and/or selling price | System highlights price changes, shows old vs new |
| 8 | User | Changes product status (ACTIVE ↔ ARCHIVED) | System warns if archiving product with active stock |
| 9 | User | Uploads new product image (optional) | Validates image format, size; displays preview |
| 10 | User | Clicks "Save Changes" | Validates all inputs comprehensively |
| 11 | System | Validates business rules | Checks: prices > 0, selling price > buying price (warning), unique constraints |
| 12 | System | Updates product record | Commits changes with updated timestamp |
| 13 | System | Creates activity log entry | Records: user, timestamp, changed fields, old/new values |
| 14 | System | Displays success confirmation | Shows "Product updated successfully" with updated details |

### Process Diagram
```
[User] → [Search Product] → [Select Edit] → [Load Form] → [Modify Fields] → 
[Validate] → [Save] → [Update DB] → [Log Activity] → [Confirm]
```

---

## 7️⃣ Alternative Flows & Exception Handling

### Scenario A: Validation Failure - Invalid Price

**Condition:** User enters invalid price data  
**Trigger:** Buying price or selling price is negative, zero, or non-numeric  
**Response:**
1. System highlights invalid field in red
2. Displays error: "Price must be a positive number greater than 0"
3. Prevents form submission
4. Cursor moves to invalid field
5. User corrects and resubmits

---

### Scenario B: Permission Denied

**Condition:** User lacks product editing permissions  
**Trigger:** Employee without proper role attempts to edit  
**Response:**
1. System hides "Edit" button in UI
2. If accessed via direct URL, shows: "Access Denied: You do not have permission to edit products"
3. Logs unauthorized access attempt with user ID and timestamp
4. Redirects to products view-only page

---

### Scenario C: Archiving Product with Active Stock

**Condition:** User attempts to archive product that has stock quantity > 0  
**Trigger:** Status changed from ACTIVE to ARCHIVED with existing stock  
**Response:**
1. System displays warning modal:
   ```
   ⚠️ Warning: This product has 145 units in stock
   
   Archiving will:
   - Hide product from active listings
   - Prevent new purchase orders
   - Keep stock data intact for audit
   
   Are you sure you want to archive?
   [Cancel] [Archive Anyway]
   ```
2. If user confirms, proceeds with archiving
3. If user cancels, returns to edit form
4. Logs decision in activity log

---

### Scenario D: Price Change Warning - Margin Check

**Condition:** New selling price is less than or equal to buying price  
**Trigger:** Selling price ≤ buying price (zero or negative margin)  
**Response:**
1. System displays warning (not blocking):
   ```
   ⚠️ Profit Margin Warning
   
   Buying Price: 5,000 RWF
   Selling Price: 4,800 RWF
   Margin: -200 RWF (-4%)
   
   This product will be sold at a loss.
   Proceed anyway?
   [Cancel] [Save Anyway]
   ```
2. User can choose to continue or adjust prices
3. If continued, flags in activity log as "negative margin warning overridden"

---

### Scenario E: Concurrent Modification Conflict

**Condition:** Two users edit the same product simultaneously  
**Trigger:** User A and User B both have edit form open and submit changes  
**Response:**
1. System uses optimistic locking (checks `updatedAt` timestamp)
2. Second submission detects version mismatch
3. Displays error:
   ```
   ⚠️ Conflict Detected
   
   This product was modified by [User B Name] at 2:34 PM
   
   Your changes:
   - Selling Price: 5,000 → 5,500 RWF
   
   Their changes:
   - Name: "Primus 720ml" → "Primus Large"
   - Selling Price: 5,000 → 5,200 RWF
   
   [Reload and Start Over] [View Current Version]
   ```
4. User must reload and re-apply changes

---

### Scenario F: Image Upload Failure

**Condition:** Image upload fails due to size/format/network issue  
**Trigger:** User selects image file > 5MB or unsupported format  
**Response:**
1. System validates before upload
2. If invalid format: "Error: Only JPG, PNG, WEBP images are allowed"
3. If too large: "Error: Image size must be less than 5MB (current: 7.2MB)"
4. Provides resize/compress suggestion
5. Form can be saved without image change
6. Logs failed upload attempt

---

### Scenario G: System Error During Save

**Condition:** Database or network failure during save  
**Trigger:** Connection timeout, database constraint violation  
**Response:**
1. System rolls back transaction (no partial changes)
2. Displays user-friendly error: "Unable to save changes. Please try again."
3. Form data is preserved (user doesn't lose edits)
4. Logs detailed error for support team
5. User can retry or cancel

---

## 8️⃣ Business Rules

### Mandatory Rules
These rules **must** be enforced at all times:

1. **Price Validity Rule**  
   Buying price and selling price must be positive decimal values > 0

2. **Authorization Rule**  
   Only users with ADMIN role OR employees with product management permission can edit products

3. **Audit Trail Rule**  
   Every product modification must be logged in activity_logs with: userId, action, entityType='PRODUCT', entityId, details (old/new values), timestamp

4. **Data Integrity Rule**  
   Product name must be non-empty and max 255 characters

5. **Timestamp Update Rule**  
   `updatedAt` field must be automatically updated on every save

6. **Creator Immutability Rule**  
   `createdBy` field cannot be changed after product creation

### Conditional Rules

7. **Archive Warning Rule**  
   If product has stock quantity > 0, display warning modal before allowing status change to ARCHIVED

8. **Price Change Notification Rule**  
   If buying price or selling price changes by > 20%, notify store manager for review

9. **Negative Margin Warning Rule**  
   If selling price ≤ buying price, display warning but allow save with explicit confirmation

10. **Image Size Rule**  
    Product images must be < 5MB and in JPG, PNG, or WEBP format

11. **Active Purchase Order Rule**  
    If product has pending purchase orders (status = DRAFT, SUBMITTED, CONFIRMED), warn user before price changes

---

## 9️⃣ Data Requirements

### Input Data

| Field Name | Type | Required | Constraints | Example |
|------------|------|----------|-------------|---------|
| Product ID | UUID | Yes (read-only) | Must exist in system | `550e8400-e29b-41d4-a716-446655440000` |
| Name | Varchar(255) | Yes | 1-255 characters, non-empty | "Primus 720ml" |
| Type | Enum | Yes | BEER, SODA, WINE, SPIRIT, LIQUOR | BEER |
| Size | Varchar(50) | Yes | 1-50 characters | "720ml", "330ml", "1L" |
| Image | Text (URL/base64) | No | Valid image URL or data URI | "https://cdn.example.com/primus.jpg" |
| Buying Price | Decimal(10,2) | Yes | > 0, max 99,999,999.99 | 3500.00 |
| Selling Price | Decimal(10,2) | Yes | > 0, max 99,999,999.99 | 5000.00 |
| Status | Enum | Yes | ACTIVE, ARCHIVED | ACTIVE |
| Updated By | UUID | Auto | Current logged-in user | `660e8400-e29b-41d4-a716-446655440000` |

### Output Data

| Field Name | Description | Used For |
|------------|-------------|----------|
| Updated Product Record | Complete product with new values | Display, inventory operations |
| Old Values | Previous state before edit | Audit trail, rollback capability |
| Activity Log Entry | Complete change record | Compliance, history, reporting |
| Notification Events | Alerts for significant changes | Manager notifications |
| Updated Timestamp | When change occurred | Version control, audit |

### Data Sources
- **Products Table:** Current product master data
- **Stocks Table:** Current quantity (read-only for reference)
- **Users Table:** User performing the edit
- **Purchase Orders:** Check for pending orders related to product
- **Activity Logs:** Historical change records

### Data Affected by This Process
- **products table:** Direct updates
- **activity_logs table:** New audit record created
- **Daily stock snapshots:** Indirectly affected (references updated product info)
- **Purchase order items:** Indirectly affected (uses product prices for new orders)

---

## 🔟 Validation Rules

### Input Validation

**Product Name:**
- Must not be empty or only whitespace
- Length: 1-255 characters
- Can contain letters, numbers, spaces, hyphens, parentheses
- Sanitized to prevent SQL injection/XSS

**Product Type:**
- Must be one of: BEER, SODA, WINE, SPIRIT, LIQUOR
- Case-insensitive selection
- Validated against productTypeEnum

**Size:**
- Must not be empty
- Length: 1-50 characters
- Common formats: "330ml", "750ml", "1L", "Small", "Medium", "Large"

**Buying Price:**
```javascript
- Must be numeric (decimal)
- Must be > 0
- Max value: 99,999,999.99
- Precision: 2 decimal places
- Validation: /^\d+(\.\d{1,2})?$/ && value > 0
```

**Selling Price:**
```javascript
- Must be numeric (decimal)
- Must be > 0
- Max value: 99,999,999.99
- Precision: 2 decimal places
- Validation: /^\d+(\.\d{1,2})?$/ && value > 0
```

**Product Image:**
- Optional field
- If provided: must be valid URL or base64-encoded image
- Supported formats: JPG, JPEG, PNG, WEBP
- Max file size: 5MB
- Dimensions: recommended 800x800px, max 2000x2000px

**Status:**
- Must be either: ACTIVE or ARCHIVED
- Validated against productStatusEnum

### Business Logic Validation

**Margin Check (Warning Only):**
```javascript
IF sellingPrice <= buyingPrice THEN
  SHOW WARNING "Selling price is not higher than buying price. Profit margin is zero or negative."
  ALLOW save with confirmation
END IF
```

**Archive with Stock Check:**
```javascript
IF status_change == (ACTIVE → ARCHIVED) AND current_stock_quantity > 0 THEN
  SHOW WARNING "Product has {quantity} units in stock. Are you sure you want to archive?"
  REQUIRE explicit confirmation
END IF
```

**Permission Check:**
```javascript
IF user.role != 'ADMIN' AND user.permissions NOT INCLUDE 'product:edit' THEN
  REJECT with "Access Denied"
  LOG unauthorized_attempt
END IF
```

**Concurrent Edit Check:**
```javascript
IF database.products.updatedAt > form.loaded_at THEN
  REJECT with "Product was modified by another user. Please reload."
  DISPLAY conflict resolution options
END IF
```

**Active Purchase Order Price Change:**
```javascript
IF (buyingPrice_changed OR sellingPrice_changed) THEN
  active_orders = SELECT COUNT(*) FROM purchase_orders po
                  JOIN purchase_order_items poi ON po.id = poi.purchaseOrderId
                  WHERE poi.productId = this.productId
                  AND po.status IN ('DRAFT', 'SUBMITTED', 'CONFIRMED')
  
  IF active_orders > 0 THEN
    SHOW WARNING "{count} active purchase orders use this product's old price. New orders will use updated price."
  END IF
END IF
```

---

## 1️⃣1️⃣ Security & Permissions

### Role-Based Access Control (RBAC)

| Role | Can View Products | Can Edit Products | Can Archive | Can View Audit Logs |
|------|-------------------|-------------------|-------------|---------------------|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| EMPLOYEE (with permission) | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE (no permission) | ✅ | ❌ | ❌ | ❌ |

### Security Requirements

**Authentication:**
- User must have valid session token
- Session must not be expired (timeout: 8 hours of inactivity)
- Re-authenticate required for sensitive operations (price changes > threshold)

**Authorization:**
- Check role/permissions before displaying edit UI
- Re-validate permissions on server-side before processing
- Log all permission denials with user context

**Data Protection:**
- Sanitize all text inputs to prevent XSS
- Use parameterized queries to prevent SQL injection
- Validate image uploads to prevent malicious file execution
- Encrypt sensitive price data in transit (HTTPS)

**Audit Requirements:**
- Log every edit attempt (successful or failed)
- Record: user ID, IP address, timestamp, changed fields, old/new values
- Flag suspicious patterns:
  - Multiple rapid price changes
  - Mass archiving of products
  - Price changes outside business hours

---

## 1️⃣2️⃣ Audit & Compliance

### Audit Log Requirements

Every product edit must create an audit record in `activity_logs` table:

**Who:**
- User ID (who made the change)
- User Full Name (from users table)
- User Role at time of action

**What:**
- Entity Type: "PRODUCT"
- Entity ID: Product UUID
- Action: "UPDATE_PRODUCT"
- Changed Fields with old/new values
- Specific changes: name, type, size, buying price, selling price, status, image

**When:**
- Done At: Transaction timestamp (UTC)
- Created At: Log record creation time

**Why:**
- Details: JSON object containing old and new values

### Audit Log Entry Example
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440000",
  "action": "UPDATE_PRODUCT",
  "entityType": "PRODUCT",
  "entityId": "770e8400-e29b-41d4-a716-446655440000",
  "details": {
    "user": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "fullName": "John Doe",
      "role": "ADMIN"
    },
    "product": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Primus 720ml"
    },
    "changes": [
      {
        "field": "buyingPrice",
        "oldValue": "3500.00",
        "newValue": "3800.00",
        "change": "+300.00"
      },
      {
        "field": "sellingPrice",
        "oldValue": "5000.00",
        "newValue": "5500.00",
        "change": "+500.00"
      }
    ],
    "warnings": [
      "Price change exceeds 10% threshold - manager notification sent"
    ]
  },
  "doneAt": "2026-02-04T14:32:15Z",
  "createdAt": "2026-02-04T14:32:15Z"
}
```

### Retention & Compliance
- Activity logs retained for **7 years** (regulatory requirement)
- Logs are immutable (append-only, no deletions/modifications)
- Daily backups to separate audit database
- Monthly compliance reports generated for management review

---

## 1️⃣3️⃣ Expected Outcomes

### Success Criteria

**Functional Success:**
- ✅ Product record is updated correctly in database
- ✅ All changed fields reflect new values
- ✅ `updatedAt` timestamp is automatically updated
- ✅ Activity log entry is created atomically with product update
- ✅ User receives clear confirmation message
- ✅ Updated product immediately visible in all views

**User Experience Success:**
- ✅ Form loads within 1 second
- ✅ Save operation completes within 2 seconds
- ✅ Real-time field validation provides immediate feedback
- ✅ No data loss on validation errors
- ✅ Clear error messages for all failure scenarios

**Business Success:**
- ✅ Product data accuracy maintained at 99%+
- ✅ Price changes reflected immediately in POS
- ✅ Zero unauthorized modifications
- ✅ Complete audit trail for compliance
- ✅ Reduced pricing errors due to validation

### Success Message Example
```
✅ Product Updated Successfully

Product: Primus 720ml (BEER - 720ml)
Status: ACTIVE

Changes Made:
• Buying Price: 3,500 RWF → 3,800 RWF (+300)
• Selling Price: 5,000 RWF → 5,500 RWF (+500)
• Profit Margin: 1,500 RWF (30%) → 1,700 RWF (31%)

Updated by: John Doe (ADMIN)
Date/Time: Feb 4, 2026 at 2:32 PM

This change has been logged for audit purposes.
```

---

## 1️⃣4️⃣ Non-Functional Requirements

### Performance
- Form load time: < 1 second
- Save operation: < 2 seconds (95th percentile)
- Image upload: < 3 seconds for 2MB file
- Support 50 concurrent edit sessions
- Database queries optimized with proper indexes

### Availability
- Process available 24/7 (except maintenance windows)
- Planned maintenance: Sundays 2 AM - 4 AM
- Failover to backup system within 30 seconds
- Data replication for disaster recovery

### Scalability
- Support 10,000+ products in system
- Handle 200+ product edits per day
- Archive historical data older than 5 years
- Horizontal scaling for increased load

### Usability
- Mobile-responsive design (tablet and phone support)
- Keyboard shortcuts for power users (Ctrl+S to save)
- Auto-save draft every 30 seconds (optional feature)
- Accessibility: WCAG 2.1 AA compliance
- Support for multiple languages (English, French, Kinyarwanda)

---

## 1️⃣5️⃣ Integration Points

### Upstream Systems (Data Sources)
- **Products Table** - Current product master data
- **Users Table** - User authentication and permissions
- **Stocks Table** - Current stock quantities (read-only reference)
- **Purchase Orders** - Active orders referencing product

### Downstream Systems (Notified/Updated)
- **Stock Management** - Uses updated product prices
- **Purchase Order System** - New orders use updated prices
- **Daily Stock Snapshots** - References updated product info
- **Reporting & Analytics** - Price change reports
- **Notification Service** - Alerts for significant changes
- **Audit Dashboard** - Real-time compliance tracking

### API Endpoints
```
GET    /api/products/:id              - Fetch product details
PUT    /api/products/:id              - Update product
GET    /api/products/:id/stock        - Get current stock (reference)
GET    /api/products/:id/audit-trail  - Get change history
POST   /api/products/:id/validate     - Pre-save validation
```

---

## 1️⃣6️⃣ Assumptions & Constraints

### Assumptions
- Users have reliable internet connectivity
- Users have been trained on product editing procedures
- Product type categories are stable (no frequent changes)
- Size units are standardized (ml, L, etc.)
- Image hosting service is available and reliable
- Users understand pricing implications

### Constraints
- Cannot change `createdBy` or `createdAt` fields (immutable)
- Cannot delete products (only archive)
- Cannot edit products currently in active transactions
- Cannot bulk-edit multiple products in one operation (future enhancement)
- Cannot backdate changes (all edits use current timestamp)
- Image uploads limited to 5MB per file

### Known Limitations
- No version history view (only audit logs)
- No automatic price adjustment based on market data
- No integration with supplier price feeds (manual entry)
- No multi-currency support (single currency only)
- Historical price trends not visualized in edit form

---

## 1️⃣7️⃣ Future Enhancements (Out of Scope)

### Phase 2 Planned Features
- [ ] Bulk edit multiple products simultaneously
- [ ] Price history visualization (chart showing price changes over time)
- [ ] Supplier integration (auto-update prices from supplier API)
- [ ] Product variants (different sizes/packages of same product)
- [ ] Barcode scanner integration for quick product lookup
- [ ] AI-powered pricing suggestions based on market data

### Nice-to-Have Features
- [ ] Product comparison view (side-by-side compare before/after)
- [ ] Scheduled price changes (set future effective date)
- [ ] Product templates (copy settings from similar products)
- [ ] Image editing within the form (crop, resize, filters)
- [ ] Export product change history to Excel/PDF
- [ ] Mobile app for on-the-go product management

---

## 1️⃣8️⃣ Open Questions & Decisions Needed

### Pending Decisions
- **Q:** Should we implement approval workflow for price changes above certain threshold?  
  **Status:** Under review with management  
  **Decision By:** Feb 15, 2026  
  **Impact:** High - affects authorization flow

- **Q:** Should archived products be completely hidden or shown with "ARCHIVED" tag?  
  **Status:** Requires input from store managers  
  **Decision By:** Feb 10, 2026  
  **Impact:** Medium - affects UI/UX

- **Q:** Should we allow reverting to previous product version from audit log?  
  **Status:** Technical feasibility assessment needed  
  **Decision By:** Feb 20, 2026  
  **Impact:** High - complex feature

### Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| User accidentally changes price | High | Medium | Add confirmation dialog for large price changes (>20%) |
| Concurrent edits cause data loss | High | Low | Implement optimistic locking with clear conflict resolution |
| Image upload overloads server | Medium | Low | Implement client-side compression, CDN for storage |
| Price change not reflected in active orders | High | Medium | Clear warning when active orders exist, separate price locking |

---

## 📝 Notes & Additional Context

### Related Processes
- `PROC-PROD-002` - Product Creation Process
- `PROC-PROD-003` - Product Archive/Unarchive Process
- `PROC-STOCK-001` - Stock Adjustment Process
- `PROC-PO-001` - Purchase Order Management
- `PROC-AUDIT-001` - Activity Logging and Compliance

### Reference Documents
- [Database Schema Documentation](schema.ts)
- [Product Management User Guide](#)
- [Pricing Policy v2.1](#)
- [Audit and Compliance Guidelines](#)

### Stock Management Considerations
Based on your schema, products are related to:
- **stocks table**: Current quantity per product
- **daily_stock_snapshots**: Historical stock levels per business day
- **stock_actions**: Audit trail of all stock movements (STOCK_IN, SOLD, BROKEN, COUNTED)

**Important Note:** When editing a product's buying/selling price:
- It does NOT affect historical stock actions (prices are immutable in stock_actions)
- It does NOT retroactively change purchase order prices (those are snapshots)
- It DOES affect future stock-in operations
- It DOES affect future sales transactions

### Change History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Process Documentation Team | Initial version based on schema analysis |

---

## ✅ Sign-Off

### Stakeholder Approval

| Stakeholder | Role | Status | Date |
|-------------|------|--------|------|
| Store Manager | Business Owner | 🔄 Pending Review | - |
| IT Manager | Technical Lead | 🔄 Pending Review | - |
| Compliance Officer | Audit & Compliance | 🔄 Pending Review | - |
| Product Manager | Product Owner | 🔄 Pending Review | - |

### Ready for Development?
- [ ] All required fields completed
- [ ] Business rules clearly defined
- [ ] Stakeholders have signed off
- [ ] Technical feasibility confirmed
- [ ] Security review completed
- [ ] Database schema validated

**Development Start Date:** [TBD after approval]

---

**Document Owner:** Process Documentation Team  
**Last Updated:** February 4, 2026  
**Next Review Date:** March 4, 2026

---

## 📊 Schema Reference

### Products Table Structure
```typescript
products {
  id: uuid (PK)
  name: varchar(255) ✏️ EDITABLE
  type: productTypeEnum ✏️ EDITABLE
  size: varchar(50) ✏️ EDITABLE
  image: text ✏️ EDITABLE
  buyingPrice: decimal(10,2) ✏️ EDITABLE
  sellingPrice: decimal(10,2) ✏️ EDITABLE
  status: productStatusEnum ✏️ EDITABLE
  createdAt: timestamp ❌ READ-ONLY
  updatedAt: timestamp ⚙️ AUTO-UPDATED
  createdBy: uuid ❌ READ-ONLY
}
```

### Key Relationships
- `products.createdBy` → `users.id` (creator)
- `stocks.productId` → `products.id` (current inventory)
- `stock_actions.productId` → `products.id` (movement history)
- `purchase_order_items.productId` → `products.id` (ordering)
- `daily_stock_snapshots.productId` → `products.id` (daily records)

---

*This document serves as the definitive specification for the Product Editing process and must be approved before development begins.*