/**
 * Hàm thuần nhóm kết quả tìm món theo nguyên liệu thành 4 nhóm theo Mục 5.6 & QĐ 4.4.
 *
 * Nhóm 1: Nấu ngay (readiness = READY && !isIncomplete)
 * Nhóm 2: Thiếu 1–2 thứ (readiness = MISSING_1_2 && !isIncomplete)
 * Nhóm 3: Cần đi chợ (readiness = NEED_SHOPPING && !isIncomplete)
 * Nhóm 4: Chưa đầy đủ dữ liệu (isIncomplete = true, bất kể readiness nào)
 *
 * Trong mỗi nhóm: GIỮ NGUYÊN thứ tự từ API, KHÔNG sắp xếp lại hay tính lại % khớp.
 */
export function groupMatchResults(dishes = []) {
  if (!Array.isArray(dishes)) return []

  const ready = []
  const missing12 = []
  const needShopping = []
  const incomplete = []

  for (const dish of dishes) {
    if (dish.isIncomplete) {
      incomplete.push(dish)
    } else if (dish.readiness === 'READY') {
      ready.push(dish)
    } else if (dish.readiness === 'MISSING_1_2') {
      missing12.push(dish)
    } else {
      needShopping.push(dish)
    }
  }

  const groups = []

  if (ready.length > 0) {
    groups.push({
      id: 'READY',
      title: 'Nấu ngay',
      description: null,
      items: ready,
    })
  }

  if (missing12.length > 0) {
    groups.push({
      id: 'MISSING_1_2',
      title: 'Thiếu 1–2 thứ',
      description: null,
      items: missing12,
    })
  }

  if (needShopping.length > 0) {
    groups.push({
      id: 'NEED_SHOPPING',
      title: 'Cần đi chợ',
      description: null,
      items: needShopping,
    })
  }

  if (incomplete.length > 0) {
    groups.push({
      id: 'INCOMPLETE',
      title: 'Chưa đủ dữ liệu để kết luận',
      description: 'Dữ liệu nguyên liệu của món này chưa đầy đủ, chưa thể xác nhận đủ để nấu',
      items: incomplete,
    })
  }

  return groups
}
