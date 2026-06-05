export function variantAvailable(v: {
  qty_purchased: number;
  qty_sold: number;
  qty_gifted: number;
  qty_reserved?: number;
}) {
  return Math.max(
    0,
    v.qty_purchased - v.qty_sold - v.qty_gifted - (v.qty_reserved ?? 0),
  );
}
