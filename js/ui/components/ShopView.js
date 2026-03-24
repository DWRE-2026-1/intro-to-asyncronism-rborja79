/* js/ui/components/ShopView.js */
import { t } from '../../i18n/index.js';

export class ShopView {
    #money;
    #inventory;
    #items;
    #onBuy;
    #feedback;

    constructor({ money, inventory, items, onBuy, feedback = '' }) {
        this.#money = money;
        this.#inventory = inventory;
        this.#items = items;
        this.#onBuy = onBuy;
        this.#feedback = feedback;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'shop-view';
        container.innerHTML = `
            <div class="shop-view__header">
                <h1 class="shop-view__title">${t('shop.title')}</h1>
                <p class="shop-view__money">${t('shop.money', { money: this.#money })}</p>
            </div>
            <p class="shop-view__feedback">${this.#feedback}</p>
            <div class="shop-view__grid" id="shop-grid">
                ${this.#items.map((item) => this.#renderItem(item)).join('')}
            </div>
        `;

        container.querySelectorAll('[data-buy-berry]').forEach((button) => {
            button.addEventListener('click', () => {
                const berryKey = button.dataset.buyBerry;
                if (this.#onBuy) {
                    this.#onBuy(berryKey);
                }
            });
        });

        return container;
    }

    #renderItem(item) {
        const owned = this.#inventory.berries[item.key] || 0;
        const canBuy = this.#money >= item.price;
        const translatedName = t(`berry.${item.key}.name`) !== `berry.${item.key}.name`
            ? t(`berry.${item.key}.name`)
            : item.name;
        const translatedDescription = t(`berry.${item.key}.desc`) !== `berry.${item.key}.desc`
            ? t(`berry.${item.key}.desc`)
            : item.description;

        return `
            <article class="shop-item">
                <h2 class="shop-item__title">${translatedName}</h2>
                <p class="shop-item__description">${translatedDescription}</p>
                <p class="shop-item__price">$${item.price}</p>
                <p class="shop-item__owned">${t('shop.owned', { count: owned })}</p>
                <button class="btn btn--primary" data-buy-berry="${item.key}" ${canBuy ? '' : 'disabled'}>
                    ${t('shop.buy')}
                </button>
            </article>
        `;
    }
}
