import { ReviewIcon, SegmentedControl } from "@mission-readiness/ui";
import { REVIEW_STATUSES, reviewHints, reviewLabels, type ReviewStatus } from "../../lib/annotations";
import { useAnnotationActions } from "../../lib/annotations-react";

interface Props {
  eventId: string;
  status: ReviewStatus;
  onChange: (status: ReviewStatus) => void;
}

/** Instructor's verdict on one event. Applies immediately; no separate save. */
export function ReviewControl({ eventId, status, onChange }: Props) {
  const store = useAnnotationActions();
  return (
    <>
      <SegmentedControl
        legend="Review status"
        showLegend
        layout="wrap"
        name="review-status"
        value={status}
        describedBy="review-hint"
        onChange={(next) => {
          store.setReview(eventId, next);
          onChange(next);
        }}
        options={REVIEW_STATUSES.map((s) => ({
          value: s,
          label: reviewLabels[s],
          hint: reviewHints[s],
          icon: () => <ReviewIcon status={s} />,
        }))}
      />
      {/* Read out with the selected option; not drawn, to keep the composer short. Each option also carries it as a tooltip. */}
      <p id="review-hint" className="sr-only">
        {reviewHints[status]}
      </p>
    </>
  );
}
