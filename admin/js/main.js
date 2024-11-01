const CONFIG = Object.freeze({
    keyboard: {
        layouts: {
            en: "qwertyuiop[]asdfghjkl;'zxcvbnm,./",
            ru: "йцукенгшщзхъфывапролджэячсмитьбю.",
            ua: "йцукенгшщзхїфівапролджєячсмитьбю.",
            be: "йцукенгшўзх'фывапролджэячсмітьбю.",

            // European layouts
            de: "qwertzuiopüäasdfghjklöäyxcvbnm,./", // German
            fr: "azertyuiopèéasdfghjklùmwxcvbn,./",  // French
            es: "qwertyuiopñ´asdfghjklñ;zxcvbnm,./", // Spanish
            it: "qwertyuiopèéasdfghjklòàzxcvbnm,./", // Italian
            pt: "qwertyuiopºªasdfghjklçãzxcvbnm,./", // Portuguese
            pl: "qwertyuiopąśasdfghjklłżźcvbnm,./",  // Polish
            cz: "qwertyuiopúasdfghjklů§zxcvbnm,./",  // Czech
            sk: "qwertyuiopúäasdfghjklľňzxcvbnm,./", // Slovak
            hu: "qwertyuiopőúasdfghjkléázxcvbnm,./", // Hungarian
            ro: "qwertyuiopăîasdfghjklșțzxcvbnm,./", // Romanian

            // Scandinavian layouts
            se: "qwertyuiopåäasdfghjklöäzxcvbnm,./", // Swedish
            no: "qwertyuiopåøasdfghjkløæzxcvbnm,./", // Norwegian
            dk: "qwertyuiopåæasdfghjkløæzxcvbnm,./", // Danish
            fi: "qwertyuiopäöasdfghjklööäxcvbnm,./", // Finnish

            // Baltic layouts
            lt: "ąwertyuiopįšasdfghjklųėzxcvbnm,./", // Lithuanian
            lv: "qwertyuiopasdfghjklēūzxcvbnm,./",   // Latvian
            ee: "qwertyuiopüõasdfghjklöäzxcvbnm,./", // Estonian

            // Balkan layouts
            hr: "qwertyuiopšđasdfghjklčćzxcvbnm,./", // Croatian
            si: "qwertyuiopšđasdfghjklčćzxcvbnm,./", // Slovenian

            // Turkic layouts
            tr: "qwertyuıopğüasdfghjklşizxcvbnm,./", // Turkish
            az: "qüertyuiopöğasdfghjklıəzxcvbnm,./", // Azerbaijani
            kk: "йцукенгшщзхъфывапролджэячсмитьбю,", // Kazakh

            // Greek (basic compliance only)
            gr: "qwertyuiopασδφγηjκλ;'ζχψβνμ,./"     // Greek
        }
    },
    ui: {
        debounceDelay: 150,
        highlightColor: '#808080',
        searchInputSelector: 'input.amsrc',
        menuSelectors: {
            menuNames: '.wp-menu-name',
            separators: 'li.wp-menu-separator',
            submenuItems: 'ul.wp-submenu li',
            submenuHead: '.wp-submenu-head',
            menuTop: 'li.menu-top'
        }
    }
});


const Utils = {
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    memoize(fn, customKeyFn) {
        const cache = new Map();
        return (...args) => {
            const key = customKeyFn ? customKeyFn(...args) : JSON.stringify(args);
            if (!cache.has(key)) {
                cache.set(key, fn(...args));
                if (cache.size > 1000) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
            }
            return cache.get(key);
        };
    }
};

class KeyboardLayoutManager {
    constructor(layouts) {
        this.layouts = layouts;
        this.charMapping = this.createCharMapping();
        this.initializeMemoizedFunctions();
    }

    createCharMapping() {
        return Object.entries(this.layouts).reduce((mapping, [sourceLang, sourceLayout]) => {
            [...sourceLayout].forEach((char, index) => {
                mapping[char] = mapping[char] || {};
                Object.keys(this.layouts).forEach(targetLang => {
                    mapping[char][targetLang] = this.layouts[targetLang][index];
                });
            });
            return mapping;
        }, {});
    }

    initializeMemoizedFunctions() {
        this.changeLayout = Utils.memoize((word, targetLang) => (
            [...word].map(letter => {
                const lowLetter = letter.toLowerCase();
                const mappedLetter = this.charMapping[lowLetter]?.[targetLang] ?? letter;
                return letter === lowLetter ? mappedLetter : mappedLetter.toUpperCase();
            }).join('')
        ));

        this.matchesSearch = Utils.memoize((text, search) =>
            Object.keys(this.layouts).some(layout =>
                this.changeLayout(text, layout).toLowerCase().includes(search)
            )
        );
    }
}

class MenuSearchManager {
    constructor(config) {
        this.config = config;
        this.layoutManager = new KeyboardLayoutManager(config.keyboard.layouts);
        this.initializeDOM();
        this.bindEvents();
    }

    initializeDOM() {
        const s = this.config.ui.menuSelectors;

        this.elements = new WeakMap();
        this.$adminSearch = jQuery(this.config.ui.searchInputSelector);
        this.$menuSeparators = jQuery(s.separators);

        this.menuData = jQuery(s.menuNames).map((_, item) => {
            const $item = jQuery(item);
            const $topLi = $item.closest(s.menuTop);
            const $subItems = $topLi.find(s.submenuItems).not(s.submenuHead);

            const menuItem = {
                $topLi,
                topText: $item.clone().children().remove().end().text().toLowerCase(),
                subItems: $subItems.map((_, subItem) => ({
                    $element: jQuery(subItem),
                    text: jQuery(subItem).text().toLowerCase()
                })).get()
            };

            this.elements.set(menuItem, {$topLi, $subItems: $subItems});

            return menuItem;
        }).get();
    }

    bindEvents() {
        const debouncedFilter = Utils.debounce((searchText) => this.filterMenu(searchText), this.config.ui.debounceDelay);

        this.$adminSearch.focus().on('input', (e) => debouncedFilter(e.target.value.toLowerCase()));

        jQuery(document).on('keydown', this.handleKeydown.bind(this));
    }

    handleKeydown(event) {
        const $target = jQuery(event.target);
        const isInteractive = $target.is('input, textarea, select, [contenteditable]');

        if (!isInteractive && (event.key === '/' || event.key === '.' || event.code === 'Slash' || event.code === 'Period')) {
            event.preventDefault();
            this.$adminSearch.focus();
        }

        if (event.key === 'Escape' && $target.is(this.$adminSearch)) {
            this.$adminSearch.val('').trigger('input');
        }
    }

    filterMenu(searchText) {
        if (!searchText) {
            this.resetMenu();
            return;
        }

        this.$menuSeparators.hide();

        requestAnimationFrame(() => {
            this.menuData.forEach(item => {
                const showTop = this.layoutManager.matchesSearch(item.topText, searchText) || item.subItems.some(subItem => this.layoutManager.matchesSearch(subItem.text, searchText));

                item.$topLi[showTop ? 'show' : 'hide']();

                item.subItems.forEach(subItem => {
                    subItem.$element.css('background-color', this.layoutManager.matchesSearch(subItem.text, searchText) ? '' : this.config.ui.highlightColor);
                });
            });
        });
    }

    resetMenu() {
        this.$menuSeparators.show();

        this.menuData.forEach(item => {
            item.$topLi.show();
            item.subItems.forEach(subItem => {
                subItem.$element.css('background-color', '');
            });
        });
    }
}

jQuery(function (jQuery) {
    new MenuSearchManager(CONFIG);
});
