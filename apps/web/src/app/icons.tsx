// The only file that names the icon library for actions, always paired with a text label. Meaningful shapes live
// beside their feature (EventIcon, ReviewIcon); status dots are CSS.
import {
  ArrowRightToLine,
  Check,
  ChevronRight,
  ChevronUp,
  Download,
  History,
  Link2,
  MessageSquarePlus,
  Pause,
  Pencil,
  Play,
  Radio,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Trash2,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

// Decorative by default (the label beside it is the accessible name), sized to sit with 13px button text.
const decorative = (Icon: LucideIcon) =>
  function DecorativeIcon(props: LucideProps) {
    const { className, ...rest } = props;
    return (
      <Icon
        aria-hidden
        size={14}
        strokeWidth={2}
        className={className ? `shrink-0 ${className}` : "shrink-0"}
        {...rest}
      />
    );
  };

export const IconPlay = decorative(Play);
export const IconPause = decorative(Pause);
export const IconPrevious = decorative(SkipBack);
export const IconNext = decorative(SkipForward);
export const IconLive = decorative(Radio);
export const IconEnd = decorative(ArrowRightToLine);
export const IconReplay = decorative(History);
export const IconAddNote = decorative(MessageSquarePlus);
export const IconDisplay = decorative(SlidersHorizontal);
export const IconExport = decorative(Download);
export const IconLink = decorative(Link2);
export const IconEdit = decorative(Pencil);
export const IconDelete = decorative(Trash2);
export const IconClose = decorative(X);
export const IconMore = decorative(ChevronRight);
export const IconExpand = decorative(ChevronUp);
export const IconSave = decorative(Check);
