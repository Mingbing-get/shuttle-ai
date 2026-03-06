import { ShuttleAi } from '@shuttle-ai/type'

import { NSkillLoader } from './type'

export default class JsonToSkillTransformer
  implements NSkillLoader.ContentToSkillTransformer
{
  toSkill(
    content: string,
  ): Pick<ShuttleAi.Skill.Define, 'metadata' | 'instruction'> | undefined {
    try {
      const skill = JSON.parse(content) as Pick<
        ShuttleAi.Skill.Define,
        'metadata' | 'instruction'
      >

      if (
        !skill?.metadata?.name ||
        !skill?.metadata?.description ||
        !skill?.instruction
      ) {
        return
      }

      return skill
    } catch (error) {
      return
    }
  }
}
