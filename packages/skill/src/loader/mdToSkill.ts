import { ShuttleAi } from '@shuttle-ai/type'
import matter from 'gray-matter'

import { NSkillLoader } from './type'

export default class MdToSkillTransformer
  implements NSkillLoader.ContentToSkillTransformer
{
  toSkill(
    content: string,
  ): Pick<ShuttleAi.Skill.Define, 'metadata' | 'instruction'> | undefined {
    const { data: metadata, content: instruction } = matter(content)

    if (!metadata.name || !metadata.description) {
      return
    }

    return {
      metadata: metadata as ShuttleAi.Skill.Metadata,
      instruction,
    }
  }
}
