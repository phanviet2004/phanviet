import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './ShoppingCart.css';
import shoppingCartApi from '../../../services/shoppingCartApi';
import { useStore } from '../../../store/useStore';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ShoppingCart = () => {
  const navigate = useNavigate(); 
  const { syncCartFromBackend } = useStore(); 
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [quantityInputs, setQuantityInputs] = useState({});

  const getMaKhachHang = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || user?.maND || user?.MaND || null;
  }, []);

  const fetchCartData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        setCartItems([]);
        syncCartFromBackend([]);
        return;
      }

      const response = await shoppingCartApi.getCartItems(maKhachHang);
      const data = response?.data || response;
      setCartItems(Array.isArray(data) ? data : []);
      
      // Đồng bộ store với dữ liệu giỏ hàng (Cập nhật số lượng trên Header)
      syncCartFromBackend(Array.isArray(data) ? data : []);
      
      // Dispatch event báo hiệu giỏ hàng đã thay đổi
      window.dispatchEvent(new Event('cartUpdated'));
      
      if (Array.isArray(data)) {
        const nextQuantityInputs = {};
        data.forEach((item) => {
          nextQuantityInputs[item.MaBienThe] = String(item.SoLuong ?? 1);
        });
        setQuantityInputs(nextQuantityInputs);
      }
    } catch (error) {
      console.error("❌ Lỗi khi lấy giỏ hàng:", error);
      setCartItems([]);
      syncCartFromBackend([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [getMaKhachHang, syncCartFromBackend]);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  const formatVND = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const totalAmount = cartItems
    .filter(item => Number(item.IsSelected) === 1)
    .reduce((sum, item) => sum + (item.Gia * item.SoLuong), 0);

  const isAllSelected = cartItems.length > 0 && cartItems.every(item => Number(item.IsSelected) === 1);
  const selectedCount = cartItems.filter(item => Number(item.IsSelected) === 1).length;

  const commitQuantity = async (maBienThe, rawValue) => {
    const item = cartItems.find((cartItem) => cartItem.MaBienThe === maBienThe);
    const normalizedQty = Number.parseInt(String(rawValue), 10);

    if (!item) return;

    if (!Number.isFinite(normalizedQty)) {
      setQuantityInputs((prev) => ({ ...prev, [maBienThe]: String(item.SoLuong || 1) }));
      return;
    }

    await updateQuantity(maBienThe, normalizedQty);
  };

  const updateQuantity = async (maBienThe, newQty) => {
    const item = cartItems.find(i => i.MaBienThe === maBienThe);
    const maKhachHang = getMaKhachHang();
    const normalizedQty = Number(newQty);

    if (!maKhachHang) {
      toast.warning("Vui lòng đăng nhập để cập nhật giỏ hàng.");
      navigate('/login');
      return;
    }
    
    if (!Number.isFinite(normalizedQty)) {
      toast.error("Số lượng không hợp lệ.");
      return;
    }

    if (normalizedQty <= 0) {
      setItemToDelete(maBienThe);
      setShowModal(true);
      return;
    }

    const maxStock = Math.max(1, Number(item?.SoLuongTon || 0));
    
    if (normalizedQty > maxStock) {
      toast.warning(`Sản phẩm này chỉ còn tối đa ${maxStock} trong kho.`);
      setQuantityInputs((prev) => ({
        ...prev,
        [maBienThe]: String(maxStock)
      }));
      return; 
    }

    setQuantityInputs((prev) => ({
      ...prev,
      [maBienThe]: String(normalizedQty)
    }));

    setCartItems((prevItems) => 
      prevItems.map((cartItem) => 
        cartItem.MaBienThe === maBienThe 
          ? { ...cartItem, SoLuong: normalizedQty } 
          : cartItem
      )
    );

    try {
      await shoppingCartApi.updateCartItem({
        maKhachHang,
        maBienThe,
        soLuong: normalizedQty,
        isSelected: item.IsSelected
      });
      fetchCartData(false);
    } catch (error) {
      toast.warning(error.response?.data?.message || "Lỗi cập nhật số lượng.");
      fetchCartData(false);
    }
  };

  const toggleSelect = async (maBienThe, currentStatus) => {
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để cập nhật giỏ hàng.");
        navigate('/login');
        return;
      }

      const item = cartItems.find(i => i.MaBienThe === maBienThe);
      await shoppingCartApi.updateCartItem({
        maKhachHang,
        maBienThe,
        soLuong: item.SoLuong,
        isSelected: Number(currentStatus) === 1 ? 0 : 1
      });
      fetchCartData(false);
    } catch (error) {
      console.error("Lỗi chọn sản phẩm:", error);
      toast.error("Lỗi chọn sản phẩm!");
    }
  };

  const toggleSelectAll = async () => {
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để cập nhật giỏ hàng.");
        navigate('/login');
        return;
      }

      const newStatus = isAllSelected ? 0 : 1;
      await Promise.all(cartItems.map(item => 
        shoppingCartApi.updateCartItem({
          maKhachHang,
          maBienThe: item.MaBienThe,
          soLuong: item.SoLuong,
          isSelected: newStatus
        })
      ));
      fetchCartData(false);
    } catch (error) {
      console.error("Lỗi chọn tất cả:", error);
      toast.error("Lỗi chọn tất cả!");
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để thao tác giỏ hàng.");
        navigate('/login');
        return;
      }

      if (itemToDelete === 'multiple') {
        const selectedItems = cartItems.filter(item => Number(item.IsSelected) === 1);
        await Promise.all(selectedItems.map(item => 
          shoppingCartApi.removeCartItem({ maKhachHang, maBienThe: item.MaBienThe })
        ));
        toast.success("Đã xóa các sản phẩm được chọn!");
      } else {
        await shoppingCartApi.removeCartItem({ 
          maKhachHang, 
          maBienThe: itemToDelete 
        });
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng!");
      }
      setShowModal(false);
      setItemToDelete(null);
      fetchCartData();
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      toast.error("Có lỗi khi xóa sản phẩm.");
    }
  };

  const handleBuyNow = async () => {
    if (selectedCount === 0) return;
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để thanh toán.");
        navigate('/login');
        return;
      }

      const selectedVariantIds = cartItems
        .filter((item) => Number(item.IsSelected) === 1)
        .map((item) => Number(item.MaBienThe))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (!selectedVariantIds.length) {
        toast.warning("Vui lòng chọn sản phẩm để thanh toán.");
        return;
      }

      await shoppingCartApi.holdStock({
        maKhachHang
      });
      sessionStorage.setItem('checkoutSelectedVariantIds', JSON.stringify(selectedVariantIds));
      navigate('/orderpayment', {
        state: { selectedVariantIds }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi giữ hàng, vui lòng thử lại.");
      fetchCartData(); 
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />

      {loading ? (
        <div className="cart-wrapper-pc">
            <div className="mt-5 text-center text-slate-500 font-medium">Đang tải giỏ hàng...</div>
        </div>
      ) : (
        <div className="cart-wrapper-pc">
          <div className="cart-container-pc">
            
            <div className="cart-pc-header-nav flex justify-between items-center w-full">
               <div className="nav-left flex items-center gap-2">
                  <span onClick={() => navigate(-1)} className="back-icon text-xl font-bold" style={{cursor: 'pointer'}}>←</span>
                  <span className="logo-text text-xl font-bold text-rose-500">Giỏ Hàng</span>
               </div>
               
               <div className="nav-right flex items-center gap-6">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={toggleSelectAll}>
                      <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="hamoni-checkbox w-4 h-4 cursor-pointer accent-rose-500" />
                      <span className="text-sm font-medium text-slate-700">Chọn Tất Cả ({cartItems.length})</span>
                  </div>
                  {selectedCount > 0 && (
                      <span 
                         className="delete-all-btn text-sm font-medium text-rose-500 hover:text-rose-700 cursor-pointer" 
                         onClick={() => { setItemToDelete('multiple'); setShowModal(true); }}
                      >
                         Xóa ({selectedCount}) mục đã chọn
                      </span>
                  )}
               </div>
            </div>

            <div className="cart-pc-table-header mt-4">
               <div className="col-check">
                  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="hamoni-checkbox" />
               </div>
               <div className="col-product">Sản Phẩm</div>
               <div className="col-price">Đơn Giá</div>
               <div className="col-quantity">Số Lượng</div>
               <div className="col-total">Số Tiền</div>
               <div className="col-action">Thao Tác</div>
            </div>

            {/* ĐÃ THÊM: overflow-y-auto, max-h-[500px] và pr-2 (padding-right) để tạo thanh cuộn dọc không bị đè vào nội dung */}
            <div className="cart-pc-list overflow-y-auto max-h-[500px] pr-2">
              {cartItems.length === 0 ? (
                <div className="empty-cart-pc text-center py-10 text-slate-500">Giỏ hàng của bạn đang trống</div>
              ) : (
                cartItems.map(item => (
                  <div key={item.MaBienThe} className="cart-pc-item">
                    <div className="col-check">
                       <input type="checkbox" checked={Number(item.IsSelected) === 1} onChange={() => toggleSelect(item.MaBienThe, item.IsSelected)} className="hamoni-checkbox" />
                    </div>
                    <div className="col-product">
                       <div className="product-info-box">
                          <div className="product-img-placeholder" style={{backgroundImage: `url(${item.DuongDanAnh})`, backgroundSize: 'cover', backgroundPosition: 'center'}}></div>
                          <div className="product-text">
                             <div className="product-name font-semibold text-slate-800">{item.TenSP}</div>
                             <div className="product-variant text-sm text-slate-500">Phân loại: {item.TenBienThe}</div>
                          </div>
                       </div>
                    </div>
                    <div className="col-price">{formatVND(item.Gia)}</div>
                    <div className="col-quantity">
                        <div className="qty-control-pc">
                          <button onClick={() => updateQuantity(item.MaBienThe, Number(item.SoLuong) - 1)}>−</button>
                          
                          <input 
                            type="number" 
                            value={quantityInputs[item.MaBienThe] ?? String(item.SoLuong)}
                            onChange={(e) => {
                              const numericText = String(e.target.value).replace(/\D/g, '');
                              if (!numericText) {
                                setQuantityInputs((prev) => ({
                                  ...prev,
                                  [item.MaBienThe]: ''
                                }));
                                return;
                              }

                              let parsedValue = Number.parseInt(numericText, 10);
                              const maxStock = Math.max(1, Number(item.SoLuongTon || 0));
                              
                              if (parsedValue > maxStock) {
                                toast.warning(`Sản phẩm này chỉ còn tối đa ${maxStock} trong kho.`);
                                parsedValue = maxStock;
                              }

                              setQuantityInputs((prev) => ({
                                ...prev,
                                [item.MaBienThe]: String(parsedValue)
                              }));

                              setCartItems((prevItems) => 
                                prevItems.map((cartItem) => 
                                  cartItem.MaBienThe === item.MaBienThe 
                                    ? { ...cartItem, SoLuong: parsedValue } 
                                    : cartItem
                                )
                              );
                            }}
                            onBlur={(e) => commitQuantity(item.MaBienThe, e.target.value)}
                          />

                          <button onClick={() => {
                              const maxStock = Math.max(1, Number(item.SoLuongTon || 0));
                              if (Number(item.SoLuong) >= maxStock) {
                                toast.warning(`Sản phẩm này chỉ còn tối đa ${maxStock} trong kho.`);
                                return;
                              }
                              updateQuantity(item.MaBienThe, Number(item.SoLuong) + 1);
                          }}>+</button>

                        </div>
                    </div>
                    <div className="col-total-red font-bold text-rose-600">{formatVND(item.Gia * item.SoLuong)}</div>
                    <div className="col-action">
                       <span className="delete-text cursor-pointer text-slate-500 hover:text-red-500 transition-colors" onClick={() => { setItemToDelete(item.MaBienThe); setShowModal(true); }}>Xóa</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-pc-footer">
               <div className="footer-bottom flex justify-between items-center mt-4 w-full">
                  <div></div> 
                  
                  <div className="footer-right flex items-center gap-6">
                     <div className="flex flex-col items-end">
                         <div className="total-label text-sm text-slate-600">Tổng thanh toán ({selectedCount} sản phẩm):</div>
                         <div className="total-amount-large text-2xl font-black text-rose-600">{formatVND(totalAmount)}</div>
                     </div>
                     <button 
                        className={`btn-buy px-8 py-3 rounded-xl font-bold text-white transition-colors ${selectedCount === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30'}`} 
                        disabled={selectedCount === 0} 
                        onClick={handleBuyNow}
                     >
                        Thanh Toán
                     </button>
                  </div>
               </div>
            </div>

            {showModal && (
              <div className="modal-overlay fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                <div className="custom-modal bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <div className="modal-content text-center mb-6">
                     <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa</h3>
                     <p className="text-slate-600">Bạn chắc chắn muốn loại bỏ {itemToDelete === 'multiple' ? selectedCount : 1} sản phẩm này khỏi giỏ hàng?</p>
                  </div>
                  <div className="modal-actions flex gap-3">
                    <button className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors" onClick={() => setShowModal(false)}>Không</button>
                    <button className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-md shadow-rose-500/30 transition-colors" onClick={handleConfirmDelete}>Đồng ý xóa</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ShoppingCart;