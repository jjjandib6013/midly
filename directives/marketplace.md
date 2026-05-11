# Marketplace Directive (Midly)

**Goal**: Maintain a reliable and secure peer-to-peer marketplace for digital assets.

## Listing Validation
All listings MUST pass rigorous server-side validation upon creation (`POST /listings`):
1. **Game Type**: Must be verified against a strict allowlist (e.g., 'Valorant', 'CS2', 'Dota 2', 'Steam Account').
2. **Item Name**: Must be sanitized to strip HTML tags and limited to a maximum of 100 characters.
3. **Price Limits**: The asking price MUST be between ₱50 and ₱1,000,000 PHP.

## Race Condition Prevention
When a buyer initiates a purchase, the system MUST prevent double-booking.
- Use an atomic `updateMany` condition to reserve the listing:
  ```typescript
  const updatedListing = await tx.listing.updateMany({ 
     where: { listing_id: listingId, status: 'open' }, 
     data: { status: 'reserved' } 
  });
  ```
- If `updatedListing.count === 0`, throw an error to block the purchase.

## Abuse Prevention
To protect sellers and the marketplace integrity:
1. **Max Active Invites**: A buyer may only have a maximum of 2 active escrow invitations at any time.
2. **Re-reserve Block**: A buyer CANNOT re-reserve the exact same item from the same seller if they have previously cancelled it.
3. **Global Cooldown**: If a user cancels 3 or more trades within 24 hours, they are blocked from reserving new items for a full 24-hour period.

## Access Control
- Unverified users MUST NOT be able to purchase or post listings.
- Ensure the frontend checks `kyc.status === 'verified'` to display action buttons appropriately.
