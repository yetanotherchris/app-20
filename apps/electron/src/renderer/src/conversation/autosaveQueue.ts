export interface AutosaveQueueOptions<Snapshot> {
  createSnapshot: () => Snapshot
  saveSnapshot: (snapshot: Snapshot) => Promise<void>
  onFailure: (error: unknown) => void
  draftDebounceMs?: number
}

interface WaitingTrigger {
  revision: number
  resolve: (saved: boolean) => void
}

/** Serializes persistence while retaining only the newest requested snapshot. */
export class AutosaveQueue<Snapshot> {
  private readonly draftDebounceMs: number
  private requestedRevision = 0
  private attemptedRevision = 0
  private savedRevision = 0
  private isWriting = false
  private draftTimer: ReturnType<typeof globalThis.setTimeout> | undefined
  private reportedFailure = false
  private readonly waitingTriggers: WaitingTrigger[] = []

  constructor(private readonly options: AutosaveQueueOptions<Snapshot>) {
    this.draftDebounceMs = options.draftDebounceMs ?? 2_000
  }

  /** Requests an immediate save and resolves when this revision has been attempted. */
  trigger(): Promise<boolean> {
    const revision = ++this.requestedRevision
    const result = new Promise<boolean>((resolve) => {
      this.waitingTriggers.push({ revision, resolve })
    })
    this.startWriting()
    return result
  }

  /** Resets the idle timer that persists an unsent composer draft. */
  scheduleDraftSave(): void {
    this.cancelDraftTimer()
    this.draftTimer = globalThis.setTimeout(() => {
      this.draftTimer = undefined
      void this.trigger()
    }, this.draftDebounceMs)
  }

  cancelDraftTimer(): void {
    if (this.draftTimer === undefined) return
    globalThis.clearTimeout(this.draftTimer)
    this.draftTimer = undefined
  }

  /** Cancels a pending draft save, then attempts a fresh snapshot. */
  flush(): Promise<boolean> {
    this.cancelDraftTimer()
    return this.trigger()
  }

  private startWriting(): void {
    if (this.isWriting) return
    this.isWriting = true
    void this.writeRequestedSnapshots()
  }

  private async writeRequestedSnapshots(): Promise<void> {
    while (this.attemptedRevision < this.requestedRevision) {
      const revision = this.requestedRevision
      let saved = false

      try {
        await this.options.saveSnapshot(this.options.createSnapshot())
        this.savedRevision = revision
        this.reportedFailure = false
        saved = true
      } catch (error: unknown) {
        if (!this.reportedFailure) {
          this.reportedFailure = true
          this.options.onFailure(error)
        }
      }

      this.attemptedRevision = revision
      this.resolveTriggersThrough(revision, saved)
    }

    this.isWriting = false
  }

  private resolveTriggersThrough(revision: number, saved: boolean): void {
    const remaining: WaitingTrigger[] = []
    for (const trigger of this.waitingTriggers) {
      if (trigger.revision <= revision) trigger.resolve(saved)
      else remaining.push(trigger)
    }
    this.waitingTriggers.splice(0, this.waitingTriggers.length, ...remaining)
  }
}
