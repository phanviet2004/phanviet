import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook quản lý scroll position
 * - Chuyển trang: scroll lên đầu
 * - Refresh trang: khôi phục vị trí cũ
 */
export const useScrollRestoration = () => {
    const location = useLocation();
    const isFirstMount = useRef(true);

    useEffect(() => {
        // Nếu là lần đầu tiên mount, khôi phục scroll position từ sessionStorage
        if (isFirstMount.current) {
            isFirstMount.current = false;
            const savedScrollPosition = sessionStorage.getItem('scrollPosition');
            
            if (savedScrollPosition !== null) {
                // Dùng setTimeout để đảm bảo DOM đã render
                setTimeout(() => {
                    window.scrollTo(0, parseInt(savedScrollPosition));
                }, 0);
            }
            return;
        }

        // Nếu không phải lần đầu (là navigation), scroll lên đầu
        window.scrollTo(0, 0);
    }, [location.pathname]);

    // Lưu scroll position trước khi trang bị unload (khi người dùng chuyển trang)
    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.setItem('scrollPosition', window.scrollY.toString());
        };

        const handleScroll = () => {
            sessionStorage.setItem('scrollPosition', window.scrollY.toString());
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
};
