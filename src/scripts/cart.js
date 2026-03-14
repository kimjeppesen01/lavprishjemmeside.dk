/**
 * Cart module — localStorage-backed cart for the shop.
 *
 * Cart shape:
 * {
 *   items: [{ product_id, variant_id, quantity, name, variant_name, price_ore, image_url }],
 *   updated_at: ISO string
 * }
 */

const CART_KEY = 'lph_cart';

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [], updated_at: new Date().toISOString() };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.items)) return { items: [], updated_at: new Date().toISOString() };
    return parsed;
  } catch {
    return { items: [], updated_at: new Date().toISOString() };
  }
}

function writeCart(cart) {
  cart.updated_at = new Date().toISOString();
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
}

/** Return all cart items. */
export function getCart() {
  return readCart();
}

/** Total number of items (sum of quantities). */
export function getCartCount() {
  return readCart().items.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

/** Total price in øre. */
export function getCartTotal() {
  return readCart().items.reduce((sum, item) => sum + (item.price_ore * item.quantity), 0);
}

/**
 * Add or increment an item.
 * @param {{ product_id, variant_id?, quantity?, name, variant_name?, price_ore, image_url? }} item
 */
export function addToCart(item) {
  const cart = readCart();
  const key = itemKey(item.product_id, item.variant_id);
  const existing = cart.items.find(i => itemKey(i.product_id, i.variant_id) === key);

  if (existing) {
    existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    // Update mutable fields in case price changed
    existing.price_ore = item.price_ore;
    existing.name = item.name;
    existing.variant_name = item.variant_name || null;
    existing.image_url = item.image_url || existing.image_url;
  } else {
    cart.items.push({
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity || 1,
      name: item.name,
      variant_name: item.variant_name || null,
      price_ore: item.price_ore,
      image_url: item.image_url || null,
    });
  }

  writeCart(cart);
}

/**
 * Set exact quantity for an item. Remove if quantity <= 0.
 */
export function setQuantity(productId, variantId, quantity) {
  const cart = readCart();
  const key = itemKey(productId, variantId);
  const idx = cart.items.findIndex(i => itemKey(i.product_id, i.variant_id) === key);

  if (idx === -1) return;

  if (quantity <= 0) {
    cart.items.splice(idx, 1);
  } else {
    cart.items[idx].quantity = quantity;
  }

  writeCart(cart);
}

/** Remove an item completely. */
export function removeFromCart(productId, variantId) {
  const cart = readCart();
  const key = itemKey(productId, variantId);
  cart.items = cart.items.filter(i => itemKey(i.product_id, i.variant_id) !== key);
  writeCart(cart);
}

/** Empty the cart. */
export function clearCart() {
  writeCart({ items: [], updated_at: new Date().toISOString() });
}

/**
 * Validate cart against API (stock + price check).
 * Updates local prices on success.
 * @param {string} apiUrl — base API URL
 * @returns {Promise<{ ok: boolean, items: Array }>}
 */
export async function validateCart(apiUrl) {
  const cart = readCart();
  if (cart.items.length === 0) return { ok: true, items: [] };

  try {
    const res = await fetch(`${apiUrl}/shop/cart/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.items }),
    });
    const data = await res.json();
    if (!data.items) return { ok: false, items: [] };

    // Update local prices from server response
    const updatedCart = readCart();
    let allOk = true;
    for (const serverItem of data.items) {
      if (!serverItem.ok) { allOk = false; continue; }
      const local = updatedCart.items.find(i => i.product_id === serverItem.product_id && (i.variant_id || null) === (serverItem.variant_id || null));
      if (local) local.price_ore = serverItem.price_ore;
    }
    writeCart(updatedCart);

    return { ok: allOk, items: data.items };
  } catch {
    return { ok: false, items: [] };
  }
}

function itemKey(productId, variantId) {
  return `${productId}:${variantId || 'null'}`;
}
