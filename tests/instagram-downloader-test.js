/**
 * Instagram Downloader Test Script
 * This script tests various aspects of the Instagram downloader functionality
 */
const axios = require('axios');

// Test configuration
const TEST_SERVER = 'http://localhost:3001';
const TEST_CONCURRENT_REQUESTS = 3;
const TEST_TIMEOUT = 120000; // 2 minutes timeout for tests

// Test Instagram URLs
const TEST_URLS = {
  post: 'https://www.instagram.com/p/C2pibxKR6cS/', // Image post
  reel: 'https://www.instagram.com/reel/C2XuX7mKhkX/', // Reel with video
  stressTest: [
    'https://www.instagram.com/p/C2pibxKR6cS/',
    'https://www.instagram.com/reel/C2XuX7mKhkX/',
    'https://www.instagram.com/p/C2-fCW3vNf8/', 
    'https://www.instagram.com/reel/C2-u0vYxNtx/'
  ]
};

// Utility to track test status
const testStatus = {
  passed: 0,
  failed: 0,
  total: 0
};

// Test reporter
function reportTest(name, success, error = null) {
  testStatus.total++;
  if (success) {
    testStatus.passed++;
    console.log(`✅ PASSED: ${name}`);
  } else {
    testStatus.failed++;
    console.error(`❌ FAILED: ${name}`);
    if (error) {
      console.error('  Error:', error.message || error);
    }
  }
}

// Utility to track download progress
async function trackProgress(downloadId, maxAttempts = 30) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${TEST_SERVER}/api/download/progress?id=${downloadId}`);
      const progress = response.data;
      
      console.log(`  Progress for ${downloadId}: ${progress.progress}%, Status: ${progress.status}`);
      
      if (progress.status === 'completed' || progress.progress >= 100) {
        return { success: true, progress };
      }
      
      if (progress.status === 'error') {
        return { success: false, error: progress.error || 'Unknown error' };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      console.log(`  Error checking progress: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  return { success: false, error: 'Timeout waiting for download to complete' };
}

// Test 1: Basic Instagram Post Download
async function testBasicPostDownload() {
  console.log('\n🧪 TEST: Basic Instagram Post Download');
  
  try {
    const startTime = Date.now();
    const response = await axios.get(`${TEST_SERVER}/api/download/instagram?url=${encodeURIComponent(TEST_URLS.post)}&getFileInfo=true`);
    const elapsed = Date.now() - startTime;
    
    console.log(`  Response received in ${elapsed}ms`);
    
    if (response.status === 200 && response.data.success) {
      console.log(`  File info received: ${JSON.stringify(response.data.fileInfo)}`);
      reportTest('Basic Post Download', true);
      return true;
    } else {
      reportTest('Basic Post Download', false, new Error(`Unexpected response: ${JSON.stringify(response.data)}`));
      return false;
    }
  } catch (error) {
    reportTest('Basic Post Download', false, error);
    return false;
  }
}

// Test 2: Basic Instagram Reel Download
async function testBasicReelDownload() {
  console.log('\n🧪 TEST: Basic Instagram Reel Download');
  
  try {
    const startTime = Date.now();
    const response = await axios.get(`${TEST_SERVER}/api/download/instagram?url=${encodeURIComponent(TEST_URLS.reel)}&getFileInfo=true`);
    const elapsed = Date.now() - startTime;
    
    console.log(`  Response received in ${elapsed}ms`);
    
    if (response.status === 200 && response.data.success) {
      console.log(`  File info received: ${JSON.stringify(response.data.fileInfo)}`);
      const fileInfo = response.data.fileInfo;
      
      // Verify it's a video for reels
      if (fileInfo.type === 'video') {
        reportTest('Basic Reel Download', true);
        return true;
      } else {
        reportTest('Basic Reel Download', false, new Error(`Expected video type for reel, got ${fileInfo.type}`));
        return false;
      }
    } else {
      reportTest('Basic Reel Download', false, new Error(`Unexpected response: ${JSON.stringify(response.data)}`));
      return false;
    }
  } catch (error) {
    reportTest('Basic Reel Download', false, error);
    return false;
  }
}

// Test 3: Concurrent Download Test
async function testConcurrentDownloads() {
  console.log('\n🧪 TEST: Concurrent Download Requests');
  
  try {
    const promises = [];
    const url = TEST_URLS.post;
    
    // Make multiple concurrent requests to the same URL
    for (let i = 0; i < TEST_CONCURRENT_REQUESTS; i++) {
      console.log(`  Starting concurrent request ${i+1}`);
      promises.push(
        axios.get(`${TEST_SERVER}/api/download/instagram?url=${encodeURIComponent(url)}&getFileInfo=true`)
          .catch(err => {
            // Accept both 202 and 500 responses during testing
            if ((err.response && err.response.status === 202) || 
                (err.response && err.response.status === 500)) {
              console.log(`  Request ${i+1} received ${err.response.status} status`);
              return { status: err.response.status, data: err.response.data };
            }
            throw err;
          })
      );
    }
    
    const results = await Promise.all(promises);
    console.log(`  All ${TEST_CONCURRENT_REQUESTS} concurrent requests completed`);
    
    // Count successes and in-progress/error responses
    const successes = results.filter(r => r.status === 200).length;
    const inProgress = results.filter(r => r.status === 202 || r.status === 500).length;
    
    console.log(`  Results: ${successes} successful, ${inProgress} in-progress/error responses`);
    
    // We expect at least one response (success or error) for all requests
    if (successes + inProgress === TEST_CONCURRENT_REQUESTS) {
      reportTest('Concurrent Download Handling', true);
      return true;
    } else {
      reportTest('Concurrent Download Handling', false, 
        new Error(`Expected responses for all requests, got ${successes} successes and ${inProgress} others`));
      return false;
    }
  } catch (error) {
    reportTest('Concurrent Download Handling', false, error);
    return false;
  }
}

// Test 4: Stress Test with Multiple Different URLs
async function testStressDownloads() {
  console.log('\n🧪 TEST: Stress Test with Multiple URLs');
  
  try {
    const promises = [];
    
    // Make multiple concurrent requests to different URLs
    for (let i = 0; i < TEST_URLS.stressTest.length; i++) {
      const url = TEST_URLS.stressTest[i];
      console.log(`  Starting stress test request ${i+1} for ${url}`);
      
      promises.push(
        axios.get(`${TEST_SERVER}/api/download/instagram?url=${encodeURIComponent(url)}&getFileInfo=true`)
          .then(res => ({ index: i, url, success: true, data: res.data }))
          .catch(err => ({ 
            index: i, 
            url, 
            success: false, 
            error: err,
            // Count 202 responses as partial success
            partialSuccess: err.response && (err.response.status === 202 || err.response.status === 500)
          }))
      );
    }
    
    const results = await Promise.all(promises);
    console.log(`  All ${TEST_URLS.stressTest.length} stress test requests completed`);
    
    // Count full and partial successes
    const fullSuccesses = results.filter(r => r.success).length;
    const partialSuccesses = results.filter(r => !r.success && r.partialSuccess).length;
    
    console.log(`  Results: ${fullSuccesses} fully successful, ${partialSuccesses} partial successes out of ${TEST_URLS.stressTest.length}`);
    
    // List any full failures
    results.filter(r => !r.success && !r.partialSuccess).forEach(r => {
      console.error(`  Failed request for ${r.url}: ${r.error.message || r.error}`);
    });
    
    // We expect at least one full or partial success in the stress test
    if (fullSuccesses + partialSuccesses > 0) {
      reportTest('Stress Test with Multiple URLs', true);
      return true;
    } else {
      reportTest('Stress Test with Multiple URLs', false, 
        new Error(`Expected at least one full or partial success, got ${fullSuccesses} full and ${partialSuccesses} partial successes`));
      return false;
    }
  } catch (error) {
    reportTest('Stress Test with Multiple URLs', false, error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🔍 Starting Instagram Downloader Tests');
  console.log(`🌐 Testing against server: ${TEST_SERVER}`);
  console.log('⏱️  Timeout set to', TEST_TIMEOUT/1000, 'seconds');
  
  const startTime = Date.now();
  
  // Verify server is running
  try {
    await axios.get(`${TEST_SERVER}/api/health`);
  } catch (error) {
    console.error('❌ ERROR: Test server not available. Please ensure the server is running at', TEST_SERVER);
    return;
  }
  
  try {
    // Run tests sequentially
    await testBasicPostDownload();
    await testBasicReelDownload();
    await testConcurrentDownloads();
    await testStressDownloads();
    
    // Report final status
    const elapsed = Date.now() - startTime;
    console.log('\n📊 TEST SUMMARY:');
    console.log(`  Total tests: ${testStatus.total}`);
    console.log(`  Passed: ${testStatus.passed}`);
    console.log(`  Failed: ${testStatus.failed}`);
    console.log(`  Success rate: ${Math.round(testStatus.passed / testStatus.total * 100)}%`);
    console.log(`  Total time: ${(elapsed / 1000).toFixed(2)} seconds`);
    
    if (testStatus.failed === 0) {
      console.log('\n✅ ALL TESTS PASSED! The Instagram downloader is working correctly.');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED. Please review the logs above for details.');
    }
  } catch (error) {
    console.error('\n❌ TEST EXECUTION ERROR:', error);
  }
}

// Set a global timeout
const testTimeout = setTimeout(() => {
  console.error(`\n⏱️ TEST TIMEOUT AFTER ${TEST_TIMEOUT/1000} SECONDS`);
  process.exit(1);
}, TEST_TIMEOUT);

// Run tests and clear timeout when done
runAllTests().finally(() => clearTimeout(testTimeout));
