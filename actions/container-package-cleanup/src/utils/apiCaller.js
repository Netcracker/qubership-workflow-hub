class ApiCaller {
    constructor(apiClient) {
        this.name = 'ApiCaller';
        if (!apiClient) {
            throw new Error('ApiClient is required');
        }
        this.apiClient = apiClient;
    }

    execute(method, ...args) {
        if (typeof this.apiClient[method] !== 'function') {
            throw new Error(`Method ${method} does not exist on ApiClient`);
        }
    }

    toString() {
        return this.name;
    }
}