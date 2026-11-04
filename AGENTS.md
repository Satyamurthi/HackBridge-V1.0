# HackBridge Agent Rules & Standing Protocol

## Standing Protocol Rule
After every change, run:
```bash
npm run test:loop
```

If `test-results/FAILURES.md` exists:
1. Read `test-results/FAILURES.md`.
2. Fix the application code to address the root causes.
3. Run `npm run test:loop` again.
4. Repeat until `test-results/STATUS.md` says `ALL TESTS PASSING` or `test-results/NEEDS-HUMAN.md` appears.
5. **Never edit tests just to make them pass**, unless the test itself is proven wrong, and document the reasoning in `TASK.md`.
