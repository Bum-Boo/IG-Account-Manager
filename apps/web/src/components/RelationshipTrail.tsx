import type { Account, Concept, PostCandidate } from "../types.js";
import { accountLabel, conceptLabel } from "../utils.js";

export function RelationshipTrail({
  account,
  concept,
  candidate
}: {
  account?: Account;
  concept?: Concept;
  candidate?: PostCandidate;
}) {
  return (
    <div className="relationship-trail">
      <span>{accountLabel(account)}</span>
      <span>{conceptLabel(concept)}</span>
      {candidate ? <span>{candidate.format}</span> : null}
    </div>
  );
}
