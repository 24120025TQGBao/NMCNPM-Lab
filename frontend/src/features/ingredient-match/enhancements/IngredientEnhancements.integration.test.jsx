import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuggestSessionProvider } from '../../suggest/SuggestSessionContext'
import { initialSessionState, STORAGE_KEY, loadSession, sessionReducer } from '../../suggest/sessionReducer'
import IngredientMatchTab from '../components/IngredientMatchTab'
import { useIngredientEnhancements } from './useIngredientEnhancements'
import { groupMatchResults } from '../groupMatchResults'
import { getDishIdsUsingIngredient, suggestNextIngredients } from '../../../api/ingredientEnhancementsApi'
import { matchDishes } from '../../../api/dishMatchApi'
vi.mock('../../../api/ingredientEnhancementsApi',()=>({getDishIdsUsingIngredient:vi.fn(),suggestNextIngredients:vi.fn()}))
vi.mock('../../../api/dishMatchApi',()=>({matchDishes:vi.fn()}))
const ingredients=[{id:1,name:'Cà chua'},{id:2,name:'Hành lá'}]
const missing={id:56,name:'Sườn heo',role:'PRIMARY'}
const results=[
 {id:10,name:'Món A',matchRatio:.8,haveCount:4,totalCount:5,missing:[missing],readiness:'MISSING_1_2',isIncomplete:false},
 {id:11,name:'Món B',matchRatio:.5,haveCount:1,totalCount:2,missing:[{id:28,name:'Gừng',role:'SECONDARY'}],readiness:'MISSING_1_2',isIncomplete:false},
 {id:12,name:'Món thiếu dữ liệu',matchRatio:1,haveCount:1,totalCount:2,missing:[missing],readiness:'READY',isIncomplete:true},
]
const offers=[{ingredient:{id:56,name:'Sườn heo'},unlockCount:1,dishIds:[10]}]
function seed(overrides={}) {
 sessionStorage.setItem(STORAGE_KEY,JSON.stringify({...initialSessionState,match:{...initialSessionState.match,ingredients,results,queryKey:'1,2|true',...overrides}}))
}
function Wrapper({children}) {return <MemoryRouter><SuggestSessionProvider>{children}</SuggestSessionProvider></MemoryRouter>}
function tab(){return render(<IngredientMatchTab/>,{wrapper:Wrapper})}
const props={ingredients,pantry:true,results,queryKey:'1,2|true',groups:groupMatchResults(results)}
beforeEach(()=>{
 sessionStorage.clear();seed();vi.clearAllMocks()
 suggestNextIngredients.mockResolvedValue([]);getDishIdsUsingIngredient.mockResolvedValue([11,12]);matchDishes.mockResolvedValue(results)
})

describe('FE11 in the real FE09 tab',()=>{
 it('renders BE12 in the extension slot, hides empty results, and adds a bought ingredient canonically',async()=>{
  suggestNextIngredients.mockResolvedValue(offers)
  tab()
  expect(await screen.findByRole('region',{name:'Gợi ý mua thêm'})).toHaveTextContent('Mua thêm 1 thứ mở khóa 1 món')
  expect(suggestNextIngredients.mock.calls[0][0]).toMatchObject({ingredients:[1,2],pantry:true})
  fireEvent.click(screen.getByRole('button',{name:'Thêm Sườn heo vào nguyên liệu đang có'}))
  expect(screen.getByRole('button',{name:'Bỏ Sườn heo'})).toBeInTheDocument()
  expect(screen.queryByRole('region',{name:'Gợi ý mua thêm'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Tìm món'}))
  await waitFor(()=>expect(matchDishes).toHaveBeenCalledWith(expect.objectContaining({ingredients:[1,2,56]})))
 })
 it('hides Mua thêm for [] without hiding normal match results',async()=>{
  tab();await waitFor(()=>expect(suggestNextIngredients).toHaveBeenCalled())
  expect(screen.queryByRole('region',{name:'Gợi ý mua thêm'})).not.toBeInTheDocument()
  expect(screen.getByText('Món A')).toBeInTheDocument()
 })
 it('retries BE12 errors without discarding matches or chips',async()=>{
  suggestNextIngredients.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(offers)
  tab();fireEvent.click(await screen.findByRole('button',{name:'Thử lại gợi ý mua thêm'}))
  expect(await screen.findByRole('region',{name:'Gợi ý mua thêm'})).toBeInTheDocument()
  expect(screen.getByText('Món A')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Bỏ Cà chua'})).toBeInTheDocument()
 })
 it('pins using verified catalog membership, preserves groups/ratios and restores API order on unpin',async()=>{
  tab();fireEvent.click(screen.getByRole('button',{name:'Ghim Hành lá'}))
  await waitFor(()=>expect(screen.getAllByRole('link').map(x=>x.textContent)).toEqual([
   expect.stringContaining('Món B'),expect.stringContaining('Món A'),expect.stringContaining('Món thiếu dữ liệu'),
  ]))
  expect(getDishIdsUsingIngredient).toHaveBeenCalledWith(2,expect.objectContaining({signal:expect.any(AbortSignal)}))
  expect(screen.getByRole('button',{name:'Bỏ ghim Hành lá'})).toHaveAttribute('aria-pressed','true')
  expect(screen.queryByRole('heading',{name:'Nấu ngay'})).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar',{name:'Mức khớp 80%'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Bỏ ghim Hành lá'}))
  expect(screen.getAllByRole('link')[0]).toHaveTextContent('Món A')
 })
 it('keeps API order when pin lookup fails, with a working retry',async()=>{
  getDishIdsUsingIngredient.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([11])
  tab();fireEvent.click(screen.getByRole('button',{name:'Ghim Hành lá'}))
  fireEvent.click(await screen.findByRole('button',{name:'Thử lại ưu tiên nguyên liệu ghim'}))
  await waitFor(()=>expect(screen.getAllByRole('link')[0]).toHaveTextContent('Món B'))
 })
 it('copies only selected dishes, removes duplicates and warns for incomplete data',async()=>{
  const writeText=vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator',{...navigator,clipboard:{writeText}})
  try {
   tab();expect(screen.getByRole('button',{name:'Sao chép danh sách đi chợ'})).toBeDisabled()
   fireEvent.click(screen.getByRole('checkbox',{name:'Thêm nguyên liệu thiếu của Món A vào danh sách đi chợ'}))
   fireEvent.click(screen.getByRole('checkbox',{name:'Thêm nguyên liệu thiếu của Món thiếu dữ liệu vào danh sách đi chợ'}))
   fireEvent.click(screen.getByRole('button',{name:'Sao chép danh sách đi chợ'}))
   expect(await screen.findByText('Đã sao chép danh sách đi chợ.')).toBeInTheDocument()
   expect(writeText).toHaveBeenCalledWith('- Sườn heo')
   expect(screen.getByText(/danh sách chỉ gồm nguyên liệu thiếu đã biết/)).toBeInTheDocument()
   expect(screen.getByRole('region',{name:'Danh sách đi chợ'})).not.toHaveTextContent('Gừng')
  } finally {vi.unstubAllGlobals()}
 })
 it('preserves pins and shopping selections when leaving/remounting the tab, and drops a removed pin',async()=>{
  const view=tab();fireEvent.click(screen.getByRole('button',{name:'Ghim Hành lá'}))
  fireEvent.click(screen.getByRole('checkbox',{name:'Thêm nguyên liệu thiếu của Món A vào danh sách đi chợ'}))
  await waitFor(()=>expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).match.pinnedIds).toEqual([2]))
  view.unmount();tab()
  expect(screen.getByRole('button',{name:'Bỏ ghim Hành lá'})).toHaveAttribute('aria-pressed','true')
  expect(screen.getByRole('checkbox',{name:'Thêm nguyên liệu thiếu của Món A vào danh sách đi chợ'})).toBeChecked()
  fireEvent.click(screen.getByRole('button',{name:'Bỏ Hành lá'}))
  await waitFor(()=>expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).match.pinnedIds).toEqual([]))
 })
 it('refreshes BE12 with pantry changes and clears shopping selections for a new match query',async()=>{
  tab();fireEvent.click(screen.getByRole('checkbox',{name:'Thêm nguyên liệu thiếu của Món A vào danh sách đi chợ'}))
  const pantry=screen.getAllByRole('checkbox').find(x=>!x.getAttribute('aria-label'))
  fireEvent.click(pantry)
  await waitFor(()=>expect(suggestNextIngredients).toHaveBeenCalledWith(expect.objectContaining({pantry:false})))
  expect(screen.getByRole('checkbox',{name:'Thêm nguyên liệu thiếu của Món A vào danh sách đi chợ'})).not.toBeChecked()
 })
})

describe('request races and saved session compatibility',()=>{
 it('aborts and ignores an old BE12 response after the query changes',async()=>{
  let first,second
  suggestNextIngredients.mockImplementationOnce(()=>new Promise(done=>{first=done})).mockImplementationOnce(()=>new Promise(done=>{second=done}))
  const hook=renderHook(value=>useIngredientEnhancements(value),{initialProps:props,wrapper:Wrapper})
  await waitFor(()=>expect(suggestNextIngredients).toHaveBeenCalledTimes(1))
  const signal=suggestNextIngredients.mock.calls[0][0].signal
  hook.rerender({...props,pantry:false,queryKey:'1,2|false'})
  expect(signal.aborted).toBe(true)
  await act(async()=>{first(offers);second([])})
  expect(hook.result.current.purchase.items).toEqual([]);expect(hook.result.current.purchase.loading).toBe(false)
 })
 it('ignores a delayed pin lookup after the ingredient is unpinned',async()=>{
  let done
  getDishIdsUsingIngredient.mockImplementation(()=>new Promise(resolve=>{done=resolve}))
  const hook=renderHook(()=>useIngredientEnhancements(props),{wrapper:Wrapper})
  act(()=>hook.result.current.togglePin(2))
  await waitFor(()=>expect(getDishIdsUsingIngredient).toHaveBeenCalledTimes(1))
  const signal=getDishIdsUsingIngredient.mock.calls[0][1].signal
  act(()=>hook.result.current.togglePin(2));expect(signal.aborted).toBe(true)
  await act(async()=>done([11]))
  expect(hook.result.current.orderedGroups[0].items[0].id).toBe(10)
 })
 it('loads older FE09 sessions with empty enhancement state and sanitizes stale pins',()=>{
  seed({pinnedIds:undefined,shoppingDishIds:undefined});expect(loadSession().match.pinnedIds).toEqual([])
  seed({pinnedIds:[2,2,999],shoppingDishIds:[10,999]})
  expect(loadSession().match).toMatchObject({pinnedIds:[2],shoppingDishIds:[10]})
 })
 it('rejects selection of unknown dishes and clears selection on a new query',()=>{
  const state=loadSession()
  expect(sessionReducer(state,{type:'TOGGLE_SHOPPING_DISH',payload:999})).toBe(state)
  const chosen=sessionReducer(state,{type:'TOGGLE_SHOPPING_DISH',payload:10})
  expect(sessionReducer(chosen,{type:'SET_MATCH_RESULTS',payload:{results,queryKey:'1,2|false'}}).match.shoppingDishIds).toEqual([])
 })
})
