import MatchResultGroup from './MatchResultGroup'

export default function MatchResults({ groups, unlockSectionSlot, renderDishActions }) {
  return (
    <div className="space-y-8">
      {unlockSectionSlot && <div id="fe11-unlock-slot" className="w-full">{unlockSectionSlot}</div>}
      {!groups?.length ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-muted">Chưa có món nào khớp với các nguyên liệu này. Thử thêm nguyên liệu khác.</p>
        </div>
      ) : groups.map(group => (
        <MatchResultGroup key={group.id} group={group} renderDishActions={renderDishActions} />
      ))}
    </div>
  )
}
