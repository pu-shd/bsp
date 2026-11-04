const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DOCKERFILES = ['Dockerfile', 'Dockerfile.test'];

// External base images, skipping references to earlier build stages.
function externalBaseImages(dockerfile) {
  const text = fs.readFileSync(path.join(ROOT, dockerfile), 'utf8');
  const stages = new Set();
  const images = [];
  for (const m of text.matchAll(/^FROM\s+(\S+)(?:\s+AS\s+(\S+))?/gim)) {
    if (!stages.has(m[1])) images.push(m[1]);
    if (m[2]) stages.add(m[2]);
  }
  return images;
}

describe('Docker base images are pinned', () => {
  test.each(DOCKERFILES)('%s pins every base image to an exact version and digest', (dockerfile) => {
    const images = externalBaseImages(dockerfile);
    expect(images.length).toBeGreaterThan(0);
    const unpinned = images.filter(
      (image) => !/^[\w./-]+:\d+\.\d+\.\d+[\w.-]*@sha256:[0-9a-f]{64}$/.test(image));
    expect(unpinned).toEqual([]);
  });

  test('all Dockerfiles use the same base image', () => {
    const all = new Set(DOCKERFILES.flatMap(externalBaseImages));
    expect(all.size).toBe(1);
  });
});
