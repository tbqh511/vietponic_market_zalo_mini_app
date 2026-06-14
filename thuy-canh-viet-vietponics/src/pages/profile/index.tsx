import ProfileActions from "./actions";
import AffiliateEntryCard from "./affiliate-entry-card";
import DebugPanel from "./debug-panel";
import FarmEntryCard from "./farm-entry-card";
import FollowOA from "./follow-oa";
import Points from "./points";
import UserInfo from "./user-info";
import ZaloShortcuts from "./zalo-shortcuts";
import ProfileGate from "@/components/profile-gate";

export default function ProfilePage() {
  return (
    <div className="min-h-full bg-background p-4">
      <div className="space-y-2.5">
        <UserInfo>
          <Points />
        </UserInfo>
      </div>
      <div className="space-y-2.5 mt-4">
        <AffiliateEntryCard />
        <FarmEntryCard />
        <ProfileActions />
        <ZaloShortcuts />
        <FollowOA />
      </div>
      <ProfileGate />
      <DebugPanel />
    </div>
  );
}
