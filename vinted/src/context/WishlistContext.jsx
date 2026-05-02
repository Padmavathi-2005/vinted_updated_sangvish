import { createContext, useState, useEffect, useContext } from 'react';
import axios from '../utils/axios';
import AuthContext from './AuthContext';

// Use same backend URL as AuthContext or relative if proxy
const BACKEND_URL = '/api/favorites';

// Create context
const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
    const [wishlist, setWishlist] = useState([]);
    const { user, logout } = useContext(AuthContext);

    // Fetch wishlist on user change
    useEffect(() => {
        if (user && user.token) {
            fetchWishlist(user.token);
        } else {
            setWishlist([]);
        }
    }, [user]);

    const fetchWishlist = async (token) => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(BACKEND_URL, config);
            if (Array.isArray(response.data)) {
                setWishlist(response.data.map(id => String(id)));
            } else {
                console.warn('Backend returned non-array wishlist:', response.data);
                setWishlist([]);
            }
        } catch (error) {
            console.error('Error fetching/syncing wishlist:', error);
            if (error.response && error.response.status === 401) {
                // Token invalid or expired
                logout();
                setWishlist([]);
            } else {
                setWishlist([]);
            }
        }
    };

    const addToWishlist = async (itemId) => {
        if (!user || !user.token) return;
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            await axios.post(BACKEND_URL, { item_id: itemId }, config);
            const stringId = String(itemId);
            setWishlist((prev) => (Array.isArray(prev) ? [...prev, stringId] : [stringId]));
        } catch (error) {
            console.error('Error adding to wishlist:', error);
        }
    };

    const removeFromWishlist = async (itemId) => {
        if (!user || !user.token) return;
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            await axios.delete(`${BACKEND_URL}/${itemId}`, config);
            setWishlist((prev) => (Array.isArray(prev) ? prev.filter((id) => id !== itemId) : []));
        } catch (error) {
            console.error('Error removing from wishlist:', error);
        }
    };

    const isWishlisted = (itemId) => 
        Array.isArray(wishlist) && wishlist.some(id => String(id) === String(itemId));

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                addToWishlist,
                removeFromWishlist,
                isWishlisted,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
};

export default WishlistContext;
