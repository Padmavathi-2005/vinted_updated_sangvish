'use client';

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const ScrollToTop = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant",
            });
        }
    }, [pathname, searchParams]);

    return null;
};

export default ScrollToTop;
