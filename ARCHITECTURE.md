# Architecture Documentation

## State Management Decisions

### Functional State Updates in React

When dealing with complex objects in React state, particularly when passing down updater functions to child components that may invoke multiple state updates in quick succession, we use functional state updates (`prev => ...`).

#### Rationale
In `AppContent.jsx`, the `setActiveMemory` setter is passed down to `MemoryDetailsEditor` as `setCategory` and `setSubCategoryData`.

When a category was selected, `MemoryDetailsEditor` performed:
1. `setCategory(newCategory)`
2. `setSubCategoryData({})` (to reset subcategories)

If these used non-functional state updates (e.g., `setActiveMemory({ ...activeMemory, category: c })`), the second call would use a stale closure of `activeMemory` that did not yet contain the updated `category`. This resulted in the category selection being overwritten or lost because the second update would overwrite the first update's changes.

By using functional state updates (`setActiveMemory(prev => ({ ...prev, category: c }))`), each update is guaranteed to work with the most recent state, avoiding race conditions and ensuring that both the category update and the subcategory reset apply correctly.

## Security Decisions

### Preventing Client-Side URL Injection/SSRF in External API Calls

When constructing URLs for external API requests (e.g., calling OpenStreetMap Nominatim for reverse geocoding in `PhotoPicker.jsx`), we must validate and sanitize all user-supplied data, including metadata like EXIF data extracted from images.

#### Rationale
Directly interpolating untrusted input (such as `latitude` and `longitude` from an image's EXIF data) into a URL string creates a vulnerability. An attacker could craft an image with malicious strings in the location fields to manipulate the request path or inject query parameters.

To mitigate this:
1.  **Type Coercion and Validation:** Values are strictly coerced to numbers using `Number()`, and checked using `Number.isNaN()`. Any non-numeric input is rejected.
2.  **Encoding:** Validated numbers are processed with `encodeURIComponent()` before being embedded into the fetch URL.

This ensures the client app will only ever send safe, structurally sound coordinates to external APIs.
