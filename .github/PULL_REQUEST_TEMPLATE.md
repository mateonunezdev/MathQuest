# Pull Request Template

## Description

Please include a clear and descriptive title for your PR, and explain the motivation and context. Include a summary of what this PR does and which area(s) of the codebase it affects.

## Type of Change

Please delete the options that do not apply:

- [ ] Bug fix (non-destructive change which fixes bug)
- [ ] New feature (non-destructive change which adds functionality)
- [ ] Codestyle update (formatting, local variables, various)
- [ ] Refactor (restructuring existing code, no behavior change)
- [ ] Documentation update
- [ ] Test addition, coverage increase

## Checklist

Please check all applicable items:

- [ ] My code follows the code style of this project
- [ ] I have performed a self-review of my own code
- [ ] I have made corresponding changes to the documentation, if applicable
- [ ] My change requires a change to the documentation
- [ ] I have added/updated tests as appropriate
- [ ] I have run `npm run test:level` and all tests pass
- [ ] I have run `node tools/browser-qa.js` and all 12 screenshots are captured without errors
- [ ] I have checked that my changes do not break the core game loop (START → PLAYING → CHALLENGE → VICTORY)
- [ ] I have not introduced new console errors
- [ ] I have not added new dependencies
- [ ] My commit messages follow the convention: `type: descriptive message`
- [ ] This PR does not modify gameplay balance, difficulty, or logic unless fixing a critical bug

## Further Comments

Describe any further questions or concerns about this PR. What should the reviewer focus on?

---

### Issue Relation

Closes #

or

Relates to #

---

### Screenshots (if UI changed)

Optional: attach screenshots showing the before/after of your changes.