#!/bin/bash

# 从环境变量中获取参数
TYPE="${type}"
TIMESTAMP="${timestamp:-$(date +%Y-%m-%dT%H-%M-%S)}"
SUMMARY="${summary:-Experience}"
CONTENT="${content:-}"

# 检查必需的type参数
if [ -z "$TYPE" ]; then
    echo "ERROR: 缺少 type 参数"
    echo "用法: saveExperience.sh --type <success|failure|pattern> [--timestamp <timestamp>] [--summary <summary>] [--content <content>]"
    exit 1
fi

# 验证type的有效性
case "$TYPE" in
    success|failure|pattern)
        ;;
    *)
        echo "ERROR: 无效的类型 '$TYPE'，必须是 success, failure, pattern"
        exit 1
        ;;
esac

# 设置目录路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_DIR="$SCRIPT_DIR/../memory"
EXPERIENCES_DIR="$MEMORY_DIR/experiences"
TARGET_DIR="$EXPERIENCES_DIR/${TYPE}s"

# 创建目标目录
mkdir -p "$TARGET_DIR"

# 设置文件名和路径
filename="${TIMESTAMP}.md"
filepath="$TARGET_DIR/$filename"

# 保存内容到文件
echo "$CONTENT" > "$filepath"

# 更新索引文件
indexFile="$MEMORY_DIR/index.md"
typeTitle="$(echo "$TYPE" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
indexEntry="- [$TIMESTAMP] [$SUMMARY]($filename)"

# 检查索引文件是否存在或为空
if [ ! -f "$indexFile" ] || [ ! -s "$indexFile" ]; then
    initialContent="# Experience Index

## $typeTitle

$indexEntry
"
    echo "$initialContent" > "$indexFile"
else
    indexContent=$(cat "$indexFile")
    typeHeader="## $typeTitle"

    # 检查是否已存在类型标题
    if ! echo "$indexContent" | grep -qF "$typeHeader"; then
        # 添加新的类型部分
        indexContent="$indexContent

$typeHeader

$indexEntry"
    else
        # 在现有类型部分插入新条目
        indexContent=$(echo "$indexContent" | awk -v typeHeader="$typeHeader" -v indexEntry="$indexEntry" '
            $0 == typeHeader {
                print
                print indexEntry
                next
            }
            { print }
        ')
    fi

    # 更新索引文件
    echo "$indexContent" > "$indexFile"
fi

# 输出成功消息
echo "SUCCESS: 经验已保存到 $filepath"
echo "SUCCESS: 索引已更新"
