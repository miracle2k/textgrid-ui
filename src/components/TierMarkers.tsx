export enum Mark {
  Error,
  Correct,
}

export type Marks = (Mark|undefined)[];

export type TierMarkerState = {
  totalError: number,
  totalCorrect: number,
  marks: Marks
}