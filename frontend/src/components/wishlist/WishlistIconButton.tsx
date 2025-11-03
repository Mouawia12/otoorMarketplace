import { Link } from "react-router-dom";
import { useWishlistStore } from "../../store/wishlistStore";

export default function WishlistIconButton() {
  const count = useWishlistStore((s) => s.count());

  return (
    <Link
      to="/wishlist"
      className="relative p-2.5 rounded-lg hover:bg-charcoal-light transition min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label="Wishlist"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 22l8.8-10.3a5 5 0 0 0 0-7.1z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -end-1 bg-gold text-charcoal text-[11px] px-1.5 rounded-full font-semibold min-w-[20px] h-[20px] flex items-center justify-center">
          {count}
        </span>
      )}
    </Link>
  );
}
