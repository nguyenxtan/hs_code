"""Deterministic local preparation. Original records and tax strings remain unchanged."""
import argparse
import collections
import csv
import hashlib
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

RULESET = 'technical-v1'
FIELDS = ['hs_code','mo_ta_vi','mo_ta_en_tham_khao','don_vi_tinh','thue_nk_uu_dai_mfn_raw','thue_nk_thong_thuong_raw','vat_raw','acfta_raw','bvmt_raw','quan_ly_chuyen_nganh_raw','giam_vat_raw','source_url']
CH98_FIELDS = ['hs_code_ch98','mo_ta_vi','ma_hs_tuong_ung','don_vi_tinh',*FIELDS[4:-1],'nguon']

def stable_json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n'

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def source_files(root, registry):
    return [root/f['name'] for f in registry['sources']]

def snapshot_identity(records, hashes):
    return hashlib.sha256(stable_json({'sources':hashes,'records':records,'ruleset':RULESET}).encode('utf-8')).hexdigest()[:12]

def fold(value):
    decomposed = unicodedata.normalize('NFD', value.casefold()).replace('đ', 'd')
    return re.sub(r'\s+', ' ', ''.join(c for c in decomposed if not unicodedata.combining(c))).strip()

def dash_level(value):
    prefix = re.match(r'^\s*(?:-\s*)*', value).group()
    return prefix.count('-')

def normalize_description(value):
    transforms = []
    text = unicodedata.normalize('NFC', value)
    if text != value: transforms.append('unicode_nfc')
    changed = text.replace('\u00a0', ' ')
    if changed != text: transforms.append('nbsp_to_space')
    text = changed
    changed = re.sub(r'[^\S\r\n]+', ' ', text).strip()
    if changed != text: transforms.append('horizontal_whitespace_trim')
    if dash_level(value) != dash_level(changed):
        raise ValueError('dash_level_changed')
    return {'text': changed, 'dash_level': dash_level(value), 'transforms': transforms}

def normalize_record(value):
    n = normalize_description(value['mo_ta_vi'])
    code = value.get('hs_code', value.get('hs_code_ch98'))
    return {
        'code': code, 'dataset': 'chapter98' if 'hs_code_ch98' in value else 'main',
        'raw': dict(value), 'description': n['text'], 'dash_level': n['dash_level'],
        'description_en': value.get('mo_ta_en_tham_khao', ''), 'en_scope': 'reference_unverified',
        'search_text': fold(' '.join([code, n['text'], value.get('mo_ta_en_tham_khao','')])),
        'chapter': code[:2], 'heading': code[:4], 'subheading': code[:6],
        'corresponding_code': value.get('ma_hs_tuong_ung', ''),
        'context_complete': False, 'transforms': n['transforms'],
        'presence': {k: 'empty_in_source' if v == '' else 'recorded' for k,v in value.items()},
    }

def validate_rows(rows, code_field='hs_code', expected_fields=None):
    counts = collections.Counter(r.get(code_field) for r in rows)
    accepted, rejected = [], []
    for i, row in enumerate(rows):
        reasons=[]
        code=row.get(code_field)
        if not isinstance(code, str) or not re.fullmatch('[0-9]{8}', code): reasons.append('invalid_code')
        if counts[code] > 1: reasons.append('duplicate_code')
        if expected_fields is not None and set(row) != set(expected_fields): reasons.append('schema_mismatch')
        if any(not isinstance(v,str) for v in row.values()): reasons.append('non_string_value')
        if not row.get('mo_ta_vi') or not row.get('source_url',row.get('nguon')): reasons.append('missing_required_field')
        for k,v in row.items():
            if isinstance(v,str) and any(ord(c)<32 and c not in ('\n','\r','\t') for c in v): reasons.append('control_character:'+k)
        if reasons: rejected.append({'row_index':i,'raw':row,'reasons':reasons})
        else: accepted.append((i,row))
    return accepted,rejected

def read_xlsx(path):
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    relns={'r':'http://schemas.openxmlformats.org/package/2006/relationships'}
    with zipfile.ZipFile(path) as z:
        strings=[''.join(t.itertext()) for t in ET.fromstring(z.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in z.namelist() else []
        relationships={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels')).findall('r:Relationship',relns)}
        result={}
        for sheet in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',ns):
            rid=sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target=relationships[rid]
            target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
            rows=[]
            for row in ET.fromstring(z.read(target)).findall('s:sheetData/s:row',ns):
                cells={}
                for c in row.findall('s:c',ns):
                    col=0
                    for char in re.match('[A-Z]+',c.attrib['r']).group(): col=col*26+ord(char)-64
                    if c.find('s:f',ns) is not None: raise ValueError('Formula cells require manual review')
                    v=c.find('s:v',ns)
                    val=v.text if v is not None and v.text is not None else ''
                    if c.attrib.get('t')=='s': val=strings[int(val)]
                    elif c.attrib.get('t')=='inlineStr': val=''.join(c.find('s:is',ns).itertext())
                    cells[col-1]=val
                if cells: rows.append([cells.get(i,'') for i in range(max(cells)+1)])
            result[sheet.attrib['name']]=rows
        return result

def table_records(table):
    header=table[0]
    return [dict(zip(header,row+['']*(len(header)-len(row)))) for row in table[1:]]

def prepare(input_dir, output_dir):
    root, out=Path(input_dir),Path(output_dir)
    if root.resolve()==out.resolve() or root.resolve() in out.resolve().parents:
        raise ValueError('Output must be outside immutable raw directory')
    manifest=json.loads((root/'manifest.json').read_text()) if (root/'manifest.json').exists() else {'files':[]}
    for f in manifest['files']:
        if digest(root/f['name']) != f['sha256']: raise ValueError('Raw checksum mismatch: '+f['name'])
    registry=json.loads(Path(__file__).with_name('sources.json').read_text())
    for f in registry['sources']:
        if not (root/f['name']).exists() or digest(root/f['name'])!=f['sha256']:
            raise ValueError('Pinned source missing or checksum differs: '+f['name'])
    files=source_files(root,registry)
    hashes={p.name:digest(p) for p in files}
    rows=json.loads((root/'hs_codes_2022_11414.json').read_text(encoding='utf-8'))
    with (root/'hs_codes_2022_11414.csv').open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f); csv_rows=list(reader); header=reader.fieldnames
    if csv_rows != rows or header != FIELDS: raise ValueError('JSON/CSV mismatch; preparation aborted')
    workbooks=[p for p in files if p.suffix=='.xlsx']
    chapters=[]
    if workbooks:
        sheets=read_xlsx(workbooks[0])
        if table_records(sheets['HS_2022']) != rows: raise ValueError('XLSX/JSON mismatch; preparation aborted')
        chapters=table_records(sheets['CH98_BoSung'])
    records,quarantine,diff=[],[],[]
    for name,data,code_field,expected in [('main',rows,'hs_code',FIELDS),('chapter98',chapters,'hs_code_ch98',CH98_FIELDS)]:
        accepted,rejected=validate_rows(data,code_field,expected)
        quarantine.extend(dict(x,dataset=name) for x in rejected)
        for index,row in accepted:
            try: result=normalize_record(row)
            except ValueError as e:
                quarantine.append({'dataset':name,'row_index':index,'raw':row,'reasons':[str(e)]});continue
            result['provenance']={'raw_row_index':index,'sheet':'HS_2022' if name=='main' else 'CH98_BoSung','source_sha256':hashes['hs_codes_2022_11414.json'] if name=='main' else hashes[workbooks[0].name],'ruleset':RULESET}
            records.append(result)
            if result['transforms']:
                before,after=row['mo_ta_vi'],result['description']
                diff.append({'dataset':name,'code':result['code'],'field':'mo_ta_vi_norm','before':before,'after':after,'before_codepoints':[hex(ord(c)) for c in before],'after_codepoints':[hex(ord(c)) for c in after],'transforms':result['transforms']})
    audit={
        'ruleset':RULESET,'source_hashes':hashes,'input_rows':len(rows)+len(chapters),'accepted':len(records),'quarantined':len(quarantine),
        'datasets':{'main':len(rows),'chapter98':len(chapters)},'changed_records':len(diff),
        'changed_by_transform':dict(collections.Counter(t for x in diff for t in x['transforms'])),
        'main_prefix_counts':{str(n):len({r['hs_code'][:n] for r in rows}) for n in [2,4,6]},
        'empty_main_fields':{k:sum(r[k]=='' for r in rows) for k in FIELDS},
        'vat_patterns':dict(collections.Counter(r['vat_raw'] for r in rows)),
        'warnings':['Parent descriptions incomplete; no official hierarchy reconstructed.','EN reference scope unverified.','Tax strings retained; not applicable rates.','No utility taxonomy or semantic aliases inferred.'],
        'chapter98_missing_corresponding_code':sum(not r.get('ma_hs_tuong_ung') for r in chapters),
    }
    identity=snapshot_identity(records,hashes)
    records_hash=hashlib.sha256(stable_json(sorted(records,key=lambda r:r['code'])).encode('utf-8')).hexdigest()
    snapshot={'version':'vn-hs2022-'+identity+'-'+RULESET,'records_sha256':records_hash,'license':'CC-BY-SA-4.0; source rights must be respected','attribution':'HS Knowledge Base — github.com/ozvietnam/hs-code-api','source_date':'2026-11-03','context_complete':False,'records':records,'audit':audit}
    outputs={'snapshot.json':snapshot,'audit.json':audit,'transform-diff.json':diff,'quarantine.json':quarantine,'reconciliation.json':{'json_csv_equal':True,'xlsx_json_equal':bool(workbooks),'main_rows':len(rows),'source_hashes':hashes}}
    out.mkdir(parents=True,exist_ok=True)
    for filename,obj in outputs.items(): (out/filename).write_text(stable_json(obj),encoding='utf-8')
    for p in files:
        if digest(p)!=hashes[p.name]: raise ValueError('Raw modified during preparation')
    print(stable_json(audit),end='')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args();prepare(args.input,args.output)
