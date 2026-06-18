const CONFIG = {
  STORAGE_KEYS: {
    USER_INFO: "userInfo",
    DELIVERY: "delivery",
    SHIPPING_ADDRESS: "shippingAddress",
    TOKEN: "token",
    SHORTCUT_PROMPTED: "shortcutPrompted",
    OA_FOLLOW_PROMPTED: "oaFollowPrompted",
    // Tên/ảnh live lấy từ Zalo SDK (getUserInfo) — cache lại để userInfoState
    // không phải gọi lại SDK (tránh rate-limit -1409 do gọi getSetting/getUserInfo
    // trùng ở nhiều nơi). Tách khỏi USER_INFO vì đây là dữ liệu Zalo, không phải
    // field người dùng tự nhập.
    ZALO_SDK_PROFILE: "zaloSdkProfile",
    // ID của customer đang đăng nhập — dùng để phát hiện account switch và
    // reset shippingAddressState về đúng địa chỉ của tài khoản mới.
    AUTHED_CUSTOMER_ID: "authedCustomerId",
  },
};

export default CONFIG;
