# QA & Build Checklist - MotionForge AI v1.4.0

## Pre-Build Checklist

### 1. Code Preparation
```bash
# Install dependencies
npm install

# Run linter (if configured)
npm run lint --fix

# Type check
npx tsc --noEmit

# Run tests (if available)
npm run test 2>/dev/null || echo "No tests configured"
```

### 2. Image Asset Setup
```bash
# Create presets directory
mkdir -p public/presets

# Copy reference images
cp "/C/Users/eduni/Desktop/Web Preset for Web Studio"/*.png public/presets/

# Verify images copied
ls -lh public/presets/ | wc -l  # Should show 25+ images
```

### 3. Environment & Configuration
```bash
# Verify .env files (if any)
# Check vite.config.ts for preset paths

# Clear any old builds
rm -rf dist/
rm -rf src-tauri/target/
```

## Functionality Testing

### Test 1: Dashboard & Project Management
```
□ Navigate to dashboard
□ See "Recent Projects" widget (if projects exist)
□ See "Quick Action Cards" (Web, MV, Motion, Glam)
□ Click "New Project" button
□ Enter project name and type
□ Verify project appears in list
□ Click to open project → loads in studio
□ Click "Duplicate" → creates copy
□ Try to delete project → confirmation works
□ Check storage quota indicator
```

### Test 2: Web Studio Preset Flow
```
□ Open Web Studio → New Project
□ See PresetSelectionStep with 6 categories
□ Switch between categories → presets update
□ Click on preset → shows selected state with checkmark
□ Click "Show details" → expands with description
□ Verify sections display (4-6 sections per preset)
□ Verify accent color dot shows correctly
□ Select a preset and continue
□ Project initialized with preset sections
□ Verify sections appear in workspace
```

### Test 3: Generation Pipeline
```
□ Enter business context
□ Click "Generate Website"
□ Verify generation prompt includes preset guidance
□ Generation completes without errors
□ Sections populate with AI-generated content
□ Content matches preset aesthetic (e.g., luxury text for luxury preset)
□ Verify save button works
```

### Test 4: Save/Open System
```
□ Create project A
□ Add content, modify sections
□ Click Save → success message
□ Close browser tab completely
□ Reopen MotionForge AI
□ Dashboard shows project A in recent
□ Click to open → loads with all changes preserved
□ Verify auto-save worked (check if updates appeared every 10s)
```

### Test 5: Cross-Studio Navigation
```
□ Create Web project (name: "Web Test")
□ Create Music Video project (name: "MV Test")
□ Create Motion project (name: "Motion Test")
□ Dashboard shows all 3 projects
□ Click Web project → opens in Web Studio
□ Back button → returns to dashboard
□ Click MV project → opens in Music Video Director
□ Verify metadata preserved for each
□ Verify no data loss when switching studios
```

### Test 6: Usability Features
```
□ Search for project by name → finds it
□ Sort projects by date → most recent first
□ Filter projects by type → shows only selected type
□ Mobile view (if responsive) → UI adapts
□ Dark mode (if implemented) → works correctly
□ Keyboard shortcuts (if implemented) → Ctrl+K opens search, etc.
```

### Test 7: Error Handling
```
□ Try to create project with empty name → error message
□ Delete a project → confirmation modal appears
□ Storage full warning → appears at 50% quota
□ Network error during generation → graceful error message
□ Unsaved changes → warning before close
□ Very large project → still loads without crashing
```

### Test 8: Accessibility (WCAG 2.1 AA)
```
□ Tab through all buttons → focus visible
□ All buttons clickable with Enter/Space
□ Images have alt text
□ Color not sole differentiator (labels + icons)
□ Text contrast >= 4.5:1
□ Form labels associated with inputs
□ Error messages announced to screen readers
□ No keyboard traps
□ Link text descriptive (not "click here")
```

### Test 9: Performance
```
□ Dashboard loads < 2 seconds
□ Project open < 3 seconds
□ Generation starts within 5 seconds
□ No memory leaks after 30 mins usage
□ Multiple tabs don't cause slowdown
□ Large project (20+ sections) still responsive
```

## Build & Package

### Build for Web
```bash
# Development build
npm run dev

# Production build
npm run build

# Verify build success
ls -lh dist/ | head -20
echo "Build size: $(du -sh dist/ | cut -f1)"

# Test built version locally
npm run preview  # Serves from dist/
```

### Build for Windows (Tauri)
```bash
# Install Tauri CLI (one-time)
npm install @tauri-apps/cli --save-dev

# Build Windows app
npm run tauri build

# Output should appear in src-tauri/target/release/

# Verify artifacts
ls -lh src-tauri/target/release/ | grep -i "msi\|exe\|zip"
```

### Create Installation Package
```bash
# Create deploy folder
mkdir -p deploy/v1.4.0

# Copy Windows installer
cp src-tauri/target/release/*.msi deploy/v1.4.0/
cp src-tauri/target/release/*.exe deploy/v1.4.0/

# Create README
cat > deploy/v1.4.0/README.txt << 'EOF'
MotionForge AI v1.4.0 - Windows Release

INSTALLATION:
1. Download MotionForge_AI_1.4.0_x64_en-US.msi
2. Double-click to run installer
3. Follow prompts to complete installation
4. Launch "MotionForge AI" from Start Menu

FEATURES (v1.4.0):
- Web Studio with 24 design presets
- Improved project management
- Better usability and UX
- Cross-studio project navigation
- Auto-save every 10 seconds
- Full project persistence

SYSTEM REQUIREMENTS:
- Windows 10 or later (64-bit)
- 4GB RAM minimum
- 500MB disk space
- Internet connection for AI generation

GETTING STARTED:
1. Open MotionForge AI
2. Click "New Project"
3. Choose studio (Web, Music Video, Motion, Glam)
4. Select design preset (if Web Studio)
5. Fill in project details
6. Click "Generate" to create content
7. Projects auto-save every 10 seconds

SUPPORT:
For help, see the Help Center (Ctrl+H or ? button in app)

Built with: React, Tauri, TypeScript
EOF

# List deployment package
ls -lh deploy/v1.4.0/
```

## Post-Build Verification

### Windows Installer Test
```bash
# Test 1: Installer runs
# Click on .msi file → should show Windows installer wizard

# Test 2: Installation completes
# Follow prompts → "Install" button works → app installs

# Test 3: App launches
# Look in Start Menu for "MotionForge AI"
# Double-click to launch → app opens

# Test 4: First run
# Dashboard appears
# Click "New Project" → works
# Complete project flow → success

# Test 5: Data persists
# Close app completely (Alt+F4)
# Reopen app
# Previous project appears in Recent
# Click to open → loads correctly
```

### Performance Verification
```bash
# Check startup time
# Time from double-click to app fully loaded (target: < 5 seconds)

# Check file size
du -sh "C:\Program Files\MotionForge AI"

# Check registry entries (if applicable)
# Registry should contain app settings

# Check uninstall
# Settings → Apps → MotionForge AI → Uninstall works cleanly
# After uninstall, shortcut removed, app folder cleaned
```

## Rollback Plan

If issues found after deployment:
1. Archive v1.4.0 installer to `deploy/v1.4.0_backup/`
2. Revert to v1.3.0 if available
3. Fix issues on a new branch
4. Re-test thoroughly
5. Re-deploy as v1.4.1

## Sign-Off Checklist

**Functionality**
- [ ] All 24 presets load correctly
- [ ] New project flow works end-to-end
- [ ] Generation produces appropriate content
- [ ] Save/open/list works for all project types
- [ ] Auto-save runs without errors
- [ ] Cross-studio navigation works

**Usability**
- [ ] Dashboard is clear and intuitive
- [ ] Recent projects visible
- [ ] Empty states have guidance
- [ ] Error messages are helpful
- [ ] Keyboard shortcuts work (if implemented)

**Quality**
- [ ] No console errors in main flow
- [ ] No memory leaks
- [ ] App launches quickly
- [ ] Large projects don't crash
- [ ] Accessibility standards met

**Deployment**
- [ ] Windows installer works
- [ ] App launches from Start Menu
- [ ] Projects persist after close/reopen
- [ ] Uninstall works cleanly
- [ ] Version number correct (v1.4.0)

## Timeline

```
Build phase:        15-20 min
Testing:            30-45 min
Windows build:      10-15 min
Installation test:  10 min
Sign-off:           5 min
━━━━━━━━━━━━━━━━━━━━
Total:              ~70-85 min (1.5 hours)
```

## Test Commands Cheat Sheet

```bash
# Quick validation
npm run build 2>&1 | tail -20
echo "✓ Build successful"

# Start dev server for testing
npm run dev

# Type check only
npx tsc --noEmit

# Build for production
npm run build

# Create Windows app
npm run tauri build

# View built app
ls -lh dist/ src-tauri/target/release/
```

## Success Criteria

✅ **All tests pass without errors**
✅ **Windows installer works**
✅ **App launches from Start Menu**
✅ **Projects persist on restart**
✅ **No console errors during normal flow**
✅ **Performance acceptable (< 3s load)**
✅ **Accessibility guidelines met**

---

**Ready to ship when all checkboxes above are completed and signed off.**
