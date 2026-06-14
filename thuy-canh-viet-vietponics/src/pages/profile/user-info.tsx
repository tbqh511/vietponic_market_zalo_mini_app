import { UserInfoSkeleton } from "@/components/skeleton";
import TransitionLink from "@/components/transition-link";
import { customerProfileState, loadableUserInfoState } from "@/state";
import logo from "@/static/logo.png";
import { useAtomValue } from "jotai";
import { PropsWithChildren, useEffect, useState } from "react";
import { Icon } from "zmp-ui";
import Register from "./register";

// Dùng React state để track lỗi avatar thay vì DOM manipulation.
// Cần thiết vì useInitAuth chạy async sau lần render đầu và có thể cung cấp
// URL avatar mới — DOM mutation từ onError không bị React reset khi src thay đổi.
function ProfileAvatar({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  if (src && !failed) {
    return (
      <img
        className="rounded-full h-10 w-10 object-cover bg-black/5 flex-none"
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <img
      src={logo}
      alt="Vietponics"
      className="rounded-full h-10 w-10 object-contain bg-primary/10 p-1 flex-none"
    />
  );
}

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
          <ProfileAvatar src={avatar} alt={name} />
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
