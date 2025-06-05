#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

class FastTestRunner {
  constructor() {
    this.testSuites = [
      { name: 'Core Utils', path: 'tests/utils', priority: 1 },
      { name: 'Legitimate Scanner', path: 'tests/scanners/legitimateArbitrageScanner.test.ts', priority: 1 },
      { name: 'Error Handling', path: 'tests/errorHandling', priority: 2 },
      { name: 'Performance', path: 'tests/performance', priority: 2 },
      { name: 'Market Simulation', path: 'tests/marketSimulation', priority: 2 },
      { name: 'Security Validation', path: 'tests/advanced/securityValidation.test.ts', priority: 3 },
      { name: 'Integration Complexity', path: 'tests/advanced/integrationComplexity.test.ts', priority: 3 }
    ];
    
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.startTime = Date.now();
  }

  async runSuite(suite) {
    return new Promise((resolve) => {
      console.log(`🧪 Running: ${suite.name}...`);
      const startTime = Date.now();
      
      const jest = spawn('npx', [
        'jest',
        suite.path,
        '--verbose=false',
        '--silent=false',
        '--maxWorkers=1',
        '--forceExit',
        '--detectOpenHandles',
        '--json'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let output = '';
      let jsonOutput = '';
      
      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // Try to extract JSON from the output
        if (text.includes('{') && text.includes('}')) {
          jsonOutput += text;
        }
        
        // Show real-time progress indicators
        if (text.includes('✓') || text.includes('PASS')) {
          process.stdout.write('✅');
        } else if (text.includes('✗') || text.includes('FAIL')) {
          process.stdout.write('❌');
        } else if (text.includes('RUNS')) {
          process.stdout.write('🏃');
        }
      });

      jest.stderr.on('data', (data) => {
        const errorText = data.toString();
        if (!errorText.includes('console.error') && !errorText.includes('console.log')) {
          console.error(`\n⚠️  ${suite.name}: ${errorText.substring(0, 100)}...`);
        }
      });

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        let result = {
          name: suite.name,
          passed: false,
          tests: 0,
          duration,
          code
        };

        // Parse Jest JSON output if available
        try {
          const lines = jsonOutput.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{') && line.includes('numPassedTests')) {
              const json = JSON.parse(line.trim());
              result.tests = json.numPassedTests + json.numFailedTests;
              result.passed = json.numFailedTests === 0;
              break;
            }
          }
        } catch (e) {
          // Fallback: parse from regular output
          result.passed = code === 0;
          const testMatches = output.match(/(\d+) passed/);
          if (testMatches) {
            result.tests = parseInt(testMatches[1]);
          }
        }

        if (result.passed) {
          console.log(`\n✅ ${suite.name}: ${result.tests} tests passed (${duration}ms)`);
          this.results.passed += result.tests;
        } else {
          console.log(`\n❌ ${suite.name}: Failed (${duration}ms)`);
          this.results.failed += result.tests;
        }
        
        this.results.total += result.tests;
        this.results.details.push(result);
        resolve(result);
      });
    });
  }

  async runPriority(priority) {
    const suitesInPriority = this.testSuites.filter(s => s.priority === priority);
    console.log(`\n🚀 Running Priority ${priority} Tests (${suitesInPriority.length} suites):`);
    
    const promises = suitesInPriority.map(suite => this.runSuite(suite));
    return Promise.all(promises);
  }

  async runAll() {
    console.log('🎯 Fast Test Runner Starting...\n');
    console.log('Progress indicators: ✅=Pass, ❌=Fail, 🏃=Running\n');
    
    // Run tests by priority to get quick feedback
    for (let priority = 1; priority <= 3; priority++) {
      await this.runPriority(priority);
      this.showIntermediateResults();
    }
    
    this.showFinalResults();
  }

  showIntermediateResults() {
    const totalTime = Date.now() - this.startTime;
    console.log(`\n📊 Progress: ${this.results.passed}✅ ${this.results.failed}❌ (${totalTime}ms)\n`);
  }

  showFinalResults() {
    const totalTime = Date.now() - this.startTime;
    const success = this.results.failed === 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`📋 Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️  Total Time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    console.log('\n📝 Suite Details:');
    this.results.details.forEach(suite => {
      const status = suite.passed ? '✅' : '❌';
      const time = `${suite.duration}ms`;
      console.log(`  ${status} ${suite.name.padEnd(25)} ${suite.tests.toString().padStart(3)} tests (${time})`);
    });
    
    console.log('\n' + (success ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
    console.log('='.repeat(60));
    
    process.exit(success ? 0 : 1);
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new FastTestRunner();
  runner.runAll().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = FastTestRunner; 