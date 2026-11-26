import MavenStrategy from './maven.js';
import ContainerStrategy from './container.js';

const strategyRegistry = {
    maven: MavenStrategy,
    container: ContainerStrategy,
};

const SUPPORTED_PACKAGE_TYPES = Object.keys(strategyRegistry).sort();

// hasOwn: names such as "constructor" must not match members inherited from Object
function isSupportedPackageType(packageType) {
    return Object.hasOwn(strategyRegistry, packageType);
}

function getStrategy(packageType) {
    if (!isSupportedPackageType(packageType)) {
        throw new Error(`Unsupported package type: ${packageType}`);
    }
    const StrategyClass = strategyRegistry[packageType];

    const instance = new StrategyClass();

    if (typeof instance.execute !== 'function') {
        throw new Error(`Strategy ${packageType} must implement 'execute()'`);
    }

    return instance;
}

export { getStrategy, isSupportedPackageType, SUPPORTED_PACKAGE_TYPES };