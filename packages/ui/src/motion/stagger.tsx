"use client";

// Stagger + StaggerItem: a list whose children fade up one after another when scrolled into view.
// The parent only says "visible"; children inherit the variant name, so no props are passed down.
import { motion, stagger } from "motion/react";
import type { ComponentProps } from "react";
import { enterTransition, fadeUp } from "#lib/motion";

export function Stagger({ interval = 0.06, ...props }: ComponentProps<typeof motion.div> & { interval?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, visible: { transition: { delayChildren: stagger(interval) } } }}
      {...props}
    />
  );
}

export function StaggerItem(props: ComponentProps<typeof motion.div>) {
  return <motion.div variants={fadeUp} transition={enterTransition} {...props} />;
}
