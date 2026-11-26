"""Build an AC matrix from recorded evidence; does not run apps or write databases."""
import argparse,json,pathlib,datetime,os
parser=argparse.ArgumentParser()
for key in ['plan','browser','api','compat','audit','output']:parser.add_argument('--'+key,required=True)
a=parser.parse_args()
def read(name):return json.loads(pathlib.Path(name).read_text(encoding='utf-8'))
browser,api,compat,audit=map(read,[a.browser,a.api,a.compat,a.audit])
additional=read(os.environ['QA_DATA_EVIDENCE']) if os.environ.get('QA_DATA_EVIDENCE') else None
if additional:
 # Only the four data-dependent ACs supersede their old BLOCKED preconditions.
 ids={'S2-01.4','S2-01.12','S2-02.7','S2-02.8'}
 for run in browser['results']:
  run['checks']=[c for c in run['checks'] if not(c['status']=='BLOCKED' and set(c.get('ac',[])) & ids)]
 browser['results'].extend(additional['results'])
rows=[]
api_rules={
 'S2-01.11':lambda n:'validation' in n and '/suggestions' in n,
 'S2-02.1':lambda n:n=='validation /dishes/match',
 'S2-02.13':lambda n:n=='valid unused ingredient gives empty matches',
 'S2-02.17':lambda n:n.startswith('independent oracle '),
 'S2-03.2':lambda n:n.startswith('cook time filter independently'),
 'S2-03.4':lambda n:n=='fixed-dataset pagination has no duplicates or gaps',
 'S2-03.5':lambda n:'validation' in n and any(x in n for x in ['/dishes?page=0','/dishes?limit=51','/dishes?flavor=UNKNOWN','/dishes?max_cook_time=0']),
 'S2-04.7':lambda n:n in ['dish not found','recipe not found','missing dish recipe list'],
 'S2-04.8':lambda n:'validation' in n and any(x in n for x in ['/dishes/abc','/recipes/-1']),
}
issues={'S2-01.4':['BUG-S2-007'],'S2-01.7':['BUG-S2-005'],'S2-02.14':['BUG-S2-005'],'S2-04.1':['BUG-S2-003'],'S2-04.2':['BUG-S2-004'],'S2-04.10':['BUG-S2-005']}
for line in pathlib.Path(a.plan).read_text(encoding='utf-8').splitlines():
 if not line.startswith('| QA04-S2-'):continue
 fields=[x.strip() for x in line.strip('|').split('|')]
 ident=fields[0].removeprefix('QA04-')
 proofs=[]
 for run in browser['results']:
  for case in run['checks']:
   if ident in case.get('ac',[]):proofs.append({'layer':run['name'],'check':case['name'],'status':case['status'],'mode':case.get('mode'),'reason':case.get('reason'),'screenshot':case.get('screenshot')})
 if ident in api_rules:
  for case in api['results']:
   if api_rules[ident](case['name']):proofs.append({'layer':'live HTTP API','check':case['name'],'status':case['status'],'mode':'LIVE_API'})
 if ident=='S2-02.18':
  for run in compat['results']:
   for case in run['checks']:proofs.append({'layer':run['name'],'check':case['name'],'status':case['status'],'mode':'LIVE_P1_WITH_LABELLED_FAULT_INJECTION'})
 statuses={x['status'] for x in proofs}
 status=next((x for x in ['FAIL','BLOCKED','PASS'] if x in statuses),'NOT RUN')
 item={'id':ident,'priority':'P1' if '[P1]' in fields[1] else 'P0','status':status,'given':fields[2],'when':fields[3],'expected':fields[4],'issues':issues.get(ident,[]) if status=='FAIL' else [],'evidence':proofs}
 if ident=='S2-04.7':item['variantLimitations']=['unknown ID branch passed; live HIDDEN/DELETED fixture not created or altered in the shared database']
 rows.append(item)
assert len(rows)==49,len(rows)
summary={x:sum(row['status']==x for row in rows) for x in ['PASS','FAIL','BLOCKED','NOT RUN']}
by_story={story:{x:sum(row['id'].startswith(story+'.') and row['status']==x for row in rows) for x in summary} for story in ['S2-01','S2-02','S2-03','S2-04']}
report={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':os.environ.get('QA_SOURCE_LABEL','candidate main413a7b6 + FE10 587171e + FE11 e8de078, not merge/revert approval'),'acceptance':'not accepted while P0 FAIL/BLOCKED remain; final release review required','summary':summary,'stories':by_story,'liveData':audit,'cases':rows}
output=pathlib.Path(a.output);output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# QA06 — Ma trận49 AC đã đối chiếu bằng chứng','',f'Kết quả ứng viên, không phải phê duyệt merge/revert: {summary}.','Không cộng số API checks, browser checks và AC. HTTP fixture/fault injection được ghi theo từng proof.','', '| AC | Priority | Kết quả | Bug / lý do |','|---|---|---|---|']
for row in rows:
 why=', '.join(row['issues']) or ('Thiếu dữ liệu tag/vùng miền/pantry' if row['status']=='BLOCKED' else 'Xem JSON evidence và mode')
 lines.append(f"| {row['id']} | {row['priority']} | {row['status']} | {why} |")
output.with_suffix('.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'summary':summary,'stories':by_story}))
