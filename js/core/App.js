/* js/core/App.js */
export class App {
    #navigation;
    #pageRenderer;

    constructor(navigation, pageRenderer) {
        this.#navigation = navigation;
        this.#pageRenderer = pageRenderer;
    }

    init() {
        this.#navigation.init();
        this.#pageRenderer.init();
        this.#pageRenderer.renderPage('home');
    }
}
