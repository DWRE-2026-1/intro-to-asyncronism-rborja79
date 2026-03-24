/* js/state/AppState.js */
import { store } from './store.js';

export class AppState {
    getState() {
        return store.getState();
    }

    setState(updates) {
        store.setState(updates);
    }

    getCurrentPage() {
        return store.get('currentPage');
    }

    setCurrentPage(page) {
        store.set('currentPage', page);
    }

    save() {
        return store.save();
    }

    load() {
        return store.load();
    }

    hasSave() {
        return store.hasSave();
    }

    newGame() {
        store.newGame();
    }

    subscribe(callback) {
        return store.subscribe(callback);
    }
}
