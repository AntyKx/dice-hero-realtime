/** 通用物件池：避免高頻生成物（投射物/傷害數字/掉落物）造成頻繁 GC。見 REALTIME_PIVOT_PLAN.md §7。 */
export class Pool<T> {
  private free: T[] = []

  constructor(
    private readonly factory: () => T,
    private readonly reset: (item: T) => void,
  ) {}

  acquire(): T {
    const item = this.free.pop()
    if (item !== undefined) {
      this.reset(item)
      return item
    }
    return this.factory()
  }

  release(item: T): void {
    this.free.push(item)
  }
}
