---
name: 'plan-doc-skill'
description: '维护文件夹级别的文档，在每个目录中创建和更新 README.md 文件。在创建新文件夹、修改代码结构或需要同步文件夹文档与代码变更时调用。'
---

# 文件夹文档维护 Skill

## 目的

此 skill 确保项目中的每个文件夹都有一个对应的 `README.md` 文件，用于记录其用途和内容。**每次修改代码时，必须同步更新相关文件夹的 README.md 文档**，确保文档与实际代码保持一致。

## 何时调用（必须严格执行）

**⚠️ 重要：以下情况必须调用此 skill，无一例外：**

- **创建新文件夹/目录时** - 必须立即创建对应的 README.md
- **添加新文件时** - 必须在所在文件夹的 README.md 中添加该文件说明
- **删除文件时** - 必须从所在文件夹的 README.md 中移除该文件说明
- **重命名/移动文件时** - 必须更新 README.md 中的文件引用
- **修改文件用途时** - 必须更新 README.md 中该文件的描述
- **文件夹用途变化时** - 必须更新该文件夹 README.md 的用途说明
- **重构影响文件夹结构时** - 必须同步更新所有受影响文件夹的 README.md

## 执行流程（强制）

每次进行代码变更时，按以下顺序执行：

1. **修改代码前** - 先查看目标文件夹是否已有 README.md，了解当前结构
2. **修改代码后** - **必须立即**更新相关文件夹的 README.md
3. **检查父文件夹** - 如果新增/删除了子文件夹，必须同步更新父文件夹的 README.md
4. **最终确认** - 确保所有变更的文件夹文档都已同步更新

## 指南

### 创建文件夹文档

为每个文件夹创建一个 `README.md` 文件，包含以下内容：

1. **文件夹用途**：简要描述此文件夹包含什么内容及其在项目中的角色
2. **文件列表**：文件夹中的关键文件及其详细功能说明
3. **子文件夹**：子目录列表及其用途
4. **使用/集成**：此文件夹如何与项目其他部分集成（如适用）

### 文件描述规范（必须遵守）

每个文件的描述必须包含以下内容，越详细越好：

#### 基础信息（必填）

- **文件用途**：该文件的整体功能和职责
- **导出内容**：列出该文件导出的所有函数、组件、类型、常量等

#### 函数/组件详情（如有导出）

对于每个导出的函数或组件，必须详细说明：

1. **名称**：函数或组件的名称
2. **功能描述**：详细说明该函数/组件的作用
3. **入参**：
   - 参数名
   - 参数类型
   - 是否必填
   - 默认值（如有）
   - 参数说明
4. **出参/返回值**：
   - 返回类型
   - 返回值说明
5. **使用示例**：提供至少一个实际的使用示例代码

#### 类型定义（如有导出）

对于导出的类型或接口，必须说明：

- 类型名称
- 各属性的含义和类型
- 使用场景

### 更新文档（必须执行）

**任何代码变更都必须同步更新文档：**

| 代码操作     | 必须执行的文档操作                                              |
| ------------ | --------------------------------------------------------------- |
| 新建文件     | 在 README.md 文件列表中添加该文件的详细说明                     |
| 删除文件     | 从 README.md 文件列表中移除该文件                               |
| 重命名文件   | 更新 README.md 中的文件名和描述（如有变化）                     |
| 修改文件功能 | 更新 README.md 中该文件的用途描述、函数签名、参数说明等         |
| 新增函数     | 在文件描述中添加该函数的完整说明（入参、出参、示例）            |
| 修改函数签名 | 更新该函数的入参、出参说明                                      |
| 新建子文件夹 | 在 README.md 子文件夹列表中添加说明，并创建子文件夹的 README.md |
| 删除子文件夹 | 从 README.md 子文件夹列表中移除，并删除子文件夹的 README.md     |

### 文档模板

````markdown
# [文件夹名称]

## 用途

[文件夹用途及其在项目中的角色的简要描述]

## 内容

### 文件

#### `[文件名.扩展名]`

**用途**：[该文件的整体功能描述]

**导出内容**：

- `函数名/组件名` - [简要说明]
- `类型名` - [简要说明]

**详细说明**：

##### `函数名/组件名`

**功能**：[详细描述该函数或组件的作用]

**入参**：

| 参数名 | 类型   | 必填 | 默认值 | 说明     |
| ------ | ------ | ---- | ------ | -------- |
| param1 | string | 是   | -      | 参数说明 |
| param2 | number | 否   | 0      | 参数说明 |

**返回值**：`返回类型` - [返回值说明]

**使用示例**：

```typescript
import { 函数名 } from './文件名'

const result = 函数名({
  param1: 'value',
  param2: 100,
})
```
````

##### `类型名`

**类型定义**：

```typescript
interface 类型名 {
  property1: string
  property2?: number
}
```

**属性说明**：

| 属性名    | 类型   | 必填 | 说明     |
| --------- | ------ | ---- | -------- |
| property1 | string | 是   | 属性说明 |
| property2 | number | 否   | 属性说明 |

---

#### `[其他文件.扩展名]`

[同上格式...]

### 子文件夹

- `[子文件夹/]` - [子文件夹内容的描述]

## 集成

[可选：此文件夹如何与项目其他部分集成]

## 使用示例

[可选：该文件夹整体的使用示例]

````

## 示例

### 示例 1：为新组件文件夹创建详细文档

当创建 `/src/components/Button/` 时：

**必须**创建 `/src/components/Button/README.md`：

```markdown
# Button

## 用途

包含 Button 组件及其相关文件（样式、测试、类型）。提供可复用的按钮组件，支持多种变体和尺寸。

## 内容

### 文件

#### `Button.tsx`

**用途**：Button 组件的主实现文件，定义按钮的核心逻辑和渲染。

**导出内容**：
- `Button` - 主按钮组件
- `ButtonProps` - 按钮属性类型（从 types.ts 重新导出）

**详细说明**：

##### `Button`

**功能**：渲染一个可定制的按钮组件，支持多种变体、尺寸和状态。

**入参**：

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| ------ | ---- | ---- | ------ | ---- |
| variant | 'primary' \| 'secondary' \| 'outline' | 否 | 'primary' | 按钮变体样式 |
| size | 'sm' \| 'md' \| 'lg' | 否 | 'md' | 按钮尺寸 |
| disabled | boolean | 否 | false | 是否禁用按钮 |
| loading | boolean | 否 | false | 是否显示加载状态 |
| onClick | () => void | 否 | - | 点击回调函数 |
| children | ReactNode | 是 | - | 按钮内容 |
| className | string | 否 | '' | 自定义 CSS 类名 |

**返回值**：`JSX.Element` - 渲染的按钮元素

**使用示例**：

```tsx
import { Button } from './Button';

function Example() {
  const handleClick = () => {
    console.log('Button clicked!');
  };

  return (
    <div>
      <Button variant="primary" size="md" onClick={handleClick}>
        主要按钮
      </Button>

      <Button variant="outline" disabled>
        禁用按钮
      </Button>

      <Button loading>
        加载中...
      </Button>
    </div>
  );
}
````

---

#### `Button.styles.ts`

**用途**：定义 Button 组件的样式组件和样式工具函数。

**导出内容**：

- `StyledButton` - 样式化的按钮容器组件
- `getButtonColors` - 获取按钮颜色的工具函数

**详细说明**：

##### `StyledButton`

**功能**：基于 styled-components 的样式化按钮，根据 props 动态应用样式。

**入参**：继承 ButtonProps

**返回值**：`styled.button` - 样式化的 button 元素

##### `getButtonColors(variant: ButtonVariant): ButtonColors`

**功能**：根据按钮变体返回对应的颜色配置。

**入参**：

| 参数名  | 类型          | 必填 | 默认值 | 说明         |
| ------- | ------------- | ---- | ------ | ------------ |
| variant | ButtonVariant | 是   | -      | 按钮变体类型 |

**返回值**：`ButtonColors` - 包含 background、color、border 等颜色属性的对象

**使用示例**：

```typescript
import { getButtonColors } from './Button.styles'

const colors = getButtonColors('primary')
// 返回: { background: '#1890ff', color: '#fff', border: 'none' }
```

---

#### `types.ts`

**用途**：定义 Button 组件相关的 TypeScript 类型。

**导出内容**：

- `ButtonProps` - 按钮组件属性接口
- `ButtonVariant` - 按钮变体类型
- `ButtonSize` - 按钮尺寸类型

**详细说明**：

##### `ButtonProps`

**类型定义**：

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}
```

**属性说明**：

| 属性名    | 类型          | 必填 | 说明                                       |
| --------- | ------------- | ---- | ------------------------------------------ |
| variant   | ButtonVariant | 否   | 按钮变体，可选 primary、secondary、outline |
| size      | ButtonSize    | 否   | 按钮尺寸，可选 sm、md、lg                  |
| disabled  | boolean       | 否   | 是否禁用                                   |
| loading   | boolean       | 否   | 是否显示加载状态                           |
| onClick   | () => void    | 否   | 点击事件处理函数                           |
| children  | ReactNode     | 是   | 按钮内容                                   |
| className | string        | 否   | 自定义 CSS 类名                            |

---

#### `index.ts`

**用途**：模块的统一导出入口，简化导入路径。

**导出内容**：

- `Button` - 从 Button.tsx 导出
- `ButtonProps` - 从 types.ts 导出
- `ButtonVariant` - 从 types.ts 导出
- `ButtonSize` - 从 types.ts 导出

**使用示例**：

```typescript
import { Button, ButtonProps } from './Button'
```

---

#### `Button.test.tsx`

**用途**：Button 组件的单元测试文件。

**测试覆盖**：

- 渲染测试：验证按钮正常渲染
- 变体测试：验证不同 variant 的样式
- 尺寸测试：验证不同 size 的样式
- 交互测试：验证 onClick 回调
- 状态测试：验证 disabled 和 loading 状态

---

### 子文件夹

- `icons/` - Button 专用图标组件，包含 LoadingIcon 等图标

## 集成

Button 组件通过 `src/components/index.ts` 统一导出，可在项目中直接使用：

```typescript
import { Button } from '@/components'
```

## 使用示例

```tsx
import { Button } from '@/components'

function MyComponent() {
  return (
    <div>
      <Button variant="primary" onClick={() => alert('点击!')}>
        确认
      </Button>
      <Button variant="outline" size="sm">
        取消
      </Button>
    </div>
  )
}
```

````

**必须**更新父文件夹 `/src/components/README.md` 以包含：

```markdown
- `Button/` - 可复用按钮组件，支持多种变体和尺寸
````

### 示例 2：代码变更后必须更新文档

当向 `/src/components/Button/` 添加新文件 `Button.hooks.ts` 时：

**必须**更新 `/src/components/Button/README.md`，在文件列表中添加：

````markdown
#### `Button.hooks.ts`

**用途**：提供 Button 组件相关的自定义 React Hooks。

**导出内容**：

- `useButtonState` - 按钮状态管理 Hook
- `useButtonAnimation` - 按钮动画效果 Hook

**详细说明**：

##### `useButtonState`

**功能**：管理按钮的内部状态（如 loading、disabled 等）。

**入参**：

| 参数名          | 类型    | 必填 | 默认值 | 说明         |
| --------------- | ------- | ---- | ------ | ------------ |
| initialLoading  | boolean | 否   | false  | 初始加载状态 |
| initialDisabled | boolean | 否   | false  | 初始禁用状态 |

**返回值**：`ButtonStateReturn` - 包含状态和状态更新函数的对象

```typescript
interface ButtonStateReturn {
  loading: boolean
  disabled: boolean
  setLoading: (value: boolean) => void
  setDisabled: (value: boolean) => void
  toggleLoading: () => void
}
```
````

**使用示例**：

```typescript
import { useButtonState } from './Button.hooks';

function MyButton() {
  const { loading, setLoading, toggleLoading } = useButtonState();

  const handleClick = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  return (
    <Button loading={loading} onClick={handleClick}>
      提交
    </Button>
  );
}
```

##### `useButtonAnimation`

**功能**：为按钮添加点击波纹动画效果。

**入参**：

| 参数名   | 类型   | 必填 | 默认值 | 说明                 |
| -------- | ------ | ---- | ------ | -------------------- |
| duration | number | 否   | 300    | 动画持续时间（毫秒） |

**返回值**：`ButtonAnimationReturn` - 包含动画相关属性和方法的对象

```typescript
interface ButtonAnimationReturn {
  rippleStyle: CSSProperties
  createRipple: (event: React.MouseEvent) => void
}
```

**使用示例**：

```typescript
import { useButtonAnimation } from './Button.hooks';

function AnimatedButton() {
  const { rippleStyle, createRipple } = useButtonAnimation(500);

  return (
    <button onClick={createRipple} style={rippleStyle}>
      点击我
    </button>
  );
}
```

```

## 最佳实践

1. **文档与代码同步是强制的** - 任何代码变更都必须伴随文档更新
2. **先文档后提交** - 未更新文档的代码变更视为不完整
3. **详细描述功能** - 每个文件、函数、组件都要有完整的功能说明
4. **入参出参必须明确** - 所有参数和返回值都要列出类型、是否必填、默认值和说明
5. **提供使用示例** - 每个导出的函数/组件至少提供一个实际使用示例
6. **保持简洁但完整** - 文档应简明但包含所有必要信息
7. **使用相对路径** - 引用其他文件/文件夹时，使用相对路径
8. **关注"为什么"** - 解释用途，而不仅仅是列出文件
9. **层级关系重要** - 更新文件夹时，检查父文件夹是否也需要更新
```
