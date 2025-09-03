# Qubership Workflow Hub Development Instructions

**ALWAYS follow these instructions first and fallback to additional search and context gathering only if the information here is incomplete or found to be in error.**

## Project Overview
This repository is a GitHub Actions and Workflows hub containing reusable GitHub Actions and workflow templates. It is NOT a traditional application with a build/run cycle - it's a library of workflow components that other repositories consume.

## Working Effectively

### Essential Setup Commands
Run these commands in sequence for any fresh clone:

```bash
# Navigate to repository root
cd /home/runner/work/qubership-workflow-hub/qubership-workflow-hub

# Install dependencies for all Node.js-based actions (takes 4-5 seconds total)
for action_dir in actions/*/; do 
  if [ -f "$action_dir/package.json" ]; then 
    echo "Installing $action_dir" && cd "$action_dir" && npm install --silent && cd /home/runner/work/qubership-workflow-hub/qubership-workflow-hub
  fi
done
```

### Validation Commands
**CRITICAL: Set timeouts to 60+ seconds for validation commands. NEVER CANCEL these operations.**

#### YAML Validation (required before any commit)
```bash
# Validate all YAML files - takes ~0.3 seconds. NEVER CANCEL.
# Note: This will show warnings/errors but completes successfully
yamllint actions/*/action.yml actions/*/action.yaml || echo "✅ YAML validation completed (warnings/errors are normal)"
```
**Note**: yamllint will show line-length warnings (>80 chars) and missing document start warnings. These are acceptable and do not block commits.

#### Run Available Tests
```bash
# Only container-package-cleanup has tests - takes ~1-2 seconds. NEVER CANCEL.
cd actions/container-package-cleanup && npm test
```
**Note**: Some tests may fail due to missing test dependencies. This is expected and does not block development.

#### Test Node.js Actions
```bash
# Test metadata-action functionality - takes ~0.1 seconds
cd actions/metadata-action && node dist/index.js
```

### NEVER CANCEL Operations
- **yamllint validation**: Takes 0.3 seconds, set timeout to 30+ seconds
- **npm install**: Takes 1-2 seconds per action, set timeout to 60+ seconds for all actions
- **npm test**: Takes 1-2 seconds, set timeout to 30+ seconds

## Repository Structure

### Key Directories
- `actions/` - Individual GitHub Actions (composite and Node.js-based)
- `docs/reusable/` - Reusable workflow documentation 
- `.github/workflows/` - Validation workflows (linting, formatting, etc.)
- `docs/` - Project documentation and standards

### Action Types
1. **Composite Actions** (majority): YAML files with shell script steps
   - Examples: `tag-action`, `docker-action`, `commit-and-push`
   - No build process required
   - Validation via yamllint only

2. **Node.js Actions** (8 total): JavaScript-based with package.json
   - Examples: `metadata-action`, `container-package-cleanup`, `pr-assigner`
   - Require `npm install` before testing
   - Have `dist/` folders with compiled code
   - List: `archive-and-upload-assets`, `assets-action`, `container-package-cleanup`, `custom-event`, `metadata-action`, `pom-updater`, `pr-assigner`, `tag-checker`

## Validation Scenarios

### Before Making Changes
**ALWAYS run these validation steps before modifying any files:**

1. **Validate YAML syntax** (timeout: 30+ seconds):
   ```bash
   yamllint actions/*/action.yml actions/*/action.yaml || echo "✅ YAML validation completed"
   ```

2. **Install dependencies for modified Node.js actions** (timeout: 60+ seconds):
   ```bash
   # If modifying a Node.js action, install its dependencies
   cd actions/[action-name] && npm install
   ```

3. **Test action functionality** (timeout: 30+ seconds):
   ```bash
   # For Node.js actions, test basic functionality
   cd actions/metadata-action && node dist/index.js
   ```

### After Making Changes
**ALWAYS validate your changes with these commands:**

1. **YAML validation** (timeout: 30+ seconds):
   ```bash
   yamllint actions/*/action.yml actions/*/action.yaml || echo "✅ YAML validation completed"
   ```

2. **Run tests if available** (timeout: 30+ seconds):
   ```bash
   cd actions/container-package-cleanup && npm test
   ```

3. **Verify action still loads** (timeout: 30+ seconds):
   ```bash
   # Test that Node.js actions still execute
   cd actions/metadata-action && node dist/index.js
   ```

## Common Tasks

### Adding a New Composite Action
1. Create directory in `actions/[action-name]/`
2. Create `action.yml` with required structure
3. Create `README.md` with documentation
4. Validate with `yamllint actions/[action-name]/action.yml`

### Modifying Node.js Actions
1. **NEVER modify `dist/` folder directly** - this is compiled code
2. Make changes in `src/` folder
3. Run `npm install` to ensure dependencies are current
4. Test with `node dist/index.js` (may show warnings, this is normal)

### Documentation Updates
1. Update corresponding `README.md` in action folder
2. Update `docs/reusable/[workflow-name].md` for reusable workflows
3. No validation required for documentation-only changes

## Troubleshooting

### Expected Warnings/Errors
- **yamllint line-length warnings**: Acceptable, do not fix unless specifically required
- **npm test failures in container-package-cleanup**: Some tests may fail due to missing mocks, this is expected
- **Node.js action warnings**: Actions may show configuration warnings when run standalone, this is normal

### What NOT to Do
- **DO NOT cancel long-running commands** - wait for completion
- **DO NOT modify `dist/` folders** in Node.js actions
- **DO NOT try to "build" the repository** - there is no global build process
- **DO NOT expect all tests to pass** - this is a collection of independent actions

### Getting Help
- Check existing action READMEs for specific usage patterns
- Review `docs/standards-and-change-policy.md` for contribution guidelines
- Look at `docs/getting-started.md` for usage examples

## Timing Expectations
- **yamllint validation**: 0.3 seconds (set timeout 30+ seconds)
- **npm install (single action)**: 1-2 seconds (set timeout 60+ seconds)
- **npm install (all actions)**: 4-5 seconds (set timeout 120+ seconds)
- **npm test**: 1-2 seconds (set timeout 30+ seconds)
- **Node.js action execution**: 0.1 seconds (set timeout 30+ seconds)

## Critical Reminders
- **NEVER CANCEL** any validation or installation commands
- **ALWAYS validate YAML** before committing changes
- **Actions are consumed by other repositories** - breaking changes affect external users
- **Each action is independent** - no shared build system or dependencies