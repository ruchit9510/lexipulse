import zipfile
import xml.etree.ElementTree as ET
import datetime
import json

def parse_words_xlsx(filepath):
    epoch = datetime.date(1899, 12, 30)
    with zipfile.ZipFile(filepath, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in tree.findall('ns:si', ns):
                t_elems = si.findall('.//ns:t', ns)
                text = ''.join([elem.text or '' for elem in t_elems])
                shared_strings.append(text)
        
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rows = sheet_tree.findall('.//ns:row', ns)
        
        records = []
        headers = []
        
        for r in rows:
            vals = {}
            for c in r.findall('ns:c', ns):
                col_ref = ''.join(filter(str.isalpha, c.attrib.get('r', '')))
                t = c.attrib.get('t')
                v = c.find('ns:v', ns)
                val = v.text if v is not None else ''
                if t == 's' and val != '':
                    val = shared_strings[int(val)]
                vals[col_ref] = val
            
            row_idx = r.attrib.get('r')
            if row_idx == '1':
                headers = [vals.get('A'), vals.get('B'), vals.get('C'), vals.get('D'), vals.get('E')]
            else:
                word = vals.get('B', '').strip()
                if not word:
                    continue
                raw_date = vals.get('A', '')
                date_str = ''
                try:
                    serial = float(raw_date)
                    dt = epoch + datetime.timedelta(days=int(serial))
                    date_str = dt.isoformat()
                except Exception:
                    date_str = raw_date
                
                records.append({
                    'id': f"{word.lower()}_{date_str}",
                    'date': date_str,
                    'word': word,
                    'meaning': vals.get('C', '').strip(),
                    'example': vals.get('D', '').strip(),
                    'howToUse': vals.get('E', '').strip()
                })
        return headers, records

if __name__ == '__main__':
    headers, records = parse_words_xlsx('Words.xlsx')
    print('Headers:', headers)
    print(f'Found {len(records)} records')
    for r in records:
        print(f"{r['date']} | {r['word']} | {r['meaning']}")
