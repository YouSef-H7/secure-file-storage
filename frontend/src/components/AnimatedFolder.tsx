/**
 * AnimatedFolder – 3D folder icon with hover-open animation.
 *
 * Presentational only. All click / navigation logic stays with the caller.
 *
 * Props:
 *   name      – optional label rendered below the folder (not used currently)
 *   className – extra classes on the outer wrapper
 *   onClick   – forwarded click handler
 */

interface AnimatedFolderProps {
  name?: string;
  className?: string;
  onClick?: () => void;
}

const AnimatedFolder = ({ className = '', onClick }: AnimatedFolderProps) => {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`
        relative group/folder flex items-center justify-center
        w-[48px] h-[38px] shrink-0
        cursor-pointer select-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg
        motion-safe:transition-transform motion-safe:duration-200
        ${className}
      `}
    >
      {/* Perspective wrapper */}
      <div className="relative w-full h-full [perspective:600px]">
        {/* Back panel (folder body) */}
        <div
          className="
            absolute inset-0 bg-[#0d6b3a] rounded-[6px] rounded-tl-none
            motion-safe:transition-shadow motion-safe:duration-300
            group-hover/folder:shadow-[0_6px_16px_rgba(0,0,0,0.18)]
            after:absolute after:content-[''] after:bottom-[99%] after:left-0
            after:w-[40%] after:h-[5px] after:bg-[#0d6b3a] after:rounded-t-[4px]
            before:absolute before:content-[''] before:-top-[4px] before:left-[40%]
            before:w-[5px] before:h-[5px] before:bg-[#0d6b3a]
            before:[clip-path:polygon(0_35%,0%_100%,50%_100%)]
          "
        />

        {/* Inner sheets */}
        <div
          className="
            absolute inset-[2px] bg-[#b0bec5] rounded-[5px]
            origin-bottom
            motion-safe:transition-transform motion-safe:duration-300
            motion-safe:group-hover/folder:[transform:rotateX(-12deg)]
            motion-reduce:group-hover/folder:opacity-90
          "
        />
        <div
          className="
            absolute inset-[2px] bg-[#cfd8dc] rounded-[5px]
            origin-bottom
            motion-safe:transition-transform motion-safe:duration-300
            motion-safe:group-hover/folder:[transform:rotateX(-18deg)]
            motion-reduce:group-hover/folder:opacity-90
          "
        />
        <div
          className="
            absolute inset-[2px] bg-[#eceff1] rounded-[5px]
            origin-bottom
            motion-safe:transition-transform motion-safe:duration-300
            motion-safe:group-hover/folder:[transform:rotateX(-24deg)]
            motion-reduce:group-hover/folder:opacity-90
          "
        />

        {/* Front flap */}
        <div
          className="
            absolute bottom-0 left-0 right-0 h-[90%]
            bg-gradient-to-t from-[#0d8a45] to-[#10a854] rounded-[6px] rounded-tr-none
            origin-bottom
            motion-safe:transition-all motion-safe:duration-300
            motion-safe:group-hover/folder:[transform:rotateX(-30deg)_translateY(1px)]
            motion-safe:group-hover/folder:shadow-[inset_0_8px_16px_#22c55e,inset_0_-8px_16px_#0d6b3a]
            motion-reduce:group-hover/folder:opacity-90
            after:absolute after:content-[''] after:bottom-[99%] after:right-0
            after:w-[58%] after:h-[4px] after:bg-[#10a854] after:rounded-t-[4px]
            before:absolute before:content-[''] before:-top-[3px] before:right-[58%]
            before:w-[4px] before:h-[4px] before:bg-[#10a854]
            before:[clip-path:polygon(100%_14%,50%_100%,100%_100%)]
          "
        />
      </div>
    </div>
  );
};

export default AnimatedFolder;
