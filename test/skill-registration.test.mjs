#!/usr/bin/env node
// Regression test: the skill registration must carry every field that
// validateDefinition (dsh-skill, load time) enforces. Mirrors the real validator
// so a future field addition fails OUR tests instead of the agent's first call.
import { WEB_SKILL_NAME, registerWebSkill } from '/home/kbbot-service/.dsh/profiles/web/node_modules/@tsangkingyiu/dsh-web-selftest/dist/skill.js'
import { readFileSync } from 'node:fs'

const lib = readFileSync('/usr/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-skill/lib/index.js', 'utf8')
// Extract validateDefinition PLUS its dependencies (SKILL_NAME regex, validateInvocation)
const nameMatch = lib.match(/const SKILL_NAME = .*?;/)
const invMatch = lib.match(/function validateInvocation\([\s\S]*?\n\}/)
const fnMatch = lib.match(/function validateDefinition\(skill\) \{[\s\S]*?\n\}/)
if (!fnMatch) { console.log('could not extract validator'); process.exit(1) }
const validatorSource = `${nameMatch?.[0] ?? ''} ${invMatch?.[0] ?? ''} ${fnMatch[0]}`

let captured, verdict
const fakeSkillCtx = {
  skills: {
    register(skill) {
      captured = skill
      const validate = new Function(`${validatorSource}; return validateDefinition;`)()
      try {
        skill = { ...skill, invocation: skill.invocation ?? { modelInvocable: true, userInvocable: true }, provider: skill.provider ?? 'runtime' }
        validate(skill)
        verdict = 'validated-ok'
      } catch (e) {
        verdict = `VALIDATION FAILED: ${e.message}`
      }
      return () => {}
    },
  },
}
registerWebSkill({ inject(_deps, fn) { fn(fakeSkillCtx); return { dispose() {} } } })

console.log('registered skill:', WEB_SKILL_NAME)
console.log('validator verdict:', verdict)
console.log('source present:', typeof captured?.source === 'string' ? 'PASS' : 'FAIL')
console.log('content present:', typeof captured?.content === 'string' && captured.content.length > 0 ? 'PASS' : 'FAIL')
process.exit(verdict === 'validated-ok' ? 0 : 1)
