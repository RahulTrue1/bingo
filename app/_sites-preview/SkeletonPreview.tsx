import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function SkeletonPreview() {
  return (
    <div className="sites-skeleton-shell">
      <div className="sites-skeleton-status" role="status">
        <h1>Building your site</h1>
        <h2>Your site is taking shape</h2>
        <p>Your first version will appear here automatically when it’s ready.</p>
        <Skeleton
          baseColor="#eceae7"
          highlightColor="#f9f8f6"
          duration={2.8}
        />
        <div className="sites-skeleton-search-placeholder" />
      </div>
    </div>
  );
}
