/* =====================================================
   1) MOBILE MENU
   ===================================================== */
const body = document.querySelector('body');
const header = document.querySelector('.header');
const navMenu = document.querySelector('.menu-content');
const navOpenBtn = document.querySelector('.navOpen');
const navCloseBtn = document.querySelector('.navClose-btn');

function openMenu() {
    navMenu.classList.add('open');
    body.classList.add('menu-open');
}

function closeMenu() {
    navMenu.classList.remove('open');
    body.classList.remove('menu-open');
}

navOpenBtn.addEventListener('click', openMenu);
navCloseBtn.addEventListener('click', closeMenu);

// close the mobile menu after clicking any link inside it
const menuLinks = navMenu.querySelectorAll('.nav-link');
menuLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
});


/* =====================================================
   2) HEADER: transparent at the top, solid after scrolling
   ===================================================== */
function updateHeader() {
    if (window.scrollY > 40) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

window.addEventListener('scroll', updateHeader);
updateHeader();


/* =====================================================
   3) NAV HIGHLIGHT: mark the link of the section in view
   ===================================================== */
const navLinks = document.querySelectorAll('.menu-list .nav-link');

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            navLinks.forEach(function (link) {
                if (link.getAttribute('href') === '#' + entry.target.id) {
                    link.classList.add('action-navlink');
                } else {
                    link.classList.remove('action-navlink');
                }
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    // watch the section each nav link points to
    navLinks.forEach(function (link) {
        const section = document.querySelector(link.getAttribute('href'));
        if (section) observer.observe(section);
    });
}


/* =====================================================
   4) WISHLIST (heart button)
   This function is called from the HTML: onclick="toggleWishlist(this)"
   ===================================================== */
function toggleWishlist(button) {
    const heart = button.querySelector('i');

    button.classList.toggle('active');

    if (button.classList.contains('active')) {
        heart.classList.remove('fa-regular');
        heart.classList.add('fa-solid');
    } else {
        heart.classList.remove('fa-solid');
        heart.classList.add('fa-regular');
    }
}


/* =====================================================
   5) SHARED HELPERS
   ===================================================== */
// price formatter: 200 -> "$200"
const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

// makes text safe to put inside innerHTML
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// keeps the Tab key inside an open popup
function trapFocus(modal) {
    modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;

        const all = modal.querySelectorAll('button, input, textarea, a[href]');
        const focusable = [];
        all.forEach(function (el) {
            if (!el.disabled && el.getClientRects().length) {
                focusable.push(el);
            }
        });
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });
}


/* =====================================================
   6) PRODUCTS: the data is read from the cards in the HTML
   Every card needs its own data-id (example: data-id="watch-10").
   The cart saves only id + quantity, so name/price/image always
   come from the HTML.
   ===================================================== */
function productFromCard(card) {
    const img = card.querySelector('img');
    const nameEl = card.querySelector('.card-title');
    const priceEl = card.querySelector('h6');

    let src = '';
    if (img) src = img.getAttribute('src');

    let priceText = '';
    if (priceEl) priceText = priceEl.textContent;
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

    if (!card.dataset.id) console.warn('Product card is missing data-id:', card);
    if (!Number.isFinite(price)) return null;

    let name = 'Watch';
    if (nameEl) name = nameEl.textContent.trim();

    return {
        id: card.dataset.id || src, // the image path is only a backup id
        name: name,
        price: price,
        img: src
    };
}

// catalog[id] -> product      idByImg[imagePath] -> id
const catalog = {};
const idByImg = {};

document.querySelectorAll('.card').forEach(function (card) {
    const product = productFromCard(card);
    if (!product) return;

    if (catalog[product.id]) console.warn('Duplicate product data-id:', product.id);
    catalog[product.id] = product;
    if (product.img) idByImg[product.img] = product.id;
});

// all the product cards (used by the details popup and the search)
const productCards = document.querySelectorAll('.card[data-id]');


/* =====================================================
   7) CART: data
   ===================================================== */
const CART_KEY = 'cartItems';

function loadCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY));
        if (!Array.isArray(saved)) return [];

        const result = [];

        for (let i = 0; i < saved.length; i++) {
            const raw = saved[i];

            // skip broken items
            if (!raw || typeof raw.id !== 'string') continue;
            if (!Number.isInteger(raw.qty) || raw.qty < 1) continue;

            // old carts used the image path as the id, so convert it to the real id
            let id = raw.id;
            if (!catalog[id] && idByImg[id]) id = idByImg[id];

            // use fresh data from the page if the product exists, otherwise the saved copy
            const base = catalog[id] || raw;
            if (!Number.isFinite(base.price)) continue;

            // same product twice? merge the quantities
            const existing = result.find(function (item) {
                return item.id === id;
            });

            if (existing) {
                existing.qty = Math.min(existing.qty + raw.qty, 99);
            } else {
                result.push({
                    id: id,
                    name: base.name,
                    price: base.price,
                    img: base.img,
                    qty: Math.min(raw.qty, 99)
                });
            }
        }

        return result;
    } catch (e) {
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
        // storage is blocked: the cart still works until the page is closed
    }
}

function cartTotal() {
    let total = 0;
    cart.forEach(function (item) {
        total = total + item.price * item.qty;
    });
    return total;
}

let cart = loadCart();
saveCart(); // saves the cleaned cart back

// very old version saved only a counter, remove it
try {
    localStorage.removeItem('cartCount');
} catch (e) {}


/* =====================================================
   8) CART: page elements
   ===================================================== */
const cartLink = document.querySelector('.cart-link');
const cartCountEl = document.querySelector('.cart-count');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const cartCheckoutBtn = document.querySelector('.cart-checkout');
const cartCloseBtn = document.querySelector('.cart-close');


/* =====================================================
   9) CART: drawing it on the page
   ===================================================== */
function renderCart(bump) {
    // total number of watches
    let totalQty = 0;
    cart.forEach(function (item) {
        totalQty = totalQty + item.qty;
    });

    // the number badge on the cart icon
    if (totalQty > 99) {
        cartCountEl.textContent = '99+';
    } else {
        cartCountEl.textContent = totalQty;
    }

    if (totalQty > 0) {
        cartCountEl.classList.add('show');
    } else {
        cartCountEl.classList.remove('show');
    }

    // small "pop" animation when something is added
    if (bump) {
        cartCountEl.classList.remove('bump');
        void cartCountEl.offsetWidth; // forces the animation to restart
        cartCountEl.classList.add('bump');
    }

    // the drawer content
    if (cart.length === 0) {
        cartItemsEl.innerHTML = `
            <div class="cart-empty">
                <p>Your cart is empty</p>
                <small>Watches you add will appear here.</small>
                <a href="#collection" class="btn btn-gold cart-empty-link">Explore the collection</a>
            </div>`;
    } else {
        let html = '';

        cart.forEach(function (item) {
            let minusDisabled = '';
            if (item.qty <= 1) minusDisabled = 'disabled';

            html += `
            <div class="cart-item">
                <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}">
                <div class="cart-item-info">
                    <h3>${escapeHtml(item.name)}</h3>
                    <span class="cart-item-price">${money.format(item.price)}</span>
                    <div class="qty">
                        <button type="button" data-action="dec" data-id="${escapeHtml(item.id)}"
                                aria-label="Decrease quantity" ${minusDisabled}>&minus;</button>
                        <span aria-live="polite">${item.qty}</span>
                        <button type="button" data-action="inc" data-id="${escapeHtml(item.id)}"
                                aria-label="Increase quantity">+</button>
                    </div>
                </div>
                <button type="button" class="cart-item-remove" data-action="remove"
                        data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">
                    <i class='bx bx-trash'></i>
                </button>
            </div>`;
        });

        cartItemsEl.innerHTML = html;
    }

    // total price + checkout button
    cartTotalEl.textContent = money.format(cartTotal());
    cartCheckoutBtn.disabled = cart.length === 0;
}

function addToCart(product) {
    const existing = cart.find(function (item) {
        return item.id === product.id;
    });

    if (existing) {
        existing.qty = Math.min(existing.qty + 1, 99);
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            img: product.img,
            qty: 1
        });
    }

    saveCart();
    renderCart(true);
}

renderCart(false);


/* =====================================================
   10) CART: open and close the drawer
   ===================================================== */
let cartLastFocus = null; // the element to give focus back to when the cart closes

function openCart() {
    cartLastFocus = document.activeElement;

    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    body.classList.add('cart-open');

    cartCloseBtn.focus();
}

function closeCart() {
    if (!cartDrawer.classList.contains('open')) return;

    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    body.classList.remove('cart-open');

    if (cartLastFocus) cartLastFocus.focus({ preventScroll: true });
}

cartLink.addEventListener('click', function (e) {
    e.preventDefault();
    openCart();
});

cartCloseBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);


/* =====================================================
   11) CART: buttons inside the drawer (+ / - / remove / empty link)
   One listener on the container handles all of them.
   ===================================================== */
cartItemsEl.addEventListener('click', function (e) {
    // "Explore the collection" link in the empty cart
    if (e.target.closest('.cart-empty-link')) {
        closeCart();
        return;
    }

    const button = e.target.closest('[data-action]');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const item = cart.find(function (i) {
        return i.id === id;
    });
    if (!item) return;

    if (action === 'inc') {
        item.qty = Math.min(item.qty + 1, 99);
    }
    if (action === 'dec') {
        item.qty = Math.max(item.qty - 1, 1);
    }
    if (action === 'remove') {
        cart = cart.filter(function (i) {
            return i !== item;
        });
    }

    saveCart();
    renderCart(false);

    // the list was redrawn, so put the focus back on the same kind of button
    if (action !== 'remove') {
        const sameButtons = cartItemsEl.querySelectorAll('[data-action="' + action + '"]');
        for (let i = 0; i < sameButtons.length; i++) {
            if (sameButtons[i].dataset.id === id && !sameButtons[i].disabled) {
                sameButtons[i].focus();
                break;
            }
        }
    }
});


/* =====================================================
   12) "ADD TO CART" buttons on the cards
   ===================================================== */
document.querySelectorAll('.add-to-cart').forEach(function (button) {
    const originalText = button.textContent;
    let resetTimer;

    button.addEventListener('click', function (e) {
        e.preventDefault();

        const card = button.closest('.card');
        const product = productFromCard(card);
        if (!product) return;

        addToCart(product);

        // show "Added" on the button for a moment
        button.textContent = 'Added';
        button.classList.add('is-added');

        clearTimeout(resetTimer);
        resetTimer = setTimeout(function () {
            button.textContent = originalText;
            button.classList.remove('is-added');
        }, 1200);
    });
});


/* =====================================================
   13) CHECKOUT
   ===================================================== */
const checkoutModal = document.getElementById('checkoutModal');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutFormView = document.getElementById('checkoutFormView');
const checkoutDone = document.getElementById('checkoutDone');
const checkoutSummary = document.getElementById('checkoutSummary');
const checkoutTotal = document.getElementById('checkoutTotal');
const checkoutCloseBtn = document.querySelector('.checkout-close');
const checkoutContinueBtn = document.querySelector('.checkout-continue');

// the "Order summary" list next to the form
function renderCheckoutSummary() {
    let html = '';

    cart.forEach(function (item) {
        html += `
        <div class="summary-line">
            <img src="${escapeHtml(item.img)}" alt="">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <small>Qty ${item.qty}</small>
            </div>
            <span>${money.format(item.price * item.qty)}</span>
        </div>`;
    });

    checkoutSummary.innerHTML = html;
    checkoutTotal.textContent = money.format(cartTotal());
}

function openCheckout() {
    if (cart.length === 0) return;

    renderCheckoutSummary();

    // show the form, hide the "thank you" screen
    checkoutFormView.hidden = false;
    checkoutDone.hidden = true;

    checkoutModal.classList.add('open');
    checkoutModal.setAttribute('aria-hidden', 'false');
    body.classList.add('checkout-open');

    const firstInput = checkoutForm.querySelector('input');
    if (firstInput) firstInput.focus();
}

function closeCheckout() {
    if (!checkoutModal.classList.contains('open')) return;

    checkoutModal.classList.remove('open');
    checkoutModal.setAttribute('aria-hidden', 'true');
    body.classList.remove('checkout-open');

    cartLink.focus({ preventScroll: true });
}

// "Checkout" button inside the cart drawer
cartCheckoutBtn.addEventListener('click', function () {
    if (cart.length === 0) return;
    closeCart();
    openCheckout();
});

// "Place order" (demo store: nothing is sent anywhere)
checkoutForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (cart.length === 0) return;

    const name = String(new FormData(checkoutForm).get('name') || '').trim();
    const total = cartTotal();
    const orderNumber = 'RLX-' + Date.now().toString(36).toUpperCase().slice(-6);

    // confirm the order and empty the cart
    cart = [];
    saveCart();
    renderCart(false);
    checkoutForm.reset();

    // fill in the "thank you" screen
    if (name) {
        document.getElementById('doneTitle').textContent = 'Thank you, ' + name.split(' ')[0];
    } else {
        document.getElementById('doneTitle').textContent = 'Thank you';
    }
    document.getElementById('doneOrder').textContent =
        'Order ' + orderNumber + ' \u00b7 ' + money.format(total);

    checkoutFormView.hidden = true;
    checkoutDone.hidden = false;
    checkoutContinueBtn.focus();
});

checkoutCloseBtn.addEventListener('click', closeCheckout);
checkoutContinueBtn.addEventListener('click', closeCheckout);

// clicking the dark background closes it
checkoutModal.addEventListener('click', function (e) {
    if (e.target === checkoutModal) closeCheckout();
});

trapFocus(checkoutModal);


/* =====================================================
   14) PRODUCT DETAILS POPUP
   ===================================================== */
const detailsModal = document.getElementById('detailsModal');
const detailsImg = document.getElementById('detailsImg');
const detailsRef = document.getElementById('detailsRef');
const detailsName = document.getElementById('detailsName');
const detailsPrice = document.getElementById('detailsPrice');
const detailsDesc = document.getElementById('detailsDesc');
const detailsSpecs = document.getElementById('detailsSpecs');
const detailsCount = document.getElementById('detailsCount');
const detailsAddBtn = document.querySelector('.details-add');
const detailsWishBtn = document.querySelector('.details-wish');
const detailsCloseBtn = document.querySelector('.details-close');
const detailsPrevBtn = document.querySelector('.details-prev');
const detailsNextBtn = document.querySelector('.details-next');

// [label shown, name of the data-* attribute on the card]
const SPEC_FIELDS = [
    ['Dial', 'dial'],
    ['Bezel', 'bezel'],
    ['Case', 'case'],
    ['Movement', 'movement'],
    ['Power', 'power'],
    ['Crystal', 'crystal'],
    ['Water resistance', 'water'],
    ['Strap', 'strap']
];

let detailsIndex = 0;          // which watch is shown now
let detailsReturnFocus = null; // where the focus goes back when it closes
let detailsAddTimer;

// make the heart in the popup match the heart on the card
function syncDetailsWish() {
    const cardHeartBtn = productCards[detailsIndex].querySelector('.wishlist');
    const isActive = !!cardHeartBtn && cardHeartBtn.classList.contains('active');
    const icon = detailsWishBtn.querySelector('i');

    if (isActive) {
        detailsWishBtn.classList.add('active');
        icon.classList.add('fa-solid');
        icon.classList.remove('fa-regular');
    } else {
        detailsWishBtn.classList.remove('active');
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
    }

    detailsWishBtn.setAttribute('aria-pressed', isActive);
}

// fill the popup with the current watch
function renderDetails() {
    const card = productCards[detailsIndex];
    const product = productFromCard(card);
    if (!product) return;

    detailsImg.src = product.img;
    detailsImg.alt = product.name;
    detailsName.textContent = product.name;
    detailsPrice.textContent = money.format(product.price);

    if (card.dataset.ref) {
        detailsRef.textContent = 'Ref. ' + card.dataset.ref;
    } else {
        detailsRef.textContent = '';
    }

    // long description if the card has one, otherwise the short text
    const shortTextEl = card.querySelector('.card-text');
    if (card.dataset.long) {
        detailsDesc.textContent = card.dataset.long;
    } else if (shortTextEl) {
        detailsDesc.textContent = shortTextEl.textContent.trim();
    } else {
        detailsDesc.textContent = '';
    }

    // the spec list: only the specs that exist on the card
    let specsHtml = '';
    SPEC_FIELDS.forEach(function (field) {
        const label = field[0];
        const key = field[1];
        const value = card.dataset[key];

        if (value) {
            specsHtml += '<div><dt>' + label + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
        }
    });
    detailsSpecs.innerHTML = specsHtml;

    // "1 / 9"
    detailsCount.textContent = (detailsIndex + 1) + ' / ' + productCards.length;

    // remove the "Added" message when the watch changes
    clearTimeout(detailsAddTimer);
    detailsAddBtn.textContent = 'Add to Cart';
    detailsAddBtn.classList.remove('is-added');

    syncDetailsWish();
}

function openDetails(card, trigger) {
    // find the position of this card in the list
    let index = -1;
    for (let i = 0; i < productCards.length; i++) {
        if (productCards[i] === card) {
            index = i;
            break;
        }
    }
    if (index === -1) return;

    detailsIndex = index;
    detailsReturnFocus = trigger || null;
    renderDetails();

    detailsModal.classList.add('open');
    detailsModal.setAttribute('aria-hidden', 'false');
    body.classList.add('details-open');

    detailsCloseBtn.focus();
}

function closeDetails() {
    if (!detailsModal.classList.contains('open')) return;

    detailsModal.classList.remove('open');
    detailsModal.setAttribute('aria-hidden', 'true');
    body.classList.remove('details-open');

    if (detailsReturnFocus) detailsReturnFocus.focus({ preventScroll: true });
}

// direction: -1 = previous watch, 1 = next watch (loops around)
function stepDetails(direction) {
    const total = productCards.length;
    detailsIndex = (detailsIndex + direction + total) % total;
    renderDetails();
}

// the "View Details" buttons
document.querySelectorAll('.view-details').forEach(function (link) {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        openDetails(link.closest('.card'), link);
    });
});

// clicking the photo on a card also opens the details
document.querySelectorAll('.card-img-top').forEach(function (img) {
    img.addEventListener('click', function () {
        openDetails(img.closest('.card'), null);
    });
});

detailsCloseBtn.addEventListener('click', closeDetails);
detailsPrevBtn.addEventListener('click', function () {
    stepDetails(-1);
});
detailsNextBtn.addEventListener('click', function () {
    stepDetails(1);
});

// clicking the dark background closes it
detailsModal.addEventListener('click', function (e) {
    if (e.target === detailsModal) closeDetails();
});

// left / right arrow keys switch the watch
document.addEventListener('keydown', function (e) {
    if (!detailsModal.classList.contains('open')) return;

    if (e.key === 'ArrowLeft') stepDetails(-1);
    if (e.key === 'ArrowRight') stepDetails(1);
});

// "Add to Cart" inside the popup
detailsAddBtn.addEventListener('click', function () {
    const product = productFromCard(productCards[detailsIndex]);
    if (!product) return;

    addToCart(product);

    detailsAddBtn.textContent = 'Added';
    detailsAddBtn.classList.add('is-added');

    clearTimeout(detailsAddTimer);
    detailsAddTimer = setTimeout(function () {
        detailsAddBtn.textContent = 'Add to Cart';
        detailsAddBtn.classList.remove('is-added');
    }, 1200);
});

// the heart in the popup toggles the same wishlist heart as the card
detailsWishBtn.addEventListener('click', function () {
    const cardHeartBtn = productCards[detailsIndex].querySelector('.wishlist');
    if (cardHeartBtn) toggleWishlist(cardHeartBtn);
    syncDetailsWish();
});

trapFocus(detailsModal);


/* =====================================================
   15) SEARCH
   ===================================================== */
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchLink = document.querySelector('.search-link');
const searchCloseBtn = document.querySelector('.search-close');

// build one searchable text for each watch:
// name + reference + short text + long text + all specs + price
const searchIndex = [];

productCards.forEach(function (card) {
    const product = productFromCard(card);
    if (!product) return;

    const shortTextEl = card.querySelector('.card-text');
    let shortText = '';
    if (shortTextEl) shortText = shortTextEl.textContent;

    const parts = [
        product.name,
        card.dataset.ref,
        shortText,
        card.dataset.long,
        card.dataset.dial,
        card.dataset.bezel,
        card.dataset.case,
        card.dataset.movement,
        card.dataset.power,
        card.dataset.crystal,
        card.dataset.water,
        card.dataset.strap,
        money.format(product.price)
    ];

    // remove empty parts, join everything, lowercase for easy matching
    const text = parts.filter(function (part) {
        return part;
    }).join(' ').toLowerCase();

    searchIndex.push({
        card: card,
        product: product,
        text: text,
        short: shortText.trim()
    });
});

// show the results for what the user typed
function renderSearch(query) {
    const words = query.toLowerCase().split(/\s+/).filter(function (w) {
        return w;
    });

    // a watch matches when EVERY typed word appears in its text
    const matches = [];
    searchIndex.forEach(function (entry, index) {
        let allFound = true;
        words.forEach(function (word) {
            if (!entry.text.includes(word)) allFound = false;
        });

        if (allFound) matches.push({ entry: entry, index: index });
    });

    // watches with the typed words in their NAME come first
    if (words.length > 0) {
        const nameHits = function (match) {
            const name = match.entry.product.name.toLowerCase();
            let count = 0;
            words.forEach(function (word) {
                if (name.includes(word)) count++;
            });
            return count;
        };

        matches.sort(function (a, b) {
            return nameHits(b) - nameHits(a);
        });
    }

    // nothing found
    if (matches.length === 0) {
        searchResults.innerHTML = `
            <div class="search-empty">
                No watches match &ldquo;${escapeHtml(query.trim())}&rdquo;
                <small>Try a name, a reference like RX-102, or a feature like sapphire or chronograph.</small>
            </div>`;
        return;
    }

    // the small label above the list
    let label = 'All watches';
    if (words.length > 0) {
        if (matches.length === 1) {
            label = '1 result';
        } else {
            label = matches.length + ' results';
        }
    }

    let html = '<div class="search-label">' + label + '</div>';

    matches.forEach(function (match) {
        html += `
            <button type="button" class="search-result" data-index="${match.index}">
                <img src="${escapeHtml(match.entry.product.img)}" alt="">
                <span class="search-result-info">
                    <strong>${escapeHtml(match.entry.product.name)}</strong>
                    <small>${escapeHtml(match.entry.short)}</small>
                </span>
                <span class="search-result-price">${money.format(match.entry.product.price)}</span>
            </button>`;
    });

    searchResults.innerHTML = html;
}

let searchReturnFocus = null;

function openSearch() {
    searchReturnFocus = document.activeElement;

    searchInput.value = '';
    renderSearch('');

    searchModal.classList.add('open');
    searchModal.setAttribute('aria-hidden', 'false');
    body.classList.add('search-open');

    searchInput.focus();
}

function closeSearch() {
    if (!searchModal.classList.contains('open')) return;

    searchModal.classList.remove('open');
    searchModal.setAttribute('aria-hidden', 'true');
    body.classList.remove('search-open');

    if (searchReturnFocus) searchReturnFocus.focus({ preventScroll: true });
}

// the search icon in the header
searchLink.addEventListener('click', function (e) {
    e.preventDefault();
    openSearch();
});

searchCloseBtn.addEventListener('click', closeSearch);

// clicking the dark background closes it
searchModal.addEventListener('click', function (e) {
    if (e.target === searchModal) closeSearch();
});

// update the results while typing
searchInput.addEventListener('input', function () {
    renderSearch(searchInput.value);
});

// clicking a result: close the search and open that watch's details
searchResults.addEventListener('click', function (e) {
    const button = e.target.closest('.search-result');
    if (!button) return;

    const entry = searchIndex[Number(button.dataset.index)];
    closeSearch();
    openDetails(entry.card, searchLink);
});

// keyboard in the input: Enter = open first result, Down arrow = go to the list
searchInput.addEventListener('keydown', function (e) {
    const firstResult = searchResults.querySelector('.search-result');
    if (!firstResult) return;

    if (e.key === 'Enter') {
        e.preventDefault();
        firstResult.click();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        firstResult.focus();
    }
});

// keyboard in the list: Up / Down arrows move between results
searchResults.addEventListener('keydown', function (e) {
    const current = e.target.closest('.search-result');
    if (!current) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = current.nextElementSibling;
        if (next && next.classList.contains('search-result')) next.focus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const previous = current.previousElementSibling;
        if (previous && previous.classList.contains('search-result')) {
            previous.focus();
        } else {
            searchInput.focus();
        }
    }
});

// pressing "/" opens the search (unless you are typing in a field)
document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;

    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // don't open it on top of another popup
    if (document.querySelector('body.cart-open, body.checkout-open, body.details-open')) return;

    e.preventDefault();
    openSearch();
});

trapFocus(searchModal);


/* =====================================================
   16) ESCAPE KEY: closes whatever is open
   ===================================================== */
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    closeMenu();
    closeCart();
    closeCheckout();
    closeDetails();
    closeSearch();
});