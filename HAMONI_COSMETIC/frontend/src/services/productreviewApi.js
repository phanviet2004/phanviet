import axiosClient from "./axiosClient";

export const createReview = async (formData) => {
  try {
    // BẮT BUỘC PHẢI CÓ HEADERS NÀY ĐỂ GHI ĐÈ LÊN MẶC ĐỊNH 'application/json' CỦA AXIOSCLIENT
    const response = await axiosClient.post(
      "/product-reviews/create",
      formData,
      {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          console.log(`Đang tải lên: ${percentCompleted}%`);
        },
      },
    );

    return response;
  } catch (error) {
    console.error(
      "Lỗi tại productreviewApi:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const checkReviewHistory = async (MaDH, MaSP, MaND) => {
  try {
    const response = await axiosClient.get("/product-reviews/check-history", {
      params: { MaDH, MaSP, MaND },
    });
    return response;
  } catch (error) {
    console.error("Lỗi khi check lịch sử đánh giá:", error);
    throw error;
  }
};
