import { UserInfoSkeleton } from "@/components/skeleton";
import TransitionLink from "@/components/transition-link";
import { loadableUserInfoState } from "@/state";
import { useAtomValue } from "jotai";
import { PropsWithChildren } from "react";
import { Icon } from "zmp-ui";
import Register from "./register";

function UserInfo({ children }: PropsWithChildren) {
  const userInfo = useAtomValue(loadableUserInfoState);

  if (userInfo.state === "hasData" && userInfo.data) {
    const { name, avatar, phone } = userInfo.data;
    return (
      <>
        <div className="bg-section rounded-lg p-4 flex items-center space-x-4 border-[0.5px] border-black/15">
          {avatar ? (
            <img
              className="rounded-full h-10 w-10 object-cover bg-black/5"
              src={avatar}
              alt={name}
              onError={(e) => {
                // Ảnh Zalo lỗi/hết hạn URL → fallback chữ cái đầu thay vì ảnh vỡ.
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`rounded-full h-10 w-10 flex-none flex items-center justify-center bg-primary/10 text-primary font-semibold ${
              avatar ? "hidden" : ""
            }`}
          >
            {(name?.trim()?.[0] ?? "?").toUpperCase()}
          </div>
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
