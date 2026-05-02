import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

const CART_KEY = 'vinted_cart';

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch { return []; }
    });

    // Persist on every change
    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    }, [cartItems]);

    const isInCart = (itemId) => cartItems.some(i => i._id === itemId);

    const addToCart = (item) => {
        if (!isInCart(item._id)) {
            setCartItems(prev => [...prev, { ...item, selected: true }]);
        }
    };

    const removeFromCart = (itemId) => {
        setCartItems(prev => prev.filter(i => i._id !== itemId));
    };

    const toggleSelect = (itemId) => {
        setCartItems(prev =>
            prev.map(i => i._id === itemId ? { ...i, selected: !i.selected } : i)
        );
    };

    const selectAll = () => setCartItems(prev => prev.map(i => ({ ...i, selected: true })));
    const deselectAll = () => setCartItems(prev => prev.map(i => ({ ...i, selected: false })));

    const clearCart = () => setCartItems([]);

    const removeSelected = () => setCartItems(prev => prev.filter(i => !i.selected));

    const selectedItems = cartItems.filter(i => i.selected);
    const cartCount = cartItems.length;

    return (
        <CartContext.Provider value={{
            cartItems, addToCart, removeFromCart, toggleSelect,
            selectAll, deselectAll, clearCart, removeSelected,
            selectedItems, cartCount, isInCart
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
export default CartContext;
