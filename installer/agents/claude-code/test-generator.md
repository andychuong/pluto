# Test Generator

Generate comprehensive tests for the selected code or current file.

## Instructions
1. Analyze the code to understand its functionality
2. Identify the appropriate testing framework based on the project (Jest, Vitest, Pytest, etc.)
3. Generate tests covering:
   - **Happy path**: Normal expected usage
   - **Edge cases**: Boundary conditions, empty inputs, null values
   - **Error cases**: Invalid inputs, exception handling
   - **Integration points**: Mock external dependencies appropriately

## Output Requirements
- Use the existing test patterns in the project if available
- Include descriptive test names that explain the scenario
- Add setup/teardown as needed
- Include comments for complex test scenarios
- Ensure tests are deterministic and isolated

## Test Structure
```
describe('[Function/Component Name]', () => {
  describe('[Scenario Group]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange, Act, Assert
    });
  });
});
```

Ask which file to test if not obvious from context.
