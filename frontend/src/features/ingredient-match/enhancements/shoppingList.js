// Input is the selected dishes' FE09 view model (camelCase), not raw RPC rows.
export function buildShoppingList(dishes) {
  const names = new Map()
  for (const dish of dishes) {
    for (const ingredient of dish.missing ?? []) {
      if (ingredient.id != null && ingredient.name?.trim() && !names.has(ingredient.id)) {
        names.set(ingredient.id, ingredient.name.trim())
      }
    }
  }
  return [...names.values()].map(name => `- ${name}`).join(String.fromCharCode(10))
}

export async function copyShoppingList(text, clipboard) {
  if (!text) throw new Error('Không có nguyên liệu thiếu để sao chép.')
  if (typeof clipboard?.writeText !== 'function') {
    throw new Error('Trình duyệt không hỗ trợ sao chép. Hãy thử trên HTTPS hoặc localhost.')
  }
  await clipboard.writeText(text)
}
