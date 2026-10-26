# HackBridge Stitch Design System Specification (DESIGN-SYSTEM.md)

## 1. Aesthetic Foundations: Anti-AI-Tells Directive
1. **Zero Neon Halos / Drop Shadows**: No fuzzy button halos, colored box-shadows, or neon glows.
2. **Single Accent Color**: Standardized strictly on **Indigo `#6366F1`**. No multi-colored palettes (cyan/pink/green mixtures).
3. **Typography**:
   - **Display**: `Plus Jakarta Sans` for impactful structural headlines and titles.
   - **Body**: `Inter` for clean, dense, high-legibility interface data and copy.
   - **Monospace**: `JetBrains Mono` for Hackathon IDs (`HB-XXXXXX`), timestamps, hashes, and telemetry counters.
4. **Architectural Palette**:
   - Deep Obsidian Void: `#030407`
   - Primary Surface: `#0B0E18`
   - Elevated Surface: `#111524`
   - Borders: 1px crisp subtle white borders (`border-white/[0.08]`)
   - Text Primary: `#F8FAFC`
   - Text Secondary: `#94A3B8`
   - Text Muted: `#64748B`
5. **Real Depth & 3D WebGL**:
   - Dynamic Three.js WebGL hero featuring a slowly rotating dotted globe (thousands of Fibonacci points in Indigo `#6366F1`).
   - Animated glowing connection arcs traveling between major global university hubs.
   - Deep faint starfield and smooth mouse parallax.
   - Static dotted CSS gradient poster fallback for `prefers-reduced-motion` and non-WebGL environments.
6. **Data Honesty**:
   - Zero simulated vanity numbers or fake testimonials.
   - Displays real hackathon entities fetched directly from the database; sections hide automatically when empty.
   - 10% milestone progress increments, strictly non-decreasing.
   - Split-screen institutional login layout with 1-click persona switching for audit workflows.
