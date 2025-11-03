import { useState } from "react";
import { useCartStore } from "../../store/cartStore";
import MiniCartDrawer from "./MiniCartDrawer";

export default function CartIconButton() {
  const count = useCartStore((s) => s.count());
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2.5 rounded-lg hover:bg-charcoal-light transition min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Cart"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6h15l-1.5 9H7.5L6 6zM7 6V4a3 3 0 016 0v2"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -end-1 bg-gold text-charcoal text-[11px] px-1.5 rounded-full font-semibold min-w-[20px] h-[20px] flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
      <MiniCartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
