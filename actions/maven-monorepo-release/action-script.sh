#! /usr/bin/env bash

function check_version_type() {
    if [[ $1 != "major" && $1 != "minor" && $1 != "patch" ]]; then
        echo "Invalid version type. Please use major, minor or patch."
        exit 1
    fi
}

function check_component() {
    if [ -z "$1" ]; then
        echo "component input is required."
        exit 1
    fi
}

function check_token() {
    if [ -z "$1" ]; then
        echo "token input parameter is required."
        exit 1
    fi
}

# Computes RELEASE_VERSION and RELEASE_VERSION_ARG for the component pom.xml
# Requires: WORKING_DIR, VERSION_TYPE
# Exports:  RELEASE_VERSION, RELEASE_VERSION_ARG, NEXT_DEV_VERSION
function compute_release_version() {
    cd "${WORKING_DIR}"

    CURRENT_VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)
    # Strip -SNAPSHOT suffix if present
    BASE_VERSION="${CURRENT_VERSION%-SNAPSHOT}"
    echo "Current version: ${CURRENT_VERSION}  (base: ${BASE_VERSION})"

    major=$(echo "${BASE_VERSION}" | cut -d "." -f 1)
    minor=$(echo "${BASE_VERSION}" | cut -d "." -f 2)
    patch=$(echo "${BASE_VERSION}" | cut -d "." -f 3)

    if [ "${VERSION_TYPE}" == "major" ]; then
        RELEASE_VERSION="$((major + 1)).0.0"
        NEXT_MINOR=0
        NEXT_PATCH=0
        NEXT_MAJOR=$((major + 1))
    elif [ "${VERSION_TYPE}" == "minor" ]; then
        RELEASE_VERSION="${major}.$((minor + 1)).0"
        NEXT_MAJOR=${major}
        NEXT_MINOR=$((minor + 1))
        NEXT_PATCH=0
    else
        # patch: the current base version IS the release version
        RELEASE_VERSION="${BASE_VERSION}"
        NEXT_MAJOR=${major}
        NEXT_MINOR=${minor}
        NEXT_PATCH=$((patch + 1))
    fi

    NEXT_DEV_VERSION="${NEXT_MAJOR}.${NEXT_MINOR}.${NEXT_PATCH}-SNAPSHOT"
    RELEASE_VERSION_ARG="-DreleaseVersion=${RELEASE_VERSION} -DdevelopmentVersion=${NEXT_DEV_VERSION}"

    export RELEASE_VERSION RELEASE_VERSION_ARG NEXT_DEV_VERSION
    echo "Release version:   ${RELEASE_VERSION}"
    echo "Next dev version:  ${NEXT_DEV_VERSION}"
}

function set_profile() {
    if [ "${PROFILE}" != "" ]; then
        echo "Using profile ${PROFILE}"
        PROFILE_ARG="-P${PROFILE}"
    else
        echo "No profile specified"
        PROFILE_ARG=""
    fi
    export PROFILE_ARG
}

# Performs mvn release:prepare + release:perform for the component.
# Tag format: ${COMPONENT}-${RELEASE_VERSION}   (e.g. my-service-1.2.3)
# Requires: WORKING_DIR, COMPONENT, RELEASE_VERSION, RELEASE_VERSION_ARG,
#           MVN_ARGS, PROFILE_ARG, DRY_RUN, GITHUB_TOKEN
# Outputs:  RELEASE_VERSION, RELEASE_TAG  to GITHUB_OUTPUT
function release_component() {
    cd "${WORKING_DIR}"
    git config --global user.name "qubership-actions[bot]"
    git config --global user.email "qubership-actions[bot]@users.noreply.github.com"

    TAG_NAME="${COMPONENT}-${RELEASE_VERSION}"

    if [ "${DRY_RUN}" != "false" ]; then
        echo "::group::Dry-run build ${COMPONENT} (current SNAPSHOT)"
        echo "ℹ️ Dry run — would release ${COMPONENT} as ${TAG_NAME}"
        # shellcheck disable=2086
        mvn --batch-mode deploy ${MVN_ARGS} ${PROFILE_ARG}
        # shellcheck disable=2181
        if [ $? -ne 0 ]; then
            echo "Build failed."
            echo "❌ Dry-run: build ${COMPONENT} failed." >> "$GITHUB_STEP_SUMMARY"
            exit 1
        fi
        echo "::endgroup::"
        RELEASE_VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)
        export RELEASE_VERSION
        RELEASE_TAG="${COMPONENT}-${RELEASE_VERSION}"
        echo "✔️ Dry-run: built ${COMPONENT} @ ${RELEASE_VERSION}" >> "$GITHUB_STEP_SUMMARY"
    else
        echo "::group::Preparing release ${TAG_NAME}"
        mvn --batch-mode versions:use-releases -DgenerateBackupPoms=false
        # shellcheck disable=2086
        echo "ℹ️ release:prepare"
        mvn --batch-mode release:prepare \
            -DautoVersionSubmodules=true \
            -DpushChanges=true \
            "-DtagNameFormat=${COMPONENT}-@{project.version}" \
            ${RELEASE_VERSION_ARG} \
            ${PROFILE_ARG} \
            ${MVN_ARGS}
        # shellcheck disable=2181
        if [ $? -ne 0 ]; then
            echo "release:prepare failed."
            echo "❌ Release: prepare ${TAG_NAME} failed." >> "$GITHUB_STEP_SUMMARY"
            exit 1
        fi
        echo "::endgroup::"

        # Extract actual tag from release.properties written by the plugin
        RELEASE_VERSION=$(sed -n "s/scm.tag=${COMPONENT}-//p" release.properties)
        export RELEASE_VERSION
        RELEASE_TAG="${COMPONENT}-${RELEASE_VERSION}"
        echo "✅ Prepared ${RELEASE_TAG}" >> "$GITHUB_STEP_SUMMARY"

        echo "::group::Performing release ${RELEASE_TAG}"
        # shellcheck disable=2086
        mvn --batch-mode release:perform \
            -DpushChanges=true \
            ${PROFILE_ARG} \
            ${MVN_ARGS}
        # shellcheck disable=2181
        if [ $? -ne 0 ]; then
            echo "release:perform failed."
            echo "❌ Release: perform ${RELEASE_TAG} failed." >> "$GITHUB_STEP_SUMMARY"
            exit 1
        fi
        echo "::endgroup::"
        echo "✅ Released ${RELEASE_TAG}" >> "$GITHUB_STEP_SUMMARY"
    fi

    echo "RELEASE_TAG=${RELEASE_TAG}" >> "$GITHUB_OUTPUT"
    echo "RELEASE_VERSION=${RELEASE_VERSION}" >> "$GITHUB_OUTPUT"
    export RELEASE_TAG
}

# Creates a GitHub Release for the component tag.
# Requires: RELEASE_TAG, RELEASE_VERSION, COMPONENT, GITHUB_TOKEN,
#           GITHUB_REPOSITORY, DRY_RUN
function create_github_release() {
    if [ "${DRY_RUN}" != "false" ]; then
        echo "Dry-run: skipping GitHub Release creation for ${RELEASE_TAG}"
        return
    fi

    echo "Creating GitHub Release ${RELEASE_TAG}"
    gh release create "${RELEASE_TAG}" \
        --repo "${GITHUB_REPOSITORY}" \
        --title "${RELEASE_TAG}" \
        --notes "Release of ${COMPONENT} version ${RELEASE_VERSION}" \
        --target "${RELEASE_REF}"
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "::warning::GitHub Release creation failed for ${RELEASE_TAG} (tag may not exist yet)"
    else
        echo "✅ GitHub Release ${RELEASE_TAG} created." >> "$GITHUB_STEP_SUMMARY"
    fi
}

# Builds and pushes the Docker image for the component.
# Requires: WORKING_DIR, COMPONENT, RELEASE_VERSION, RELEASE_TAG,
#           DOCKERFILE, BUILD_CONTEXT, REGISTRY, GITHUB_TOKEN, DRY_RUN
function build_and_push_docker_image() {
    DOCKERFILE_PATH="${WORKING_DIR}/${DOCKERFILE}"
    CONTEXT_PATH="${WORKING_DIR}/${BUILD_CONTEXT}"

    if [ ! -f "${DOCKERFILE_PATH}" ]; then
        echo "No Dockerfile at ${DOCKERFILE_PATH} — skipping Docker build."
        return
    fi

    IFS='/' read -r owner _ <<< "${GITHUB_REPOSITORY}"
    OWNER_LC=$(echo "${owner}" | tr '[:upper:]' '[:lower:]')
    COMPONENT_LC=$(echo "${COMPONENT}" | tr '[:upper:]' '[:lower:]')

    IMAGE_BASE="ghcr.io/${OWNER_LC}/${COMPONENT_LC}"
    IMAGE_VERSIONED="${IMAGE_BASE}:${RELEASE_VERSION}"
    IMAGE_LATEST="${IMAGE_BASE}:latest"

    if [ "${DRY_RUN}" != "false" ]; then
        echo "ℹ️ Dry-run: would build & push ${IMAGE_VERSIONED}"
        echo "✔️ Dry-run: Docker image ${IMAGE_VERSIONED} (not pushed)" >> "$GITHUB_STEP_SUMMARY"
        echo "DOCKER_IMAGE=${IMAGE_VERSIONED}" >> "$GITHUB_OUTPUT"
        return
    fi

    echo "::group::Building Docker image ${IMAGE_VERSIONED}"
    echo "${GITHUB_TOKEN}" | docker login ghcr.io -u "${GITHUB_ACTOR}" --password-stdin

    docker build \
        --file "${DOCKERFILE_PATH}" \
        --tag "${IMAGE_VERSIONED}" \
        --tag "${IMAGE_LATEST}" \
        "${CONTEXT_PATH}"
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "Docker build failed."
        echo "❌ Docker: build ${IMAGE_VERSIONED} failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi

    docker push "${IMAGE_VERSIONED}"
    docker push "${IMAGE_LATEST}"
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "Docker push failed."
        echo "❌ Docker: push ${IMAGE_VERSIONED} failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi
    echo "::endgroup::"
    echo "✅ Docker: pushed ${IMAGE_VERSIONED}" >> "$GITHUB_STEP_SUMMARY"
    echo "DOCKER_IMAGE=${IMAGE_VERSIONED}" >> "$GITHUB_OUTPUT"
}

# Bumps org.qubership dependencies to next -SNAPSHOT in the component pom.xml.
# Requires: WORKING_DIR, COMPONENT, MVN_ARGS, PROFILE_ARG, DRY_RUN
function bump_dependencies_versions() {
    cd "${WORKING_DIR}"

    if [ "${DRY_RUN}" != "false" ]; then
        echo "Dry-run: skipping dependency bump for ${COMPONENT}"
        return
    fi

    VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)
    export VERSION

    echo "::group::Deploying SNAPSHOT ${VERSION} for ${COMPONENT}"
    # shellcheck disable=2086
    mvn --batch-mode deploy -DskipTests=true ${MVN_ARGS} ${PROFILE_ARG}
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "SNAPSHOT deploy failed."
        echo "❌ Build: ${COMPONENT} version ${VERSION} failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi
    echo "::endgroup::"

    echo "::group::Updating ${COMPONENT} dependencies to next-snapshot"
    mvn --batch-mode versions:use-next-snapshots \
        -DgenerateBackupPoms=false \
        -Dincludes="org.qubership.cloud*:*,org.qubership.core*:*"
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "versions:use-next-snapshots failed."
        echo "❌ Update: dependency bump for ${COMPONENT} failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi
    echo "::endgroup::"

    mvn --batch-mode clean
    gitdiffstat=$(git diff --stat)
    if [ -z "${gitdiffstat}" ]; then
        echo "No dependency changes in ${COMPONENT}."
        echo "ℹ️ Commit: no changed dependencies in ${COMPONENT}." >> "$GITHUB_STEP_SUMMARY"
        return
    fi

    git add .
    git commit -m "Bump ${COMPONENT} dependencies to next-snapshot [skip ci]"
    git push
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "git push failed."
        echo "❌ Commit: dependency bump for ${COMPONENT} failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi
    echo "✅ Commit: ${COMPONENT} dependencies bumped." >> "$GITHUB_STEP_SUMMARY"
}
