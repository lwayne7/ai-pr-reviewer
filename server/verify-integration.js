import assert from 'assert';
import http from 'http';
import { parsePRUrl, parsePatch } from '../src/services/github.ts';

console.log('🧪 Starting AI PR Reviewer - Integration Test Suite\n');

// ==========================================
// TEST 1: GitHub PR URL Parser
// ==========================================
console.log('⏳ Test 1: Verifying parsePRUrl...');
try {
  // Valid URL
  const res1 = parsePRUrl('https://github.com/lwayne7/ai-pr-reviewer/pull/123');
  assert.deepStrictEqual(res1, { owner: 'lwayne7', repo: 'ai-pr-reviewer', pullNumber: 123 });

  // Valid URL with trailing slash and query params
  const res2 = parsePRUrl('https://github.com/owner-name/repo-name/pull/456/?tab=files');
  assert.deepStrictEqual(res2, { owner: 'owner-name', repo: 'repo-name', pullNumber: 456 });

  // Invalid URL
  const res3 = parsePRUrl('https://github.com/lwayne7/ai-pr-reviewer/issues/123');
  assert.strictEqual(res3, null);

  console.log('✅ Test 1 Passed: parsePRUrl behaves correctly.');
} catch (err) {
  console.error('❌ Test 1 Failed:', err);
  process.exit(1);
}

// ==========================================
// TEST 2: Git Diff Patch Parser
// ==========================================
console.log('\n⏳ Test 2: Verifying parsePatch...');
try {
  const samplePatch = `@@ -1,4 +1,5 @@
-old line
+new line 1
+new line 2
 normal context line
@@ -10,3 +11,4 @@
 unchanged context
-removed line
+added line`;

  const hunks = parsePatch(samplePatch);
  assert.strictEqual(hunks.length, 2);

  // Check hunk 1
  const h1 = hunks[0];
  assert.strictEqual(h1.lines.length, 5); // hunk header + 4 lines
  assert.strictEqual(h1.lines[0].type, 'hunk-header');
  assert.strictEqual(h1.lines[1].type, 'deletion');
  assert.strictEqual(h1.lines[1].content, 'old line');
  assert.strictEqual(h1.lines[1].leftLineNum, 1);
  assert.strictEqual(h1.lines[2].type, 'addition');
  assert.strictEqual(h1.lines[2].content, 'new line 1');
  assert.strictEqual(h1.lines[2].rightLineNum, 1);
  assert.strictEqual(h1.lines[3].type, 'addition');
  assert.strictEqual(h1.lines[3].content, 'new line 2');
  assert.strictEqual(h1.lines[3].rightLineNum, 2);
  assert.strictEqual(h1.lines[4].type, 'normal');
  assert.strictEqual(h1.lines[4].leftLineNum, 2);
  assert.strictEqual(h1.lines[4].rightLineNum, 3);

  // Check hunk 2
  const h2 = hunks[1];
  assert.strictEqual(h2.lines.length, 4); // hunk header + 3 lines
  assert.strictEqual(h2.lines[0].type, 'hunk-header');
  assert.strictEqual(h2.lines[1].type, 'normal');
  assert.strictEqual(h2.lines[1].leftLineNum, 10);
  assert.strictEqual(h2.lines[1].rightLineNum, 11);
  assert.strictEqual(h2.lines[2].type, 'deletion');
  assert.strictEqual(h2.lines[2].leftLineNum, 11);
  assert.strictEqual(h2.lines[3].type, 'addition');
  assert.strictEqual(h2.lines[3].rightLineNum, 12);

  console.log('✅ Test 2 Passed: parsePatch handles deletions, additions, and line numbers accurately.');
} catch (err) {
  console.error('❌ Test 2 Failed:', err);
  process.exit(1);
}

// ==========================================
// TEST 3: Express Backend Route Integration
// ==========================================
console.log('\n⏳ Test 3: Verifying local Express server API response...');

// Spin up a test server instance by importing our express app dynamically
import dotenv from 'dotenv';
dotenv.config();

const port = 3005; // Use a different port to prevent collisions
process.env.PORT = port;

// Import server index.js dynamically (using dynamic import since it is ES Module)
import('./index.js').then(async () => {
  // Let the server spin up for a brief moment
  await new Promise(r => setTimeout(r, 1000));

  const postData = JSON.stringify({
    prInfo: {
      owner: 'lwayne7',
      repo: 'ai-pr-reviewer',
      pullNumber: 1,
      title: 'Fix typo',
      body: 'Minor fix in code comments.',
      author: 'tester',
      additions: 1,
      deletions: 1,
      changedFiles: 1
    },
    files: [
      {
        filename: 'src/main.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        patch: '@@ -5,3 +5,3 @@\n-console.log("hello word");\n+console.log("hello world");'
      }
    ],
    modelName: 'qwen-plus'
  });

  const options = {
    hostname: 'localhost',
    port: port,
    path: '/api/review',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        assert.strictEqual(res.statusCode, 200);
        const data = JSON.parse(body);

        // Verify schema conforms to PRReviewResult
        assert.ok(data.summary, 'Response should contain summary');
        assert.ok(data.summary.overview, 'Summary should contain overview');
        assert.ok(typeof data.summary.riskScore === 'number', 'riskScore should be a number');
        assert.ok(Array.isArray(data.comments), 'comments should be an array');

        console.log('✅ Test 3 Passed: /api/review successfully processed PR diff & returned valid JSON schema review.');
        console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! The tool is complete and working normally.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Test 3 Failed (Response Validation):', err);
        console.error('Response Status:', res.statusCode);
        console.error('Response Body:', body);
        process.exit(1);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Test 3 Failed (Request Connection): ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}).catch(err => {
  console.error('❌ Failed to dynamically import server:', err);
  process.exit(1);
});
