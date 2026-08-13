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
