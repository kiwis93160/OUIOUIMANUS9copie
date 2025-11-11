# Testing Guide - Product Images & Cart Quantities Fix

## Test Environment Setup
1. Build the application: `npm run build`
2. Start the development server: `npm run dev`
3. Open the application in a browser
4. Navigate to the ordering interface

---

## Test Suite 1: Product Image Size Verification

### Test 1.1: Image Size in Product Grid
**Steps:**
1. Navigate to the seating plan view (ProductGrid)
2. View the product cards
3. Measure or observe product image sizes

**Expected Results:**
- ✅ Product images should be 288px × 288px (18rem)
- ✅ Images should be 3x larger than before (was 96px)
- ✅ Images should be clearly visible and easy to identify
- ✅ Layout should not be broken on desktop
- ✅ Layout should not be broken on mobile devices

**Pass Criteria:**
- Images are visibly larger
- No layout issues
- Better product visibility

---

## Test Suite 2: Cart Quantity Bug - CommandeClient

### Test 2.1: Single Rapid Decrease
**Steps:**
1. Add a product to cart with quantity 5
2. Click the minus (-) button 10 times rapidly (as fast as possible)
3. Wait 1 second

**Expected Results:**
- ✅ Quantity updates instantly on each click
- ✅ Item is removed when quantity reaches 0
- ✅ Item does NOT reappear after deletion
- ✅ No console errors

**Before Fix:** Item would reappear at random quantities
**After Fix:** Item stays deleted

### Test 2.2: Single Rapid Increase
**Steps:**
1. Add a product to cart with quantity 1
2. Click the plus (+) button 20 times rapidly
3. Observe the final quantity

**Expected Results:**
- ✅ Quantity increases on each click
- ✅ Final quantity should be 21
- ✅ Updates are smooth and responsive
- ✅ No console errors

### Test 2.3: Alternating Rapid Clicks
**Steps:**
1. Add a product to cart with quantity 10
2. Rapidly alternate between minus and plus buttons (20 clicks total)
3. Observe behavior

**Expected Results:**
- ✅ Each click is registered
- ✅ UI updates immediately
- ✅ Final quantity is accurate
- ✅ No strange behaviors or glitches

### Test 2.4: Multiple Products Simultaneously
**Steps:**
1. Add 3 different products to cart
2. Rapidly click minus on all 3 products at the same time (if possible with multiple pointers/users)
3. Observe behavior

**Expected Results:**
- ✅ Each product updates independently
- ✅ No cross-contamination between products
- ✅ All deletions work correctly
- ✅ No items reappear

### Test 2.5: Edge Case - Decrease Below Zero
**Steps:**
1. Add a product with quantity 2
2. Click minus 5 times rapidly

**Expected Results:**
- ✅ Quantity goes to 0
- ✅ Item is removed after 300ms
- ✅ Quantity never goes negative
- ✅ No error states

### Test 2.6: Stress Test
**Steps:**
1. Add 5 products to cart
2. Click buttons as rapidly as possible for 10 seconds
3. Try to break the system

**Expected Results:**
- ✅ System remains stable
- ✅ All updates are processed
- ✅ No crashes or freezes
- ✅ Final state is consistent

---

## Test Suite 3: Order Quantity Bug - Commande

### Test 3.1: Order View Rapid Decrease
**Steps:**
1. Create an order with a product quantity 5
2. In the order summary, click minus 10 times rapidly
3. Wait 1 second

**Expected Results:**
- ✅ Quantity updates instantly
- ✅ Item is removed at quantity 0
- ✅ Item does NOT reappear
- ✅ Server sync works correctly

### Test 3.2: Order View Rapid Increase
**Steps:**
1. Create an order with a product quantity 1
2. Click plus 15 times rapidly
3. Verify final quantity

**Expected Results:**
- ✅ Quantity increases on each click
- ✅ Final quantity should be 16
- ✅ Updates sync to server correctly
- ✅ No console errors

### Test 3.3: Concurrent Order Updates
**Steps:**
1. Create an order with multiple products
2. Rapidly update quantities on multiple products
3. Verify all updates are saved

**Expected Results:**
- ✅ All products update independently
- ✅ Server receives all updates
- ✅ No data loss
- ✅ No race conditions

### Test 3.4: Order Sync Integration
**Steps:**
1. Create an order with products
2. Rapidly decrease quantities
3. Send order to kitchen
4. Verify order is correct

**Expected Results:**
- ✅ All quantity changes are included
- ✅ Deleted items are not in the order
- ✅ Kitchen receives correct information
- ✅ No sync errors

---

## Test Suite 4: Integration Tests

### Test 4.1: Full Order Flow
**Steps:**
1. Browse products (verify large images)
2. Add products to cart
3. Modify quantities rapidly
4. Remove some items
5. Complete order

**Expected Results:**
- ✅ Images are large and clear
- ✅ Cart updates work perfectly
- ✅ Final order is accurate
- ✅ No bugs throughout the flow

### Test 4.2: Mobile Device Testing
**Steps:**
1. Open application on mobile device
2. Test all quantity operations
3. Verify image sizes work on mobile

**Expected Results:**
- ✅ Touch interactions work smoothly
- ✅ No layout issues with larger images
- ✅ Rapid taps are handled correctly
- ✅ Mobile UX is good

### Test 4.3: Browser Compatibility
**Test in:**
- Chrome
- Firefox
- Safari
- Edge

**Expected Results:**
- ✅ Works correctly in all browsers
- ✅ No browser-specific bugs
- ✅ Consistent behavior

---

## Test Suite 5: Regression Tests

### Test 5.1: Verify Existing Features
**Steps:**
1. Test all other cart operations (add, remove, comment)
2. Test order creation
3. Test payment flow
4. Test promotions

**Expected Results:**
- ✅ No existing features are broken
- ✅ All functionality works as before
- ✅ Only targeted issues are fixed

### Test 5.2: Performance Check
**Steps:**
1. Add 50 products to cart
2. Perform rapid quantity updates
3. Monitor performance

**Expected Results:**
- ✅ No performance degradation
- ✅ UI remains responsive
- ✅ No memory leaks
- ✅ Smooth operation

---

## Bug Report Template

If you find any issues, please report with:

```
**Issue Description:**
[Brief description]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Browser: [e.g., Chrome 120]
- Device: [e.g., Desktop/Mobile]
- OS: [e.g., Windows 11]

**Screenshots/Videos:**
[If applicable]

**Console Errors:**
[Any error messages]
```

---

## Success Criteria Summary

### Product Images
- ✅ Images are 3x larger (288px)
- ✅ Better visibility
- ✅ No layout issues

### Quantity Updates
- ✅ Instant UI feedback
- ✅ No race conditions
- ✅ No items reappearing
- ✅ Handles rapid clicks perfectly
- ✅ Multiple products work independently

### Quality
- ✅ No crashes
- ✅ No data loss
- ✅ No console errors
- ✅ Good performance
- ✅ Works on all browsers/devices
