import ProfileActions from "./actions";
import AffiliateEntryCard from "./affiliate-entry-card";
import FarmEntryCard from "./farm-entry-card";
import FollowOA from "./follow-oa";
import Points from "./points";
import UserInfo from "./user-info";

export default function ProfilePage() {
  return (
    <div className="min-h-full bg-background p-4 space-y-2.5">
      <UserInfo>
        <Points />
      </UserInfo>
      <AffiliateEntryCard />
      <FarmEntryCard />
      <ProfileActions />
      <FollowOA />
    </div>
  );
}
