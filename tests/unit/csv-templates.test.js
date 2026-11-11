const fs = require('fs');
const path = require('path');
const { parseCSV } = require('../../src/csv');
const { validateMapping, requiredColumns, applyMapping } = require('../../src/fieldMapping');

const TEMPLATES = path.join(__dirname, '..', '..', 'examples', 'templates');

// Rows of the template/mapping table in examples/templates/README.md.
function listedTemplates() {
  const readme = fs.readFileSync(path.join(TEMPLATES, 'README.md'), 'utf8');
  return [...readme.matchAll(/^\|\s*`([^`]+\.csv)`\s*\|\s*`([^`]+\.json)`\s*\|/gm)].map((m) => ({
    csv: m[1],
    mapping: m[2],
  }));
}

describe('examples/templates', () => {
  const listed = listedTemplates();

  test('the README lists templates', () => {
    expect(listed.length).toBeGreaterThan(0);
  });

  test('every CSV in the directory is listed in the README', () => {
    const onDisk = fs.readdirSync(TEMPLATES).filter((f) => f.endsWith('.csv')).sort();
    expect(listed.map((t) => t.csv).sort()).toEqual(onDisk);
  });

  describe.each(listed)('$csv with $mapping', ({ csv, mapping }) => {
    const csvPath = path.join(TEMPLATES, csv);
    const mappingPath = path.join(TEMPLATES, mapping);

    test('both files exist', () => {
      expect(fs.existsSync(csvPath)).toBe(true);
      expect(fs.existsSync(mappingPath)).toBe(true);
    });

    test('the CSV has every column the mapping reads, and every row maps', () => {
      const spec = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
      expect(validateMapping(spec)).toBe(true);

      const { headers, rows } = parseCSV(fs.readFileSync(csvPath, 'utf8'));
      expect(requiredColumns(spec).filter((c) => !headers.includes(c))).toEqual([]);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(() => applyMapping(row, spec)).not.toThrow();
      }
    });
  });
});
