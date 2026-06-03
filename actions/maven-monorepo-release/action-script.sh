#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Validate inputs
validate_inputs() {
    local component=$1
    local version_type=$2
    local publish_target=$3
    local token=$4

    if [[ -z "$component" ]]; then
        log_error "component input is required"
        exit 1
    fi

    if [[ -z "$token" ]]; then
        log_error "token input is required"
        exit 1
    fi

    # Validate version type (allow: major, minor, patch, or semantic version like 1.2.3)
    if ! [[ "$version_type" =~ ^(major|minor|patch|[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
        log_error "version-type must be 'major', 'minor', 'patch', or a semantic version like '1.2.3'"
        exit 1
    fi

    # Validate publish target
    if ! [[ "$publish_target" =~ ^(central|github|both)$ ]]; then
        log_error "publish-target must be 'central', 'github', or 'both'"
        exit 1
    fi

    if [[ "$publish_target" == "central" ]]; then
        if [[ -z "${MAVEN_USERNAME:-}" ]] || [[ -z "${MAVEN_PASSWORD:-}" ]]; then
            log_error "maven-central-username and maven-central-password required for Maven Central publishing"
            exit 1
        fi
    fi

    log_success "Input validation passed"
}

# Validate monorepo structure
validate_monorepo_structure() {
    local component=$1

    log_info "Validating monorepo structure..."

    # Check if component directory exists
    if [[ ! -d "$component" ]]; then
        log_error "Component directory '$component' not found"
        exit 1
    fi

    # Check if component has pom.xml
    if [[ ! -f "$component/pom.xml" ]]; then
        log_error "Component '$component' does not have pom.xml"
        exit 1
    fi

    # For non-parent components, validate parent reference
    if [[ "$component" != "parent" ]]; then
        local top_dir=$(pwd)
        local parent_groupid
        parent_groupid=$(cd "$component" && mvn help:evaluate -Dexpression=project.parent.groupId -q -DforceStdout 2>/dev/null || echo "")
        cd "$top_dir"
        if [[ -z "$parent_groupid" ]]; then
            log_warning "Component '$component' does not have a parent POM reference"
        else
            log_success "Component '$component' inherits from parent: $parent_groupid"
        fi
    fi

    log_success "Monorepo structure validation passed"
}

# Get current version of component
get_current_version() {
    local top_dir=$(pwd)
    local component=$1
    cd "$component"
    mvn help:evaluate -Dexpression=project.version -q -DforceStdout 2>/dev/null || echo ""
    cd "$top_dir"
}

# Parse version and bump it
bump_version() {
    local current=$1
    local bump_type=$2

    # Remove -SNAPSHOT suffix if present
    local base_version="${current%-SNAPSHOT}"

    # Parse version components
    local IFS='.'
    read -r major minor patch <<< "$base_version"

    major=${major:-0}
    minor=${minor:-0}
    patch=${patch:-0}

    case "$bump_type" in
        major)
            echo "$((major + 1)).0.0"
            ;;
        minor)
            echo "$major.$((minor + 1)).0"
            ;;
        patch)
            echo "$major.$minor.$((patch + 1))"
            ;;
        *)
            # Explicit version
            echo "$bump_type"
            ;;
    esac
}

# Get next snapshot version
get_next_snapshot_version() {
    local release_version=$1
    echo "${release_version}-SNAPSHOT"
}

# Update version in pom.xml using Maven
update_pom_version() {
    local top_dir=$(pwd)
    local component=$1
    local new_version=$2

    log_info "Updating version in $component/pom.xml to $new_version"
    cd "$component"
    mvn versions:set -DnewVersion="$new_version" -DgenerateBackupPoms=false -q
    log_success "Version updated to $new_version"
    cd "$top_dir"
}

# Find all inter-module dependencies
find_monorepo_dependencies() {
    local component=$1
    local search_groupid=$2
    local search_artifactid=$3

    log_info "Finding references to $search_groupid:$search_artifactid in other components..."

    # Search all pom.xml files for the dependency (excluding the component itself)
    local found_count=0
    while IFS= read -r pom_file; do
        local component_dir=$(dirname "$pom_file")

        # Skip the component itself and target directories
        if [[ "$component_dir" == "$component" ]] || [[ "$component_dir" == *"/target"* ]]; then
            continue
        fi

        # Check if pom.xml contains the dependency
        if grep -q "<artifactId>$search_artifactid</artifactId>" "$pom_file"; then
            # Verify it's the same groupId
            if grep -q "<groupId>$search_groupid</groupId>" "$pom_file"; then
                echo "$component_dir"
                ((found_count++))
            fi
        fi
    done < <(find . -name "pom.xml" -type f -not -path "*/target/*")

    return $found_count
}

# Update dependency version in a pom.xml file
update_dependency_version() {
    local pom_file=$1
    local groupid=$2
    local artifactid=$3
    local new_version=$4

    cd "$(dirname "$pom_file")"
    log_info "Updating $groupid:$artifactid to $new_version in $(basename $pom_file)"
    mvn versions:use-dep-version -Dincludes="$groupid:$artifactid" \
        -DdepVersion="$new_version" -DgenerateBackupPoms=false -q || true
}

# Create git tag
create_git_tag() {
    local component=$1
    local version=$2
    local tag_name="${component}-${version}"

    log_info "Creating git tag: $tag_name"

    git config --global user.name "qubership-actions[bot]"
    git config --global user.email "qubership-actions[bot]@users.noreply.github.com"

    git tag -a "$tag_name" -m "Release $component version $version"
    git push origin "$tag_name"

    log_success "Tag $tag_name created and pushed"
}

# Commit version changes
commit_version_changes() {
    local component=$1
    local message=$2

    log_info "Committing version changes: $message"

    git config --global user.name "qubership-actions[bot]"
    git config --global user.email "qubership-actions[bot]@users.noreply.github.com"

    git add "$component/pom.xml"

    # Check if there are changes to commit
    if git diff --cached --quiet; then
        log_warning "No changes to commit"
        return 0
    fi

    git commit -m "$message"
    git push origin

    log_success "Changes committed and pushed"
}

# Build and deploy component
build_and_deploy() {
    local top_dir=$(pwd)
    local component=$1
    local version=$2
    local publish_target=$3
    local maven_args=$4
    local maven_profile=$5

    log_info "Building component $component version $version..."

    cd "$component"

    # Build command
    local build_cmd="mvn clean package $maven_args"
    [[ -n "$maven_profile" ]] && build_cmd="$build_cmd -P$maven_profile"

    if ! eval "$build_cmd"; then
        log_error "Build failed for $component"
        return 1
    fi

    log_success "Build successful"

    # Deploy
    if [[ "$publish_target" == "github" ]]; then
        log_info "Deploying to GitHub Packages..."
        local deploy_cmd="mvn deploy -DskipTests $maven_args -Drepo.id=github"
        [[ -n "$maven_profile" ]] && deploy_cmd="$deploy_cmd -P$maven_profile"

        if ! eval "$deploy_cmd"; then
            log_error "GitHub deployment failed"
            return 1
        fi
        log_success "GitHub deployment successful"
    fi

    if [[ "$publish_target" == "central" ]]; then
        log_info "Deploying to Maven Central..."
        local deploy_cmd="mvn deploy -DskipTests $maven_args"
        [[ -n "$maven_profile" ]] && deploy_cmd="$deploy_cmd -P$maven_profile"

        if ! eval "$deploy_cmd"; then
            log_error "Maven Central deployment failed"
            return 1
        fi
        log_success "Maven Central deployment successful"
    fi

    cd "$top_dir"
}

# Get component info from pom.xml
get_component_info() {
    local top_dir=$(pwd)
    local component=$1

    cd "$component"

    local groupid
    local artifactid

    groupid=$(mvn help:evaluate -Dexpression=project.groupId -q -DforceStdout 2>/dev/null || echo "")
    artifactid=$(mvn help:evaluate -Dexpression=project.artifactId -q -DforceStdout 2>/dev/null || echo "")

    echo "$groupid:$artifactid"
    cd "$top_dir"
}

# Release component
release_component() {
    local component=$1
    local version_type=$2
    local publish_target=$3
    local dry_run=$4
    local maven_profile=$5
    local maven_args=$6
    local update_parent_version=$7

    log_info "=========================================="
    log_info "Starting release of component: $component"
    log_info "=========================================="

    # Get current version
    local current_version
    current_version=$(get_current_version "$component")

    if [[ -z "$current_version" ]]; then
        log_error "Failed to determine current version"
        exit 1
    fi

    log_info "Current version: $current_version"

    # Calculate new version
    local new_version
    new_version=$(bump_version "$current_version" "$version_type")

    log_success "Release version: $new_version"

    # Get component info
    local component_info
    component_info=$(get_component_info "$component")

    if [[ "$dry_run" != "false" ]]; then
        log_warning "DRY RUN MODE - No changes will be committed or pushed"
        log_info "Would build and deploy version $new_version"

        cd "$component"
        log_info "Building component..."
        local build_cmd="mvn clean package $maven_args"
        [[ -n "$maven_profile" ]] && build_cmd="$build_cmd -P$maven_profile"
        eval "$build_cmd"

        log_success "Dry run validation successful"
        echo "RELEASE_VERSION=$new_version" >> "$GITHUB_OUTPUT"
        echo "COMPONENT_RELEASED=$component" >> "$GITHUB_OUTPUT"
        echo "ARTIFACTS=$component_info:$new_version" >> "$GITHUB_OUTPUT"
        return 0
    fi

    # Update version in pom.xml
    update_pom_version "$component" "$new_version"

    # Build and deploy
    echo "[DEBUG] build_and_deploy args: component=$component, new_version=$new_version, publish_target=$publish_target, maven_args='$maven_args', maven_profile='$maven_profile'"
    echo "[DEBUG] Current directory: $(pwd)"
    echo "[DEBUG] Directory contents: $(ls -la)"
    build_and_deploy "$component" "$new_version" "$publish_target" "$maven_args" "$maven_profile"

    # Commit release version
    commit_version_changes "$component" "chore($component): release version $new_version"

    # Create git tag
    create_git_tag "$component" "$new_version"

    # Update next snapshot version in pom.xml
    local next_snapshot
    next_snapshot=$(get_next_snapshot_version "$new_version")
    update_pom_version "$component" "$next_snapshot"

    # Commit snapshot version
    commit_version_changes "$component" "chore($component): bump to next snapshot version $next_snapshot"

    # Update parent version in other components if this was a parent release
    if [[ "$component" == "parent" ]] && [[ "$update_parent_version" == "true" ]]; then
        log_info "Updating parent version reference in other components..."

        local parent_info
        parent_info=$(get_component_info "parent")

        # Find all components that reference parent
        while IFS= read -r dep_component; do
            log_info "Updating $dep_component to use parent version $new_version"
            update_dependency_version "$dep_component/pom.xml" "${parent_info%:*}" "${parent_info#*:}" "$new_version"
            update_pom_version "$dep_component" "$(get_current_version "$dep_component")"
        done < <(find . -maxdepth 2 -name "pom.xml" -type f -not -path "*/target/*" \
            -exec grep -l "parent" {} \; | xargs -I {} dirname {} | sort -u)
    fi

    # Update dependencies in other components if they depend on this component
    # if [[ "$component" != "parent" ]] && [[ "$component" != "bom" ]]; then
        log_info "Checking for internal dependencies on $component..."

        local comp_info
        comp_info=$(get_component_info "$component")
        local groupid="${comp_info%:*}"
        local artifactid="${comp_info#*:}"

        while IFS= read -r dep_component; do
            log_info "Updating dependency in $dep_component..."
            update_dependency_version "$dep_component/pom.xml" "$groupid" "$artifactid" "$new_version"
            commit_version_changes "$dep_component" "chore($dep_component): update $artifactid to $new_version"
        done < <(find_monorepo_dependencies "$component" "$groupid" "$artifactid" 2>/dev/null || true)
    # fi

    log_success "=========================================="
    log_success "Release of $component completed successfully!"
    log_success "Release version: $new_version"
    log_success "=========================================="

    echo "RELEASE_VERSION=$new_version" >> "$GITHUB_OUTPUT"
    echo "COMPONENT_RELEASED=$component" >> "$GITHUB_OUTPUT"
    echo "ARTIFACTS=$component_info:$new_version" >> "$GITHUB_OUTPUT"
}

# Export functions for sourcing
export -f log_info log_success log_error log_warning validate_inputs validate_monorepo_structure
export -f get_current_version bump_version get_next_snapshot_version update_pom_version
export -f find_monorepo_dependencies update_dependency_version create_git_tag commit_version_changes
export -f build_and_deploy get_component_info release_component
