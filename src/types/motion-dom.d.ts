/**
 * Ambient type declarations for motion-dom.
 *
 * motion-dom@12.23.28 is published WITHOUT its .d.ts files, so
 * framer-motion's types can't resolve MotionNodeOptions, Transition, etc.
 * This stub tells TypeScript the module exists and makes all its exports `any`,
 * which unblocks the framer-motion React prop types (initial, animate, etc.).
 *
 * Remove this file once motion-dom ships proper type declarations.
 */
declare module "motion-dom" {
  const _default: any;
  export default _default;

  // Re-export everything as any so framer-motion's named imports resolve.
  export const MotionValue: any;
  export const JSAnimation: any;
  export const Batcher: any;
  export const AnimationScope: any;
  export const AnimationPlaybackControls: any;
  export const AnimationPlaybackControlsWithThen: any;
  export const LegacyAnimationControls: any;

  // Types that framer-motion imports by name
  export type MotionNodeOptions = {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    variants?: any;
    whileHover?: any;
    whileTap?: any;
    whileDrag?: any;
    whileFocus?: any;
    whileInView?: any;
    onAnimationStart?: any;
    onAnimationComplete?: any;
    layout?: boolean | string;
    layoutId?: string;
    [key: string]: any;
  };

  export type TransformProperties = Record<string, any>;
  export type SVGPathProperties = Record<string, any>;
  export type Transition = Record<string, any>;
  export type ValueTransition = Record<string, any>;
  export type TargetAndTransition = Record<string, any>;
  export type AnyResolvedKeyframe = any;
  export type OnKeyframesResolved<V = any> = any;
  export type KeyframeResolver<V = any> = any;
  export type UnresolvedValueKeyframe = any;
  export type AnimationDefinition = any;
  export type DOMKeyframesDefinition = any;
  export type AnimationOptions = any;
  export type AnimationPlaybackOptions = any;
  export type ElementOrSelector = any;
  export type ValueAnimationTransition = any;
  export type EventInfo = any;
  export type MotionValueEventCallbacks = any;
  export type SpringOptions = any;
  export type TransformOptions = any;
}

declare module "motion-utils" {
  export type Easing = any;
  export type EasingFunction = any;
  export type Point = any;
  export type Axis = any;
  export type Box = any;
  export type Delta = any;
  export const MotionGlobalConfig: any;

  // Allow all other imports
  const _default: any;
  export default _default;
}
