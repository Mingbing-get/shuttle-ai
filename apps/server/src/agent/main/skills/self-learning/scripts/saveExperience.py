import os
import sys
from datetime import datetime
from pathlib import Path

args = os.environ

type_val = args.get('type')
timestamp = args.get('timestamp') or datetime.now().isoformat().replace(':', '-').replace('.', '-')[:19]
summary = args.get('summary') or 'Experience'
content = args.get('content') or ''

if not type_val:
    print('ERROR: 缺少 type 参数')
    print('用法: saveExperience.py --type <success|failure|pattern> [--timestamp <timestamp>] [--summary <summary>] [--content <content>]')
    sys.exit(1)

valid_types = ['success', 'failure', 'pattern']
if type_val not in valid_types:
    print(f"ERROR: 无效的类型 '{type_val}'，必须是 {', '.join(valid_types)}")
    sys.exit(1)

script_dir = Path(__file__).parent
memory_dir = script_dir / '..' / 'memory'
experiences_dir = memory_dir / 'experiences'
target_dir = experiences_dir / f"{type_val}s"

target_dir.mkdir(parents=True, exist_ok=True)

filename = f"{timestamp}.md"
filepath = target_dir / filename

filepath.write_text(content, encoding='utf-8')

index_file = memory_dir / 'index.md'
type_title = type_val[0].upper() + type_val[1:]
index_entry = f"- [{timestamp}] [{summary}]({filename})"

if not index_file.exists() or index_file.stat().st_size == 0:
    initial_content = f"""# Experience Index

## {type_title}

{index_entry}
"""
    index_file.write_text(initial_content, encoding='utf-8')
else:
    index_content = index_file.read_text(encoding='utf-8')
    type_header = f"## {type_title}"

    if type_header not in index_content:
        index_content += f"\n\n## {type_title}\n\n{index_entry}"
    else:
        lines = index_content.split('\n')
        new_lines = []
        in_type_section = False
        entry_added = False

        for line in lines:
            if line.startswith('## '):
                if line == type_header:
                    in_type_section = True
                    new_lines.append(line)
                    if not entry_added:
                        new_lines.append(index_entry)
                        entry_added = True
                else:
                    in_type_section = False
                    new_lines.append(line)
            elif in_type_section and line.strip() == '' and not entry_added:
                new_lines.append(line)
                new_lines.append(index_entry)
                entry_added = True
            else:
                new_lines.append(line)

        index_content = '\n'.join(new_lines)

    index_file.write_text(index_content, encoding='utf-8')

print(f"SUCCESS: 经验已保存到 {filepath}")
print('SUCCESS: 索引已更新')
