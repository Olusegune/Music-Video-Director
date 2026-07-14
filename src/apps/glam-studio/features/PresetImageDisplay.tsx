/**
 * Preset image display component for Glam Studio preset cards.
 * Shows a thumbnail image with proper sizing and fallback states.
 */

interface PresetImageDisplayProps {
  imageUrl?: string;
  label: string;
  className?: string;
}

export function PresetImageDisplay({ imageUrl, label, className = "h-24 w-full" }: PresetImageDisplayProps) {
  if (!imageUrl) {
    return (
      <div className={`${className} flex items-center justify-center rounded-md bg-elevated/60`}>
        <span className="text-[10px] text-muted">Image not available</span>
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center justify-center overflow-hidden rounded-md bg-elevated/60`}>
      <img
        src={imageUrl}
        alt={label}
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
