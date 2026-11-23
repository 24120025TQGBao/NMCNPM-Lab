import MatchResultGroup from './MatchResultGroup'

export default function MatchResults({ groups, unlockSectionSlot }) {
  if (!groups || groups.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-muted">
          Chưa có món nào khớp với các nguyên liệu này. Thử thêm nguyên liệu khác.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Điểm mở rộng cho FE11 (TV5): "Mua thêm 1 thứ mở khóa N món" */}
      {unlockSectionSlot && (
        <div id="fe11-unlock-slot" className="w-full">
          {unlockSectionSlot}
        </div>
      )}

      {groups.map((group) => (
        <MatchResultGroup key={group.id} group={group} />
      ))}
    </div>
  )
}
