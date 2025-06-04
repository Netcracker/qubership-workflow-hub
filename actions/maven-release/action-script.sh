#! /usr/bin/env bash

function check_version_type() {
    if [[ $1 != "major" && $1 != "minor" && $1 != "patch" ]]; then
        echo "Invalid version type. Please use major, minor or patch."
        exit 1
    fi
}

function check_module() {
    if [ -z "$1" ]; then
        echo "Module is required."
        exit 1
    fi
}

function check_token() {
    if [ -z "$1" ]; then
        echo "token input parameter is required."
        exit 1
    fi
}

function set_release_version() {
    # shellcheck disable=2164
    cd "${GITHUB_WORKSPACE}/${MODULE}"
    git config --global user.name "qubership-actions[bot]"
    git config --global user.email "qubership-actions[bot]@users.noreply.github.com"
    echo "Bumping ${MODULE} version"
    if [ "${DRY_RUN}" != "false" ]; then
        echo "Dry run. Not bumping version."
    else
        CURRENT_VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)
        echo "Current version: ${CURRENT_VERSION}"
        major=$(echo "${CURRENT_VERSION}" | cut -d "." -f 1)
        minor=$(echo "${CURRENT_VERSION}" | cut -d "." -f 2)
        # shellcheck disable=2034
        patch=$(echo "${CURRENT_VERSION}" | cut -d "." -f 3)
        if [ "${VERSION_TYPE}" == "major" ]; then
            RELEASE_VERSION_ARG="-DreleaseVersion=$((major + 1)).0.0"
        elif [ "${VERSION_TYPE}" == "minor" ]; then
            RELEASE_VERSION_ARG="-DreleaseVersion=${major}.$((minor + 1)).0"
        else
            RELEASE_VERSION_ARG=""
        fi
        export RELEASE_VERSION_ARG
    fi
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

function bump_version_and_build() {
    # shellcheck disable=2164
    cd "${GITHUB_WORKSPACE}/${MODULE}"
    git config --global user.name "qubership-actions[bot]"
    git config --global user.email "qubership-actions[bot]@users.noreply.github.com"
    if [ "${DRY_RUN}" != "false" ]; then
        echo "::group::Building ${MODULE} current version."
        echo "Dry run. Not bumping version."
        # shellcheck disable=2086
        echo "ℹ️ Dry run mvn command:"
        echo "mvn --batch-mode deploy $MVN_ARGS ${PROFILE_ARG}"
        mvn --batch-mode deploy $MVN_ARGS ${PROFILE_ARG}
        # shellcheck disable=2181
        if [ $? -ne 0 ]; then
            echo "Build failed. Exiting."
            echo "❌ Dry-run: build ${MODULE} version ${RELEASE_VERSION} failed." >> "$GITHUB_STEP_SUMMARY"
            exit 1
        fi
        echo "::endgroup::"
        RELEASE_VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)
        export RELEASE_VERSION
        echo "✔️ Dry-run: Successfully built ${MODULE} version ${RELEASE_VERSION}" >> "$GITHUB_STEP_SUMMARY"
    else
        echo "::group::Preparing ${MODULE} release."
        echo "ℹ️ Versions plugin mvn command:"
        echo "mvn --batch-mode versions:use-releases -DgenerateBackupPoms=false"
        mvn --batch-mode versions:use-releases -DgenerateBackupPoms=false
        # shellcheck disable=2086
        echo "ℹ️ Release preparation mvn command:"
        echo "mvn --batch-mode release:prepare -DautoVersionSubmodules=true -DpushChanges=true -DtagNameFormat=\"v@{project.version}\" ${RELEASE_VERSION_ARG} ${PROFILE_ARG} ${MVN_ARGS}"
        mvn --batch-mode release:prepare -DautoVersionSubmodules=true -DpushChanges=true -DtagNameFormat="v@{project.version}" ${RELEASE_VERSION_ARG} ${PROFILE_ARG} ${MVN_ARGS}
        # shellcheck disable=2181
        if [ $? -ne 0 ]; then
            echo "Release preparation failed. Exiting."
            echo "❌ Release: preparation of ${MODULE} version ${RELEASE_VERSION} release failed." >> "$GITHUB_STEP_SUMMARY"
            exit 1
        fi
        echo "::endgroup::"
        # scm.tag=v2.0.2
        RELEASE_VERSION=$(sed -n "s/scm.tag=v//p" release.properties)
        export RELEASE_VERSION
        echo "✅ Release: successfully prepared ${MODULE} version ${RELEASE_VERSION} release." >> "$GITHUB_STEP_SUMMARY"
    fi
    echo "RELEASE_VERSION=${RELEASE_VERSION}" >> "$GITHUB_OUTPUT"
    echo "Building ${MODULE} version ${RELEASE_VERSION}"
    if [ "${DRY_RUN}" != "false" ]; then
        echo "Dry run. Not committing."
        return
    fi
    echo "::group::Releasing ${MODULE} version ${RELEASE_VERSION}"
    # shellcheck disable=2086
    echo "ℹ️ Release perform mvn command:"
    echo "mvn --batch-mode release:perform -DpushChanges=true ${PROFILE_ARG} ${MVN_ARGS}"
    mvn --batch-mode release:perform -DpushChanges=true ${PROFILE_ARG} ${MVN_ARGS}
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "Release perform failed. Exiting."
        echo "❌ Release: ${MODULE} version ${RELEASE_VERSION} releas failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi
    echo "::endgroup::"
    echo "✅ Release: ${MODULE} version ${RELEASE_VERSION} released successfully." >> "$GITHUB_STEP_SUMMARY"
}

function bump_dependencies_versions() {
    # shellcheck disable=2164
    cd "${GITHUB_WORKSPACE}/${MODULE}"
    # To update pom.xml dependencies with the next -SNAPSHOT version need to deploy SNAPSHOT version
    if [ "${DRY_RUN}" != "false" ]; then
        echo "Dry run. Not updating dependencies."
        return
    fi
    VERSION=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout)
    export VERSION
    echo "::group::Building ${MODULE} version ${VERSION}"
    # shellcheck disable=2086
    mvn --batch-mode deploy -DskipTests=true $MVN_ARGS ${PROFILE_ARG}
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "Build failed. Exiting."
        echo "❌ Build: ${MODULE} version ${VERSION} failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi
    echo "::endgroup::"
    echo "✅ Build: ${MODULE} version ${VERSION} built successfully." >> "$GITHUB_STEP_SUMMARY"
    echo "::group::Updating ${MODULE} dependencies versions to next-snapshot"
    mvn --batch-mode versions:use-next-snapshots -DgenerateBackupPoms=false -Dincludes="org.qubership.cloud*:*,org.qubership.core*:*"
    # shellcheck disable=2181
    if [ $? -ne 0 ]; then
        echo "Update dependencies failed. Exiting."
        echo "❌ Update: ${MODULE} dependencies versions to next-snapshot failed." >> "$GITHUB_STEP_SUMMARY"
        exit 1
    fi
    echo "::endgroup::"
    echo "::group::Clean and commit pom.xml with next-snapshot version."
    echo "Committing pom.xml with release version."
    mvn --batch-mode clean
    gitdiffstat=$(git diff --stat)
    if [ -z "${gitdiffstat}" ]
    then
        echo "No changes"
        echo "ℹ️ Commit: There were no changed dependencies versions in ${MODULE} pom.xml." >> "$GITHUB_STEP_SUMMARY"
        return
    else
        git add .
        git commit -m "Bump dependencies versions to next-snapshot [skip ci]"
        git push
        # shellcheck disable=2181
        if [ $? -ne 0 ]; then
            echo "Commit failed. Exiting."
            echo "❌ Commit: ${MODULE} pom.xml with next-snapshot version failed." >> "$GITHUB_STEP_SUMMARY"
            exit 1
        fi
        echo "✅ Commit: ${MODULE} pom.xml with next-snapshot version committed successfully." >> "$GITHUB_STEP_SUMMARY"
    fi
    echo "::endgroup::"
}
