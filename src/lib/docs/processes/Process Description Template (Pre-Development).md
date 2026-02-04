# 📋 Process Description Template (Pre-Development)

> **Purpose:** This template helps you define business processes clearly before writing any code. Use it to align stakeholders, clarify requirements, and create a single source of truth for developers.

---

## 1️⃣ Process Overview

### Process Name
**Name:** [Clear, action-oriented name]

**Examples:**
- Manual Stock Adjustment
- Employee Salary Payment Processing
- Customer Order Cancellation
- Supplier Invoice Approval

### Process ID (Optional)
**ID:** `PROC-[CATEGORY]-[NUMBER]`  
Example: `PROC-INV-001` (Inventory Process #1)

---

## 2️⃣ Purpose & Business Value

### Why does this process exist?
[Describe the business problem this solves in 2-3 sentences]

**Example:**
> This process enables authorized store managers to manually correct stock quantities when physical inventory counts reveal discrepancies with the system records. It ensures inventory accuracy, supports loss prevention, and maintains audit compliance.

### Success Metrics (Optional)
- What KPIs does this process impact?
- How will we measure success?

---

## 3️⃣ Stakeholders & Actors

### Primary Actor
**Role:** [The main person/system initiating this process]  
**Responsibility:** [What they do in this process]

### Secondary Actors
| Role | Responsibility | Interaction Point |
|------|---------------|-------------------|
| Accountant | Reviews adjustment reports | Post-process review |
| Inventory Auditor | Validates adjustments | Monthly audit |

### External Systems
- **Inventory Management System** - Stores product data
- **Audit Logging Service** - Records all changes
- **Notification Service** - Sends alerts

---

## 4️⃣ Preconditions

### Required State
What must be true **before** this process can start?

- [ ] User is authenticated and logged in
- [ ] User has `STOCK_MANAGER` or `ADMIN` role
- [ ] Product catalog is initialized
- [ ] Warehouse/location data exists
- [ ] System is not in maintenance mode

### Data Prerequisites
- Products must exist in the system
- Current stock quantities must be available
- User permissions must be loaded

---

## 5️⃣ Trigger Events

### What initiates this process?

**User-Initiated:**
- User clicks "Adjust Stock" button on inventory screen
- User scans barcode to access adjustment form

**System-Initiated:**
- Scheduled monthly reconciliation job runs
- Automated low-stock threshold alert

**Event-Driven:**
- Physical inventory count completion
- Stocktake variance detected
- External warehouse system sends update

---

## 6️⃣ Process Flow (Main Scenario)

### Happy Path - Step by Step

| Step | Actor | Action | System Response |
|------|-------|--------|-----------------|
| 1 | User | Opens stock management screen | Displays product list with current quantities |
| 2 | User | Searches/selects a product | Shows product details and stock levels |
| 3 | User | Clicks "Adjust Stock" | Opens adjustment form with current quantity pre-filled |
| 4 | User | Enters adjustment amount (+/-) | Calculates and previews new total |
| 5 | User | Selects adjustment reason from dropdown | Validates reason selection |
| 6 | User | Adds optional notes | Accepts text input (max 500 chars) |
| 7 | User | Clicks "Submit Adjustment" | Validates all inputs |
| 8 | System | Validates business rules | Checks permissions, stock limits, data integrity |
| 9 | System | Updates stock quantity | Commits transaction to database |
| 10 | System | Creates audit log entry | Records user, timestamp, before/after values |
| 11 | System | Triggers notifications | Sends alerts to relevant stakeholders |
| 12 | System | Displays success confirmation | Shows updated quantity and adjustment ID |

### Process Diagram (Optional)
```
[User] → [Select Product] → [Enter Adjustment] → [Validate] → [Update Stock] → [Log] → [Confirm]
```

---

## 7️⃣ Alternative Flows & Exception Handling

### Scenario A: Validation Failure

**Condition:** User enters invalid data  
**Trigger:** Adjustment quantity is not a number, or reason is empty  
**Response:**
1. System displays inline error message
2. Highlights invalid field(s) in red
3. Does not submit the form
4. User corrects and resubmits

---

### Scenario B: Permission Denied

**Condition:** User lacks required permissions  
**Trigger:** User without `STOCK_MANAGER` role attempts adjustment  
**Response:**
1. System prevents form submission
2. Displays: "Access Denied: You do not have permission to adjust stock"
3. Logs unauthorized access attempt
4. Optionally notifies security team

---

### Scenario C: Stock Would Go Negative

**Condition:** Adjustment would result in negative stock  
**Trigger:** Current stock = 10, adjustment = -15  
**Response:**
1. System rejects the adjustment
2. Displays: "Error: This adjustment would result in negative stock (-5). Current stock: 10"
3. Suggests corrective action (adjust to 0 or verify count)
4. Logs the failed attempt

---

### Scenario D: System Error

**Condition:** Database or network failure  
**Trigger:** Connection timeout, database deadlock  
**Response:**
1. System rolls back any partial changes
2. Displays user-friendly error: "Unable to process adjustment. Please try again."
3. Logs technical error details for support team
4. Optionally queues retry for automated recovery

---

### Scenario E: Concurrent Modification

**Condition:** Two users adjust same product simultaneously  
**Trigger:** User A and User B submit adjustments at the same time  
**Response:**
1. System uses optimistic locking (version checking)
2. Second submission detects version mismatch
3. Displays: "This product was modified by another user. Please refresh and try again."
4. User reloads current data and resubmits if needed

---

## 8️⃣ Business Rules

### Mandatory Rules
These rules **must** be enforced at all times:

1. **Stock Integrity Rule**  
   Stock quantity must never be negative for any product at any location

2. **Authorization Rule**  
   Only users with `STOCK_MANAGER` or `ADMIN` roles can perform adjustments

3. **Audit Trail Rule**  
   Every adjustment must be logged with: user ID, timestamp, reason, before/after values

4. **Reason Requirement Rule**  
   All adjustments must have a documented reason (cannot be empty or generic)

5. **Transaction Atomicity Rule**  
   Stock adjustment and audit logging must succeed or fail together (atomic transaction)

### Conditional Rules

6. **Large Adjustment Threshold**  
   If adjustment exceeds 100 units or 25% of current stock, require supervisor approval

7. **Warehouse Specific Rules**  
   Adjustments in "Main Warehouse" require additional verification if > $1000 value

8. **Time Window Rule**  
   Stock adjustments cannot be made during end-of-day processing (10 PM - 12 AM)

---

## 9️⃣ Data Requirements

### Input Data

| Field Name | Type | Required | Constraints | Example |
|------------|------|----------|-------------|---------|
| Product ID | UUID/String | Yes | Must exist in system | `PRD-12345` |
| Adjustment Quantity | Integer | Yes | Non-zero, within limits | `+50` or `-10` |
| Reason Code | Enum | Yes | From predefined list | `DAMAGED`, `FOUND`, `RECOUNT` |
| Notes | Text | No | Max 500 characters | "Found during stocktake" |
| Location ID | UUID/String | Yes | Must exist in system | `WH-MAIN-A1` |
| User ID | UUID/String | Auto | Logged-in user | `USR-98765` |

### Output Data

| Field Name | Description | Used For |
|------------|-------------|----------|
| Adjustment ID | Unique identifier for this adjustment | Reference, audit trail |
| New Stock Quantity | Updated stock level | Display, inventory reports |
| Adjustment Timestamp | When adjustment occurred | Audit, compliance |
| Audit Log Entry | Complete record of change | Compliance, history |
| Notification Events | Alerts sent to stakeholders | Communication |

### Data Sources
- **Product Master Data:** Central product database
- **User Permissions:** Identity & Access Management system
- **Current Stock Levels:** Inventory management system
- **Reason Codes:** Configuration/reference data table

---

## 🔟 Validation Rules

### Input Validation

**Product ID:**
- Must be non-empty
- Must exist in product catalog
- Product must be active (not archived)

**Adjustment Quantity:**
- Must be a valid integer
- Must be non-zero (cannot adjust by 0)
- Must not exceed ±10,000 units in single adjustment
- Result must not cause stock to go below 0

**Reason Code:**
- Must be selected from valid list
- Cannot be generic/placeholder value

**Notes:**
- Maximum length: 500 characters
- No special characters that could break SQL/logs
- Optional but recommended

**Location ID:**
- Must exist in warehouse/location master data
- User must have access to this location

### Business Logic Validation

**Stock Level Check:**
```
IF (current_stock + adjustment_quantity) < 0 THEN
  REJECT with error message
END IF
```

**Permission Check:**
```
IF user.role NOT IN ['STOCK_MANAGER', 'ADMIN'] THEN
  REJECT with permission error
END IF
```

**Threshold Check:**
```
IF ABS(adjustment_quantity) > 100 OR 
   ABS(adjustment_quantity / current_stock) > 0.25 THEN
  REQUIRE supervisor_approval
END IF
```

---

## 1️⃣1️⃣ Security & Permissions

### Role-Based Access Control (RBAC)

| Role | Can View | Can Adjust | Can Approve | Can Audit |
|------|----------|------------|-------------|-----------|
| Stock Manager | ✅ | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Warehouse Staff | ✅ | ❌ | ❌ | ❌ |
| Auditor | ✅ | ❌ | ❌ | ✅ |

### Security Requirements

**Authentication:**
- User must have valid session token
- Session must not be expired
- Multi-factor authentication required for adjustments > 1000 units

**Authorization:**
- Check role permissions before displaying adjustment UI
- Re-validate permissions on server-side before processing
- Log all permission denials

**Data Protection:**
- Mask sensitive product cost data for non-financial roles
- Encrypt adjustment reasons containing sensitive info
- Apply row-level security based on user's assigned locations

**Audit Requirements:**
- Log every access attempt (successful or failed)
- Record IP address, user agent, timestamp
- Flag suspicious patterns (multiple failed attempts, unusual hours)

---

## 1️⃣2️⃣ Audit & Compliance

### Audit Log Requirements

Every adjustment must create an audit record containing:

**Who:**
- User ID (who made the change)
- User Name (for human readability)
- User Role at time of action
- IP Address / Device ID

**What:**
- Product ID and Name
- Location/Warehouse
- Old Quantity
- Adjustment Amount
- New Quantity
- Reason Code
- Notes
- Approval Status (if applicable)

**When:**
- Transaction Timestamp (UTC)
- System Timestamp (local)
- Business Date (accounting period)

**Why:**
- Reason Code (structured)
- Free-text Notes (unstructured)
- Reference to source document (if applicable)

### Audit Log Format Example
```json
{
  "adjustment_id": "ADJ-2026-000123",
  "timestamp": "2026-02-04T14:32:15Z",
  "user": {
    "id": "USR-98765",
    "name": "John Smith",
    "role": "STOCK_MANAGER",
    "ip": "192.168.1.100"
  },
  "product": {
    "id": "PRD-12345",
    "name": "Widget Pro",
    "sku": "WGT-PRO-001"
  },
  "location": "WH-MAIN-A1",
  "quantity_change": {
    "before": 150,
    "adjustment": -25,
    "after": 125
  },
  "reason": {
    "code": "DAMAGED",
    "notes": "Water damage from roof leak in aisle 3"
  },
  "approval": {
    "required": true,
    "status": "APPROVED",
    "approved_by": "USR-11111",
    "approved_at": "2026-02-04T14:35:00Z"
  }
}
```

### Retention & Compliance
- Audit logs must be retained for **7 years** (regulatory requirement)
- Logs must be immutable (append-only, no deletions)
- Logs must be backed up daily to separate system
- Quarterly audit reports must be generated for review

---

## 1️⃣3️⃣ Expected Outcomes

### Success Criteria

**Functional Success:**
- ✅ Stock quantity is updated correctly in database
- ✅ Adjustment record is created with all required fields
- ✅ Audit log entry is committed atomically
- ✅ User receives clear confirmation message
- ✅ Stock level is immediately reflected in all views

**User Experience Success:**
- ✅ Process completes within 2 seconds (95th percentile)
- ✅ User receives clear feedback at each step
- ✅ No ambiguous error messages
- ✅ User can easily undo/correct mistakes (with supervisor approval)

**Business Success:**
- ✅ Inventory accuracy improves (target: 98%+)
- ✅ Stocktake variances are documented and traceable
- ✅ Compliance with SOX/audit requirements
- ✅ Reduction in manual reconciliation time

### Success Message Example
```
✅ Stock Adjustment Successful

Product: Widget Pro (SKU: WGT-PRO-001)
Location: Main Warehouse - Aisle A1
Previous Stock: 150 units
Adjustment: -25 units (Reason: Damaged)
New Stock: 125 units

Adjustment ID: ADJ-2026-000123
Recorded by: John Smith
Date/Time: Feb 4, 2026 at 2:32 PM

This adjustment has been logged for audit purposes.
```

---

## 1️⃣4️⃣ Non-Functional Requirements

### Performance
- Response time: < 2 seconds for 95% of requests
- System must support 100 concurrent adjustments
- Database queries must be optimized (indexed lookups)

### Availability
- Process must be available during business hours (6 AM - 10 PM)
- Planned maintenance window: 12 AM - 2 AM daily
- Failover to backup system within 30 seconds

### Scalability
- Support for 10,000+ products
- Handle 500+ adjustments per day
- Archive historical data older than 2 years

### Usability
- Mobile-responsive design (tablet support)
- Keyboard shortcuts for power users
- Accessibility: WCAG 2.1 AA compliance

---

## 1️⃣5️⃣ Integration Points

### Upstream Systems (Data Sources)
- **Product Catalog API** - Fetches product details
- **User Management System** - Validates permissions
- **Warehouse Management System** - Provides location data

### Downstream Systems (Notified/Updated)
- **Accounting System** - Receives inventory valuation updates
- **Reporting & Analytics** - Gets adjustment data for BI
- **Notification Service** - Sends alerts to stakeholders
- **Audit Dashboard** - Displays real-time compliance metrics

### API Endpoints (If Applicable)
- `POST /api/inventory/adjustments` - Create adjustment
- `GET /api/inventory/adjustments/{id}` - Get adjustment details
- `GET /api/inventory/audit-log` - Retrieve audit history

---

## 1️⃣6️⃣ Assumptions & Constraints

### Assumptions
- Users have reliable internet connectivity
- Product master data is kept up-to-date by separate process
- Warehouse locations are pre-configured before adjustments
- Users have received training on adjustment procedures
- Physical inventory counts are accurate

### Constraints
- Cannot adjust stock for products marked as "discontinued"
- Cannot backdate adjustments (must use current timestamp)
- Cannot bulk-adjust multiple products in one transaction (future enhancement)
- Limited to single-location adjustments (multi-location requires separate process)

### Known Limitations
- No offline mode (requires active internet connection)
- No automatic approval workflow (Phase 2 feature)
- No integration with barcode scanners yet (manual entry only)
- Historical adjustments cannot be edited (only reversed with new adjustment)

---

## 1️⃣7️⃣ Future Enhancements (Out of Scope)

### Phase 2 Planned Features
- [ ] Bulk adjustment (multiple products at once)
- [ ] Approval workflow for large adjustments
- [ ] Photo upload (attach images of damaged goods)
- [ ] Mobile app with barcode scanner integration
- [ ] Scheduled recurring adjustments
- [ ] Predictive alerts for unusual adjustment patterns

### Nice-to-Have Features
- [ ] AI-powered reason suggestion based on historical patterns
- [ ] Real-time collaboration (see when others are adjusting same product)
- [ ] Export adjustment history to Excel/PDF
- [ ] Integration with security cameras (auto-attach footage)

---

## 1️⃣8️⃣ Open Questions & Decisions Needed

### Pending Decisions
- **Q:** Should adjustments require supervisor approval above certain threshold?  
  **Status:** Under review with management  
  **Decision By:** Feb 15, 2026

- **Q:** Should we support fractional quantities (e.g., 2.5 kg)?  
  **Status:** Requires input from warehouse team  
  **Decision By:** Feb 10, 2026

### Risks & Mitigations
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| User error (wrong quantity) | High | Medium | Require confirmation dialog, add undo feature |
| System downtime during peak | High | Low | Implement queue-based processing with retry |
| Data corruption | Critical | Low | Atomic transactions, regular backups |

---

## 📝 Notes & Additional Context

### Related Processes
- `PROC-INV-002` - Physical Stocktake Process
- `PROC-INV-003` - Stock Transfer Between Locations
- `PROC-AUDIT-001` - Inventory Audit Compliance Check

### Reference Documents
- [Inventory Management Policy v3.2](#)
- [Stock Adjustment SOP](#)
- [Audit Compliance Guidelines](#)

### Change History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | Jane Doe | Initial version |
| 1.1 | 2026-02-01 | John Smith | Added approval workflow requirements |
| 1.2 | 2026-02-04 | Jane Doe | Clarified validation rules |

---

## ✅ Sign-Off

### Stakeholder Approval

| Stakeholder | Role | Status | Date |
|-------------|------|--------|------|
| Jane Doe | Product Owner | ✅ Approved | 2026-02-04 |
| Mike Johnson | IT Manager | 🔄 Pending | - |
| Sarah Lee | Compliance Officer | ✅ Approved | 2026-02-03 |
| David Chen | Warehouse Manager | ✅ Approved | 2026-02-02 |

### Ready for Development?
- [ ] All required fields completed
- [ ] Business rules clearly defined
- [ ] Stakeholders have signed off
- [ ] Technical feasibility confirmed
- [ ] Security review completed

**Development Start Date:** [TBD]

---

**Document Owner:** [Your Name]  
**Last Updated:** February 4, 2026  
**Next Review Date:** March 4, 2026

---

*This template should be filled out completely before any development work begins. It serves as the contract between business stakeholders and the development team.*