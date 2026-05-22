'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import AuthContext from '@/context/AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [cartItems, setCartItems] = useState([]);
    
    const cartKey = user ? `vinted_cart_${user._id || user.id}` : 'vinted_cart_guest';
    const prevCartKey = useRef(cartKey);

    useEffect(() => {
        let initialItems = [];
        try {
            const stored = localStorage.getItem(cartKey);
            if (stored) {
                initialItems = JSON.parse(stored);
            } else if (user) {
                const guestStored = localStorage.getItem('vinted_cart_guest');
                if (guestStored) {
                    initialItems = JSON.parse(guestStored);
                    localStorage.removeItem('vinted_cart_guest');
                }
            }
        } catch (e) {
            console.error('Failed to parse cart items:', e);
        }
        setCartItems(initialItems);
    }, [cartKey, user]);

    // Persist on every change
    useEffect(() => {
        if (prevCartKey.current === cartKey) {
            if (cartItems.length > 0 || localStorage.getItem(cartKey)) {
                localStorage.setItem(cartKey, JSON.stringify(cartItems));
            }
        }
        prevCartKey.current = cartKey;
    }, [cartItems, cartKey]);

    const isInCart = (itemId) => cartItems.some(i => i._id === itemId);

    const addToCart = (item) => {
        if (!isInCart(item._id)) {
            const isSold = item.is_sold || item.status === 'sold' || item.is_ordered;
            if (isSold) return;
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
