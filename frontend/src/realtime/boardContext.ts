export interface BoardContextPublisher {
  setBoardContext(manifest: string): Promise<void>;
  setInteractionGuidance(guidance?: string): Promise<void>;
}
