# Qubership Workflow Hub

A comprehensive collection of reusable GitHub Actions and Workflows for CI/CD pipelines. This repository contains JavaScript-based GitHub Actions and reusable workflow templates.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap the Repository
- `git clone https://github.com/netcracker/qubership-workflow-hub.git`
- `cd qubership-workflow-hub`

### Install Dependencies for JavaScript Actions
Install all action dependencies at once (FASTEST approach):
```bash
for action in metadata-action assets-action archive-and-upload-assets container-package-cleanup custom-event pr-assigner pom-updater tag-checker; do 
  cd actions/$action && npm install --silent; cd ../..
done
```
- Takes: 6-8 seconds total for all 8 actions
- NEVER CANCEL: Quick installation, completes in under 10 seconds

Individual installation (if needed):
- `cd actions/metadata-action && npm install` -- takes 2-3 seconds
- `cd actions/assets-action && npm install` -- takes 3-4 seconds  
- `cd actions/archive-and-upload-assets && npm install` -- takes 2-3 seconds
- `cd actions/container-package-cleanup && npm install` -- takes 2-3 seconds
- `cd actions/custom-event && npm install` -- takes 1-2 seconds
- `cd actions/pr-assigner && npm install` -- takes 1-2 seconds
- `cd actions/pom-updater && npm install` -- takes 2-3 seconds
- `cd actions/tag-checker && npm install` -- takes 1-2 seconds

### Testing Individual Actions
Only the container-package-cleanup action has a test suite:
- `cd actions/container-package-cleanup && npm test` -- runs Jest tests in 1-2 seconds
- **EXPECTED BEHAVIOR**: 2 tests fail, 36 pass, 1 test suite passes - this is normal
- Failures are due to missing modules and wildcard pattern edge cases
- Do NOT attempt to fix these failing tests unless specifically working on container-package-cleanup

All other actions return "Error: no test specified" when running `npm test`.

### Validation and Linting
- Run YAML linting: `yamllint -c .github/linters/.yaml-lint.yml .github/workflows/ actions/ docs/` -- takes <1 second, produces ~205 lint warnings (expected)
- Check file count: `find .github/workflows -name "*.yaml" -o -name "*.yml" | wc -l` returns 29 workflow files
- Check action count: `find actions -name "*.yml" -o -name "*.yaml" | wc -l` returns 106 action definition files
- **COMPREHENSIVE VALIDATION**: Run full repository check in <1 second:
```bash
echo "=== Full Repository Validation ==="
echo "1. YAML Linting:" && yamllint -c .github/linters/.yaml-lint.yml .github/workflows/ actions/ docs/ | wc -l
echo "2. File counts:"
echo "Workflows: $(find .github/workflows -name "*.yaml" -o -name "*.yml" | wc -l)"
echo "Actions: $(find actions -name "*.yml" -o -name "*.yaml" | wc -l)" 
echo "Markdown: $(find . -name "*.md" -not -path "./actions/*/node_modules/*" | wc -l)"
echo "3. Dependencies installed: $(find actions -name node_modules -type d | wc -l)/8 actions"
```
Expected output: ~205 lint issues, 29 workflows, 106 action files, 40 markdown files

## Repository Structure
This is NOT a traditional application to "build and run" - it's a library of reusable GitHub Actions and workflows.

### Key Directories
- `actions/` - 22 individual GitHub Actions (mix of composite and JavaScript)
- `.github/workflows/` - 29 CI/CD workflow definitions 
- `docs/` - Comprehensive documentation including getting-started.md and standards
- `.github/linters/` - Linter configuration files

### Key Files by Directory
```
actions/
├── archive-and-upload-assets/    # Upload build artifacts
├── assets-action/               # Handle asset operations  
├── cdxgen/                      # Generate CycloneDX SBOM
├── chart-version/               # Helm chart versioning
├── container-package-cleanup/   # Clean up container packages (has tests)
├── custom-event/               # Send custom events
├── docker-action/              # Docker operations
├── maven-release/              # Maven release management
├── metadata-action/            # Extract/compute metadata
├── tag-action/                 # Git tag operations
└── [12 more actions...]

.github/workflows/
├── super-linter.yaml           # Main linting pipeline
├── prettier.yaml               # Code formatting
├── link-checker.yaml          # Documentation link validation
├── spelling.yaml               # Spell checking
└── [25 more workflows...]

docs/
├── getting-started.md          # Usage instructions
├── standards-and-change-policy.md  # Development standards
├── actions-workflows-catalog.md    # Complete catalog
└── [7 more documentation files...]
```

## Validation Scenarios
After making changes, always run these validation steps:

### 1. YAML Syntax Validation
```bash
yamllint -c .github/linters/.yaml-lint.yml .github/workflows/ actions/ docs/
```
- Takes: <1 second
- Expected: ~197 warnings (mostly indentation, line length)
- NEVER CANCEL: Quick validation, completes in under 1 second

### 2. Action Dependencies
If modifying JavaScript actions, install and test dependencies:
```bash
cd actions/[action-name]
npm install
npm test  # Only works for container-package-cleanup
```
- Takes: 1-15 seconds per action depending on dependencies
- Expected: Most actions have no tests configured

### 3. Documentation Links
```bash
# Check that documentation is accessible
ls -la docs/
cat docs/getting-started.md | head -20
```

## Validation Requirements
This repository uses GitHub Actions for CI/CD validation. The main validation workflows include:

- **super-linter**: Validates YAML, JavaScript, Markdown, and other file types
- **prettier**: Code formatting validation
- **link-checker**: Validates links in documentation  
- **spelling**: Spell checking across documentation

## Common Tasks

### Adding a New Action
1. Create directory under `actions/[action-name]/`
2. Add `action.yml` with proper inputs/outputs/runs configuration
3. If JavaScript: add `package.json`, `index.js`, and install dependencies
4. Test syntax: `yamllint -c .github/linters/.yaml-lint.yml actions/[action-name]/action.yml`
5. Update documentation in `docs/actions-workflows-catalog.md`

### Adding a New Workflow  
1. Create `.github/workflows/[workflow-name].yaml`
2. Use `on: workflow_call` for reusable workflows
3. Test syntax: `yamllint -c .github/linters/.yaml-lint.yml .github/workflows/[workflow-name].yaml`
4. Add documentation in `docs/reusable/` if it's a reusable workflow

### Modifying Existing Actions
1. Never break existing interfaces (inputs/outputs)
2. Test changes by installing dependencies and running available tests
3. Run YAML validation after changes
4. Update version tags following semantic versioning

## Time Expectations
- **NEVER CANCEL**: All validation commands complete in under 10 seconds
- Full repository YAML validation: <1 second  
- Installing all action dependencies: 6-8 seconds total
- Running available tests: 1-2 seconds
- Comprehensive validation scenario: <1 second
- Link checking and spell checking: handled by CI workflows

## Manual Validation Scenarios

### Complete Developer Workflow Validation
After making any changes, run this complete validation sequence:

```bash
# 1. Install all action dependencies (6-8 seconds)
for action in metadata-action assets-action archive-and-upload-assets container-package-cleanup custom-event pr-assigner pom-updater tag-checker; do 
  cd actions/$action && npm install --silent; cd ../..
done

# 2. Run available tests (1-2 seconds)
cd actions/container-package-cleanup && npm test; cd ../..

# 3. Comprehensive validation (<1 second)
echo "=== Full Repository Validation ==="
echo "1. YAML Linting:" && yamllint -c .github/linters/.yaml-lint.yml .github/workflows/ actions/ docs/ | wc -l
echo "2. File counts:"
echo "Workflows: $(find .github/workflows -name "*.yaml" -o -name "*.yml" | wc -l)"
echo "Actions: $(find actions -name "*.yml" -o -name "*.yaml" | wc -l)" 
echo "Markdown: $(find . -name "*.md" -not -path "./actions/*/node_modules/*" | wc -l)"
echo "3. Dependencies installed: $(find actions -name node_modules -type d | wc -l)/8 actions"

# 4. Check git status
git status
```

**EXPECTED RESULTS**:
- Dependencies install without errors (some npm audit warnings are normal)
- Container-package-cleanup tests: 2 failed, 36 passed (this is expected)
- ~205 YAML lint warnings (normal - mostly formatting)
- File counts: 29 workflows, 106 action files, 40 markdown files
- 8 node_modules directories created

**TOTAL TIME**: Under 10 seconds for complete validation

### Quick Change Validation
For small changes to YAML files only:
```bash
yamllint -c .github/linters/.yaml-lint.yml .github/workflows/ actions/ docs/ | head -20
```
- Takes: <1 second
- Shows first 20 lint issues for quick review

### Action-Specific Validation  
When modifying a specific JavaScript action:
```bash
cd actions/[action-name]
npm install --silent
# Test syntax of action definition
yamllint -c ../../.github/linters/.yaml-lint.yml action.yml
```

## Notes
- This repository does not have a traditional "build" process
- Most actions don't have unit tests (only container-package-cleanup does)
- Validation focuses on YAML syntax, dependencies, and documentation
- Manual testing involves using actions in test workflows rather than running a server/application
- The primary "validation scenario" is ensuring actions can be successfully referenced and used by other repositories

## References
- Main documentation: `docs/getting-started.md`
- Action catalog: `docs/actions-workflows-catalog.md`  
- Standards: `docs/standards-and-change-policy.md`
- Example configurations: `docs/examples/`