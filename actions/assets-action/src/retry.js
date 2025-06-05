const core = require('@actions/core');

   async function retryAsync(fn, options = {}) {
    let { retries = 3, delay = 1000, factor = 1 } = options;

    let constDelay = delay;
    while (retries > 0) {
        try {
            return await fn();
        } catch (error) {
            retries--;
            if (retries === 0) {
                throw error;
            }
            console.info(`⚠️ Retrying due to error: ${error.message}. Retries left: ${retries}. Delay: ${constDelay}ms`);
            constDelay *= factor; // Increase delay for next retry
            await new Promise(resolve => setTimeout(resolve, constDelay));
        }
    }
    throw new Error("❗️ Unknow error. All retries failed.");
}

exports.retryAsync = retryAsync;