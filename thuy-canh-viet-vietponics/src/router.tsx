import Layout from "@/components/layout";
import CartPage from "@/pages/cart";
import CategoryDetailPage from "@/pages/catalog/category-detail";
import CategoryListPage from "@/pages/catalog/category-list";
import ProductDetailPage from "@/pages/catalog/product-detail";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import SearchPage from "@/pages/search";
import { createBrowserRouter } from "react-router-dom";
import { getBasePath } from "@/utils/zma";
import OrdersPage from "./pages/orders";
import ShippingAddressPage from "./pages/cart/shipping-address";
import StationsPage from "./pages/cart/stations";
import OrderDetailPage from "./pages/orders/detail";
import ProfileEditorPage from "./pages/profile/editor";
import AffiliatePage from "./pages/profile/affiliate";
import FarmDashboardPage from "./pages/farm";
import FarmAnalyticsPage from "./pages/farm/analytics";
import FarmOrdersPage from "./pages/farm/orders";
import FarmPayoutsPage from "./pages/farm/payouts";
import FarmPayoutDetailPage from "./pages/farm/payout-detail";
import FarmInventoryPage from "./pages/farm/inventory";
import FarmMovementsPage from "./pages/farm/movements";
import FarmRegisterPage from "./pages/farm/register";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "/",
          element: <HomePage />,
          handle: {
            logo: true,
            search: true,
          },
        },
        {
          path: "/categories",
          element: <CategoryListPage />,
          handle: {
            title: "Danh mục",
            noBack: true,
          },
        },
        {
          path: "/orders/:status?",
          element: <OrdersPage />,
          handle: {
            title: "Đơn hàng",
          },
        },
        {
          path: "/order/:id",
          element: <OrderDetailPage />,
          handle: {
            title: "Thông tin đơn hàng",
          },
        },
        {
          path: "/cart",
          element: <CartPage />,
          handle: {
            title: "Giỏ hàng",
            noBack: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/shipping-address",
          element: <ShippingAddressPage />,
          handle: {
            title: "Địa chỉ nhận hàng",
            noFooter: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/stations",
          element: <StationsPage />,
          handle: {
            title: "Điểm nhận hàng",
            noFooter: true,
          },
        },
        {
          path: "/profile",
          element: <ProfilePage />,
          handle: {
            logo: true,
          },
        },
        {
          path: "/profile/edit",
          element: <ProfileEditorPage />,
          handle: {
            title: "Thông tin tài khoản",
            noFooter: true,
            noFloatingCart: true,
          },
        },
        {
          path: "/profile/affiliate",
          element: <AffiliatePage />,
          handle: {
            title: "Cộng tác viên",
            noFloatingCart: true,
          },
        },
        {
          path: "/category/:id",
          element: <CategoryDetailPage />,
          handle: {
            search: true,
            title: ({ categories, params }) =>
              categories.find((c) => String(c.id) === params.id)?.name,
          },
        },
        {
          path: "/product/:id",
          element: <ProductDetailPage />,
          handle: {
            scrollRestoration: 0, // when user selects another product in related products, scroll to the top of the page
            noFloatingCart: true,
          },
        },
        {
          path: "/search",
          element: <SearchPage />,
          handle: {
            search: true,
            title: "Tìm kiếm",
            noFooter: true,
          },
        },
        // ===== FARM SPACE =====
        // 4 tab chính (farmTab: true) + các trang con. Tất cả thuộc space "farm"
        // để Footer đổi tab bar và Layout tự sync appSpaceState khi deep-link.
        {
          path: "/farm",
          element: <FarmDashboardPage />,
          handle: {
            title: "Tổng quan",
            space: "farm",
            farmTab: true,
            noFloatingCart: true,
            noBack: true,
          },
        },
        {
          path: "/farm/orders",
          element: <FarmOrdersPage />,
          handle: {
            title: "Đơn đến",
            space: "farm",
            farmTab: true,
            noFloatingCart: true,
            noBack: true,
          },
        },
        {
          path: "/farm/analytics",
          element: <FarmAnalyticsPage />,
          handle: {
            title: "Phân tích",
            space: "farm",
            farmTab: true,
            noFloatingCart: true,
            noBack: true,
          },
        },
        {
          path: "/farm/payouts",
          element: <FarmPayoutsPage />,
          handle: {
            title: "Thu nhập",
            space: "farm",
            farmTab: true,
            noFloatingCart: true,
            noBack: true,
          },
        },
        {
          path: "/farm/payouts/:id",
          element: <FarmPayoutDetailPage />,
          handle: {
            title: "Chi tiết thanh toán",
            space: "farm",
            noFloatingCart: true,
          },
        },
        // Khai báo nhập kho: là FAB modal (noFooter ẩn tab bar khi đang khai báo).
        // Path chuẩn /farm/stock-in; giữ /farm/inventory làm alias cũ (cùng page).
        {
          path: "/farm/stock-in",
          element: <FarmInventoryPage />,
          handle: {
            title: "Khai báo nhập kho",
            space: "farm",
            noFloatingCart: true,
            noFooter: true,
          },
        },
        {
          path: "/farm/inventory",
          element: <FarmInventoryPage />,
          handle: {
            title: "Khai báo nhập kho",
            space: "farm",
            noFloatingCart: true,
            noFooter: true,
          },
        },
        {
          path: "/farm/movements/:id",
          element: <FarmMovementsPage />,
          handle: {
            title: "Lịch sử biến động",
            space: "farm",
            noFloatingCart: true,
          },
        },
        // Đăng ký Farm Partner: KHÔNG thuộc farm space (customer chưa được duyệt
        // vẫn vào được). noFooter để form chiếm full màn.
        {
          path: "/farm/register",
          element: <FarmRegisterPage />,
          handle: {
            title: "Đăng ký Farm Partner",
            noFloatingCart: true,
            noFooter: true,
          },
        },
      ],
    },
  ],
  { basename: getBasePath() }
);

export default router;
