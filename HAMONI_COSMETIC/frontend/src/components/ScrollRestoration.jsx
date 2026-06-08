import { useScrollRestoration } from '../hooks/useScrollRestoration';

/**
 * Component để quản lý scroll behavior
 * - Chuyển trang (navigate): scroll về top
 * - Refresh trang: khôi phục vị trí cũ
 * 
 * Sử dụng: 
 * <BrowserRouter>
 *   <ScrollRestoration />
 *   <Routes>...</Routes>
 * </BrowserRouter>
 */
export const ScrollRestoration = () => {
    useScrollRestoration();
    return null;
};

export default ScrollRestoration;
