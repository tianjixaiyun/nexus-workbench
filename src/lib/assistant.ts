export { askAssistant, buildAssistantSnapshot, QUICK_QUESTIONS } from './assistantFacts'
export type { AssistantAnswer, AssistantSource } from './assistantFacts'

/** 保留现有周回顾使用的简单槽位替换。 */
export function render(template: string, slots: { name: string; value: string }[]): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => slots.find(slot => slot.name === name)?.value ?? `{{${name}}}`)
}
