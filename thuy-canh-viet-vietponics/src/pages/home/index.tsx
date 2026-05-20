import Banners from "./banners";
import Category from "./category";
import FlashSales from "./flash-sales";

const HomePage: React.FunctionComponent = () => {
  return (
    <div className="min-h-full space-y-2 py-2">
      <Category />
      <Banners />
      <FlashSales />
    </div>
  );
};

export default HomePage;
