import { describe, expect, it } from 'vitest'
import { parseQuantity, routeServerErrors, toPostInput, validatePostForm } from './postFormValidation'

const valid = () => ({
  dishId: 3, title: 'Phở bò', content: '',
  ingredients: [{ name: 'Xương bò', quantity: '1,5', unit: 'kg', toTaste: false }],
  steps: [{ content: 'Ninh xương' }],
})

describe('validatePostForm', () => {
  it('accepts a valid form', () => {
    expect(validatePostForm(valid())).toEqual({})
  })
  it('reports errors keyed by API field names', () => {
    const f = valid()
    f.dishId = null
    f.title = 'ab'
    f.ingredients = [{ name: ' ', quantity: '0', unit: 'x'.repeat(31), toTaste: false }]
    f.steps = [{ content: '   ' }]
    expect(Object.keys(validatePostForm(f)).sort()).toEqual([
      'dish_id', 'ingredients[0].name', 'ingredients[0].quantity', 'ingredients[0].unit', 'steps[0].content', 'title',
    ])
  })
  it('does not require quantity when "Tùy khẩu vị" is chosen', () => {
    const f = valid()
    f.ingredients = [{ name: 'Muối', quantity: '', unit: '', toTaste: true }]
    expect(validatePostForm(f)).toEqual({})
  })
  it('requires at least one ingredient and one step', () => {
    const f = { ...valid(), ingredients: [], steps: [] }
    expect(validatePostForm(f)).toMatchObject({ ingredients: expect.any(String), steps: expect.any(String) })
  })
  it('rejects non-numeric and negative quantities', () => {
    for (const q of ['abc', '-1', '', 'Infinity']) {
      const f = valid()
      f.ingredients[0].quantity = q
      expect(validatePostForm(f)).toHaveProperty('ingredients[0].quantity')
    }
  })
})

describe('parseQuantity / toPostInput', () => {
  it('parses decimal comma', () => expect(parseQuantity('1,5')).toBe(1.5))
  it('builds service input, omitting empty content and nulling to-taste quantity', () => {
    const f = valid()
    f.ingredients.push({ name: ' Muối ', quantity: '5', unit: '', toTaste: true })
    expect(toPostInput(f)).toEqual({
      dishId: 3, title: 'Phở bò',
      ingredients: [
        { name: 'Xương bò', quantity: 1.5, unit: 'kg', toTaste: false },
        { name: 'Muối', quantity: null, unit: null, toTaste: true },
      ],
      steps: [{ content: 'Ninh xương' }],
    })
  })
})

describe('duplicate ingredients and server error routing', () => {
  it('flags a duplicate ingredient name (case-insensitive) on the later row', () => {
    const f = valid()
    f.ingredients.push({ name: ' XƯƠNG BÒ ', quantity: '1', unit: '', toTaste: false })
    expect(validatePostForm(f)).toEqual({ 'ingredients[1].name': expect.any(String) })
  })
  it('maps backend "ingredients[i]" to the name input and keeps unknown fields as general messages', () => {
    const f = valid()
    f.ingredients.push({ name: 'Muối', quantity: '', unit: '', toTaste: true })
    const { errors, general } = routeServerErrors({
      'ingredients[1]': 'Nguyên liệu bị trùng trong cùng công thức',
      ingredients: 'Có nguyên liệu (ingredient_id) không tồn tại',
      'ingredients[7].name': 'x',
      dish_id: 'Món ăn không tồn tại',
      foo: 'Trường lạ',
    }, f)
    expect(errors).toEqual({
      'ingredients[1].name': 'Nguyên liệu bị trùng trong cùng công thức',
      ingredients: 'Có nguyên liệu (ingredient_id) không tồn tại',
      dish_id: 'Món ăn không tồn tại',
    })
    expect(general).toEqual(['x', 'Trường lạ'])
  })
})
