import { UserInfoSkeleton } from "@/components/skeleton";
import TransitionLink from "@/components/transition-link";
import { customerProfileState, loadableUserInfoState } from "@/state";
import logo from "@/static/logo.png";
import { useAtomValue } from "jotai";
import { PropsWithChildren } from "react";
import { Icon } from "zmp-ui";
import Register from "./register";

function UserInfo({ children }: PropsWithChildren) {
  const userInfo = useAtomValue(loadableUserInfoState);
  // Đã /authenticate thành công (có JWT) → coi là đã đăng nhập, bất kể đã cấp
  // scope.userInfo hay chưa. Tránh hiện "Đăng ký thành viên" cho user thật.
  const profile = useAtomValue(customerProfileState);

  // Hiển thị thẻ user khi: lấy được thông tin (hasData) HOẶC đã auth qua backend.
  // Điều kiện cũ chỉ dựa vào userInfoState — mong manh, dễ rơi về Register khi
  // SDK getSetting/getUserInfo lỗi tạm thời dù user đã đăng nhập.
  const hasIdentity =
    (userInfo.state === "hasData" && !!userInfo.data) || !!profile;

  if (hasIdentity) {
    const data = userInfo.state === "hasData" ? userInfo.data : null;
    const name = data?.name || profile?.name || "Khách Zalo";
    const avatar = data?.avatar || profile?.profile || "";
    const phone = data?.phone || profile?.mobile || "";
    return (
      <>
        <div className="bg-section rounded-lg p-4 flex items-center space-x-4 border-[0.5px] border-black/15">
          {avatar ? (
            <img
              className="rounded-full h-10 w-10 object-cover bg-black/5"
              src={avatar}
              alt={name}
              onError={(e) => {
                // Ảnh Zalo lỗi/hết hạn URL → fallback logo Vietponics.
                e.currentTarget.style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.removeProperty("display");
              }}
            />
          ) : null}
          <img
            src={logo}
            alt="Vietponics"
            style={avatar ? { display: "none" } : undefined}
            className="rounded-full h-10 w-10 object-contain bg-primary/10 p-1 flex-none"
          />
          <div className="space-y-0.5 flex-1 overflow-hidden">
            <div className="text-lg truncate">{name}</div>
            <div className="text-sm text-subtitle truncate">{phone}</div>
          </div>
          <TransitionLink to="/profile/edit">
            <Icon icon="zi-edit-text" />
          </TransitionLink>
        </div>
        {children}
      </>
    );
  }

  if (userInfo.state === "loading") {
    return <UserInfoSkeleton />;
  }

  return <Register />;
}

export default UserInfo;
