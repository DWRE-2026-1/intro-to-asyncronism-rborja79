/* js/api/client.js */
export class ApiClient {
    #baseUrl;

    constructor(baseUrl = '') {
        this.#baseUrl = baseUrl;
    }

    async get(endpoint) {
        const response = await fetch(`${this.#baseUrl}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
    }

    async post(endpoint, data) {
        const response = await fetch(`${this.#baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
    }
}
