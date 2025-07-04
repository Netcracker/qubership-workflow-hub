const MavenStrategy = require('./maven');
const ContainerStrategy = require('./container');

const strategyRegistry = {
    maven: MavenStrategy,
    container: ContainerStrategy,
};

function getStrategy(packageType) {
    const StrategyClass = strategyRegistry[packageType];

    if (!StrategyClass) {
        throw new Error(`Unsupported package type: ${packageType}`);
    }

    const instance = new StrategyClass();

    if (typeof instance.execute !== 'function') {
        throw new Error(`Strategy ${packageType} must implement 'execute()'`);
    }

    return instance;
}

module.exports = { getStrategy };