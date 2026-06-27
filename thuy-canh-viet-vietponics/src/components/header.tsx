import { useAtomValue } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";
import {
  categoriesStateUpwrapped,
  loadableUserInfoState,
} from "@/state";
import { useEffect, useMemo, useState } from "react";
import { useRouteHandle } from "@/hooks";
import { useFarmProfile } from "@/utils/farm-api";
import { getConfig } from "@/utils/template";
import headerIllus from "@/static/header-illus.svg";
import logo from "@/static/logo.png";
import SearchBar from "./search-bar";
import TransitionLink from "./transition-link";
import { Icon } from "zmp-ui";
import { DefaultUserAvatar } from "./vectors";

// Avatar nhỏ trên header: dùng React state để reset khi URL thay đổi (URL Zalo
// có thời hạn — useInitAuth ghi URL mới sau render đầu).
function HeaderAvatar({ userInfo }: { userInfo: ReturnType<typeof useAtomValue<typeof loadableUserInfoState>> }) {
  const avatar = userInfo.state === "hasData" ? (userInfo.data?.avatar ?? "") : "";
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [avatar]);

  if (avatar && !failed) {
    return (
      <img
        className="w-8 h-8 rounded-full object-cover"
        src={avatar}
        alt=""
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <DefaultUserAvatar
      width={32}
      height={32}
      className={userInfo.state === "loading" ? "animate-pulse" : ""}
    />
  );
}

export default function Header() {
  const categories = useAtomValue(categoriesStateUpwrapped);
  const navigate = useNavigate();
  const location = useLocation();
  const [handle, match] = useRouteHandle();
  const userInfo = useAtomValue(loadableUserInfoState);

  const isFarmSpace = handle?.space === "farm";

  const title = useMemo(() => {
    if (handle) {
      if (typeof handle.title === "function") {
        return handle.title({ categories, params: match.params });
      } else {
        return handle.title;
      }
    }
  }, [handle, categories]);

  const showBack = location.key !== "default" && !handle?.noBack;

  // Header riêng cho Farm space: tên farm + nút quay lại mua hàng. Không search bar.
  if (isFarmSpace) {
    return <FarmHeader title={title} showBack={showBack} noBack={handle?.noBack} />;
  }

  return (
    <div
      className="w-full flex flex-col px-4 bg-primary text-primaryForeground pt-st overflow-hidden bg-no-repeat bg-right-top"
      style={{
        backgroundImage: `url(${headerIllus})`,
      }}
    >
      <div className="w-full min-h-12 pr-[90px] flex py-2 space-x-2 items-center">
        {handle?.logo ? (
          <>
            <img
              src={logo}
              className="flex-none w-8 h-8 rounded-full"
            />
            <TransitionLink to="/stations" className="flex-1 overflow-hidden min-w-0">
              <div className="flex items-center space-x-1 min-w-0">
                <h1 className="text-base font-bold leading-tight min-w-0">
                  {getConfig((c) => c.template.shopName)}
                </h1>
                <Icon icon="zi-chevron-right" className="flex-none" />
              </div>
              <p className="overflow-x-auto whitespace-nowrap text-2xs">
                {getConfig((c) => c.template.shopAddress)}
              </p>
            </TransitionLink>
          </>
        ) : (
          <>
            {showBack && (
              <div
                className="py-1 px-2 cursor-pointer"
                onClick={() => navigate(-1)}
              >
                <Icon icon="zi-arrow-left" />
              </div>
            )}
            <div className="text-xl font-medium truncate">{title}</div>
          </>
        )}
      </div>
      {handle?.search && (
        <div className="w-full py-2 flex space-x-2">
          <SearchBar
            onFocus={() => {
              if (location.pathname !== "/search") {
                navigate("/search", { viewTransition: true });
              }
            }}
          />
          <TransitionLink to="/profile">
            <HeaderAvatar userInfo={userInfo} />
          </TransitionLink>
        </div>
      )}
    </div>
  );
}

// Header Farm space: tab gốc (noBack) hiện tên farm + nút "Mua hàng" để về
// customer space; trang con (có back) hiện mũi tên back + tiêu đề như cũ.
function FarmHeader(props: {
  title?: React.ReactNode;
  showBack: boolean;
  noBack?: boolean;
}) {
  const navigate = useNavigate();
  const farm = useFarmProfile();

  return (
    <div
      className="w-full flex flex-col px-4 bg-primary text-primaryForeground pt-st overflow-hidden bg-no-repeat bg-right-top"
      style={{ backgroundImage: `url(${headerIllus})` }}
    >
      <div className="w-full min-h-12 flex py-2 space-x-2 items-center">
        {/* Tab gốc farm: logo + tên farm. Trang con: back + tiêu đề. */}
        {props.noBack ? (
          <>
            <img src={logo} className="flex-none w-8 h-8 rounded-full object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold leading-tight truncate">
                {farm.data?.name ?? "Farm Hub"}
              </h1>
              <p className="text-2xs opacity-80 truncate">{props.title}</p>
            </div>
          </>
        ) : (
          <>
            {props.showBack && (
              <div
                className="py-1 px-2 cursor-pointer"
                onClick={() => navigate(-1)}
              >
                <Icon icon="zi-arrow-left" />
              </div>
            )}
            <div className="flex-1 text-xl font-medium truncate">
              {props.title}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
