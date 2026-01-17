<!--
============================================================================
SYNC IMPACT REPORT
============================================================================
Version Change: 1.0.0 → 1.1.0 (MINOR - expanded guidance)
Modified Principles:
  - IV. Browser-Native Development: Added charting library exception (ECharts permitted)
Added Sections: None
Removed Sections: None
Templates Requiring Updates:
  - .specify/templates/plan-template.md: ✅ Compatible
  - .specify/templates/spec-template.md: ✅ Compatible
  - .specify/templates/tasks-template.md: ✅ Compatible
  - specs/main/research.md: ✅ Updated (ECharts decision documented)
  - specs/main/plan.md: ✅ Updated (ECharts in technical context)
  - specs/main/contracts/chart.js.md: ✅ Updated (ECharts wrapper API)
  - specs/main/quickstart.md: ✅ Updated (ECharts setup instructions)
Follow-up TODOs: None - all artifacts synchronized
============================================================================
-->

# Time Visualizer Constitution

## Core Principles

### I. Simplicity First (YAGNI)

Every feature and code addition MUST solve an immediate, demonstrated need. Speculative features are prohibited.

- Code MUST be the simplest solution that works for the current requirement
- No abstractions until the same pattern appears three or more times
- Configuration options MUST only exist when users have explicitly requested them
- Dependencies MUST be justified; prefer native browser APIs over libraries
- If a feature can be removed without breaking core functionality, it SHOULD be questioned

**Rationale**: Time Visualizer is a focused simulation tool. Complexity obscures the core value proposition and increases maintenance burden. Simple code is debuggable code.

### II. User Experience First

The interface MUST be intuitive and responsive. Users should understand time visualization controls without documentation.

- Controls MUST provide immediate visual feedback (< 100ms response to input)
- Default values MUST produce meaningful visualizations without configuration
- Error states MUST be recoverable; never leave users in a broken state
- Accessibility MUST be considered: keyboard navigation, color contrast, screen reader compatibility
- Progressive disclosure: show essential controls first, advanced options on demand

**Rationale**: The tool exists to help users understand data over time. A confusing interface defeats this purpose entirely.

### III. Performance & Responsiveness

Visualizations MUST render smoothly. Laggy interactions destroy the simulation experience.

- Initial render MUST complete within 500ms for typical datasets
- Control adjustments (time range, aggregation) MUST reflect visually within 100ms
- Large datasets MUST use progressive rendering or virtualization
- Animations MUST target 60fps; degrade gracefully under load
- Memory usage MUST be monitored; clean up unused objects and event listeners

**Rationale**: Time Visualizer simulates real-time parameter adjustments. Delays break the mental model of cause-and-effect that makes the tool valuable.

### IV. Browser-Native Development

Leverage standard web platform capabilities. Minimize tooling complexity.

- Vanilla HTML, CSS, and JavaScript are the default; frameworks require justification
- **Exception: Charting libraries (e.g., ECharts) are permitted** for visualization-heavy features where native Canvas/SVG would require excessive custom code
- ES Modules for code organization; no bundler required for development
- CSS custom properties for theming; no preprocessor required
- Modern browser APIs (ResizeObserver, IntersectionObserver, Web Animations) preferred
- Feature detection over browser sniffing; graceful degradation for older browsers

**Rationale**: Reduced tooling means faster iteration and lower barrier to contribution. Charting libraries provide proven, accessible, performant visualizations that would be impractical to replicate from scratch.

### V. Testable Visualization Logic

Core calculation and transformation logic MUST be separated from rendering for testability.

- Data transformations (aggregation, statistics, precision) MUST be pure functions
- Time range calculations MUST be unit testable without DOM
- Rendering logic MAY use integration tests with visual regression where valuable
- Test coverage focuses on calculation correctness; UI tests are secondary
- Manual testing is acceptable for visual polish; automated tests guard correctness

**Rationale**: Time calculations are the foundation of value. Incorrect aggregations or statistics destroy trust. Pure functions enable confident refactoring.

## Technical Standards

### Code Organization

- Single `src/` directory at repository root
- Separate modules for: data transformation, time utilities, visualization rendering, UI controls
- No circular dependencies between modules
- Each module MUST have a clear, single responsibility

### Browser Compatibility

- Target: Modern evergreen browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- ES2020+ JavaScript features permitted
- CSS Grid and Flexbox for layout
- No IE11 support required

### Data Handling

- Input data formats MUST be documented
- Transformations MUST preserve data integrity
- Large dataset handling strategy MUST be documented per visualization type

## Development Workflow

### Code Changes

1. Understand the requirement fully before writing code
2. Check if existing code already solves the problem
3. Implement the simplest solution
4. Test manually with representative data
5. Add automated tests for calculation logic
6. Review for performance implications

### Quality Gates

- All calculation functions MUST have unit tests
- No console errors or warnings in normal operation
- Lighthouse performance score MUST remain above 90
- Code MUST pass linting (if configured)

### Documentation

- README covers setup and basic usage
- Complex algorithms MUST have inline comments explaining approach
- Public APIs MUST have JSDoc comments
- User-facing features SHOULD have usage examples

## Governance

This constitution defines non-negotiable principles for Time Visualizer development. All contributions MUST align with these principles.

### Amendment Process

1. Propose change with rationale in writing
2. Evaluate impact on existing code and practices
3. Document migration plan if breaking existing patterns
4. Update constitution version according to semantic versioning:
   - MAJOR: Principle removal or fundamental redefinition
   - MINOR: New principle or significant expansion
   - PATCH: Clarifications and non-semantic refinements
5. Update dependent templates if principle names or requirements change

### Compliance

- Code reviews MUST verify principle alignment
- Complexity additions MUST be justified against Principle I (Simplicity)
- Performance regressions MUST be justified against Principle III (Performance)
- Constitution violations block merge; no exceptions without documented justification

**Version**: 1.1.0 | **Ratified**: 2025-12-17 | **Last Amended**: 2025-12-17
