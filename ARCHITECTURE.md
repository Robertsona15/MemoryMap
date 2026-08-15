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

### Preventing Unhandled Exceptions on Untrusted Data (EXIF)

When parsing untrusted data, such as EXIF metadata from uploaded images (e.g., in `PhotoPicker.jsx`), we ensure strict type handling. Specifically, when handling numerical values like `latitude` and `longitude` that are expected to support methods like `.toFixed()`, we defensively cast these values to `Number` using `Number(val)`.

#### Rationale
If the underlying EXIF parser returns a string, `null`, or an unexpected object for coordinates, calling `.toFixed()` directly would result in an unhandled `TypeError` (e.g., `latitude.toFixed is not a function`), leading to a potential Denial of Service (application crash). Coercing the values to a `Number` safely evaluates invalid values to `NaN`, preventing runtime crashes and ensuring the fallback logic functions gracefully.
