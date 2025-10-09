/**
 * Abstract class for package strategies.
 * This class should be extended by specific package strategies like MavenStrategy or ContainerStrategy.
 * It defines the contract for executing the strategy and provides a default string representation.
 */

class AbstractPackageStrategy {
    constructor() {
        if (new.target === AbstractPackageStrategy) {
            throw new TypeError("Cannot instantiate AbstractPackageStrategy directly");
        }

        this.name = this.constructor.name;
    }

    /**
     * Execute the strategy to filter packages and versions based on the provided context.
     * @param {Object} context - Execution context containing necessary data for filtering.
     * @returns {Array<{ package: object, versions: object[] }>}
     */
    // biome-ignore lint/correctness/noUnusedFunctionParameters: abstract method
    execute(context) {
        throw new Error(`${this.name}: method 'execute(context)' must be implemented.`);
    }

    /**
     * Returns a string representation of the strategy.
     */
    toString() {
        return this.name;
    }
}

module.exports = AbstractPackageStrategy;
