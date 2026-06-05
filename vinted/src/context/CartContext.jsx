import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';
import AuthContext from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [cartItems, setCartItems] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    const cartKey = user ? `vinted_cart_${user._id}` : 'vinted_cart_guest';

    useEffect(() => {
        const initCart = async () => {
            let localItems = [];
            try {
                const stored = localStorage.getItem(cartKey);
                if (stored) {
                    localItems = JSON.parse(stored);
                } else if (user) {
                    const guestStored = localStorage.getItem('vinted_cart_guest');
                    if (guestStored) {
                        localItems = JSON.parse(guestStored);
                        localStorage.removeItem('vinted_cart_guest');
                    }
                }
            } catch (e) {
                console.error('Failed to parse cart items:', e);
            }

            if (user) {
                try {
                    // If we had guest items, merge them
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    let serverItems = [];
                    if (localItems.length > 0) {
                        const itemIds = localItems.map(i => i._id);
                        const res = await axios.post('/api/cart/merge', { itemIds }, config);
                        serverItems = res.data;
                    } else {
                        const res = await axios.get('/api/cart', config);
                        serverItems = res.data;
                    }
                    
                    // Add selected property to server items
                    const formattedItems = serverItems.map(item => ({ ...item, selected: true }));
                    setCartItems(formattedItems);
                    localStorage.setItem(cartKey, JSON.stringify(formattedItems));
                } catch (err) {
                    console.error('Failed to fetch/merge server cart:', err);
                    setCartItems(localItems);
                }
            } else {
                setCartItems(localItems);
            }
            setIsInitialized(true);
        };

        initCart();
    }, [user, cartKey]);

    // Persist on every change to localStorage as fallback/cache
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(cartKey, JSON.stringify(cartItems));
        }
    }, [cartItems, cartKey, isInitialized]);

    const isInCart = (itemId) => cartItems.some(i => i._id === itemId);

    const addToCart = async (item) => {
        if (!isInCart(item._id)) {
            const isSold = item.is_sold || item.status === 'sold' || item.is_ordered;
            if (isSold) return;

            setCartItems(prev => [...prev, { ...item, selected: true }]);

            if (user) {
                try {
                    const config = { headers: { Authorization: `Bearer ${user.token}` } };
                    await axios.post('/api/cart/add', { itemId: item._id }, config);
                } catch (err) {
                    console.error('Failed to add to server cart:', err);
                }
            }
        }
    };

    const removeFromCart = async (itemId) => {
        setCartItems(prev => prev.filter(i => i._id !== itemId));

        if (user) {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                await axios.post('/api/cart/remove', { itemId }, config);
            } catch (err) {
                console.error('Failed to remove from server cart:', err);
            }
        }
    };

    const toggleSelect = (itemId) => {
        setCartItems(prev =>
            prev.map(i => i._id === itemId ? { ...i, selected: !i.selected } : i)
        );
    };

    const selectAll = () => setCartItems(prev => prev.map(i => ({ ...i, selected: true })));
    const deselectAll = () => setCartItems(prev => prev.map(i => ({ ...i, selected: false })));

    const clearCart = () => setCartItems([]);

    const removeSelected = () => {
        const selectedIds = cartItems.filter(i => i.selected).map(i => i._id);
        selectedIds.forEach(id => removeFromCart(id));
    };

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
