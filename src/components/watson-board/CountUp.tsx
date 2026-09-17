import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

export function CountUp({ value, duration = 1.4 }: { value: number; duration?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: "easeOut" });
    return c.stop;
  }, [value, duration, mv]);
  return <motion.span>{rounded}</motion.span>;
}
