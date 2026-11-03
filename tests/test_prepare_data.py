import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('prepare', Path(__file__).parents[1] / 'scripts/prepare_data.py')

class PreparationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(cls.module)

    def test_normalization_keeps_original_dashes_markers_and_units(self):
        raw = '-\u00a0-  Ca\u0300 phe\u0302 (SEN); 1,3 – chất; cm³  '
        result = self.module.normalize_description(raw)
        self.assertEqual(result['text'], '- - Cà phê (SEN); 1,3 – chất; cm³')
        self.assertEqual(result['dash_level'], 2)
        self.assertEqual(raw[-2:], '  ')

    def test_raw_tax_fields_and_unknown_are_not_reinterpreted(self):
        r = self.module.normalize_record({'hs_code':'01012100','mo_ta_vi':'- Loại khác ', 'vat_raw':'*/5/8/10','bvmt_raw':'MT?','giam_vat_raw':'a\nb','source_url':'https://example.org'})
        self.assertEqual(r['raw']['vat_raw'], '*/5/8/10')
        self.assertEqual(r['raw']['giam_vat_raw'], 'a\nb')
        self.assertEqual(r['code'], '01012100')
        self.assertNotIn('vat_rate', r)
        self.assertFalse(r['context_complete'])

    def test_duplicate_and_invalid_codes_quarantine_every_conflicting_row(self):
        rows=[{'hs_code':'01012100','mo_ta_vi':'A','source_url':'x'}, {'hs_code':'01012100','mo_ta_vi':'B','source_url':'x'}, {'hs_code':'1012100','mo_ta_vi':'C','source_url':'x'}]
        accepted, rejected = self.module.validate_rows(rows)
        self.assertEqual(accepted, [])
        self.assertEqual(len(rejected), 3)

    def test_deterministic_export_preserves_leading_zero_and_newline(self):
        obj={'code':'01012100','raw':{'note':'a\nb','vat_raw':''}}
        self.assertEqual(self.module.stable_json(obj), '{"code":"01012100","raw":{"note":"a\\nb","vat_raw":""}}\n')


class SnapshotIdentityTests(unittest.TestCase):
    def setUp(self):
        self.module=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(self.module)

    def test_only_pinned_files_participate_in_identity(self):
        import tempfile
        with tempfile.TemporaryDirectory() as t:
            root=Path(t); (root/'source.json').write_text('[]'); (root/'.DS_Store').write_text('noise')
            self.assertEqual([p.name for p in self.module.source_files(root,{'sources':[{'name':'source.json'}]})],['source.json'])

    def test_changed_normalized_records_change_identity_even_without_ruleset_bump(self):
        a=self.module.snapshot_identity([{'code':'01012100','description':'A'}],{'source':'hash'})
        b=self.module.snapshot_identity([{'code':'01012100','description':'B'}],{'source':'hash'})
        self.assertNotEqual(a,b)

if __name__ == '__main__':
    unittest.main()
